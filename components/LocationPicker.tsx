import { Check, LocateFixed, MapPin, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, TextInput, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { radius, spacing } from '../constants/themes';
import type { Place } from '../interfaces/user.d';
import { useAuth } from '../lib/auth-context';
import { reverseGeocode, searchPlaces, splitAddress } from '../lib/geocode';
import { leafletDocument } from '../lib/leafletMap';
import { getCurrentLocation } from '../lib/location';
import { useTheme } from '../lib/theme-context';
import { ThemedText } from './ui/ThemedText';
import { PressableScale } from './ui/PressableScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from './ui/Button';

interface LocationPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (place: Place) => void;
    /** Pin shown when the picker opens (e.g. the job's saved location). */
    initial?: Place | null;
    title?: string;
}

// Only where the camera starts when there's nothing better — never a pre-selected pin.
const FALLBACK_CENTER = { latitude: 43.6532, longitude: -79.3832, zoom: 11 }; // Toronto

const MIN_QUERY_LENGTH = 3;
const TYPING_DEBOUNCE_MS = 300; // search once typing pauses, not on every key

const coordsLabel = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

// The page owns the marker; RN tells it where to put the pin (window.setPin)
// and it reports taps/drags back through postMessage.
const buildMapHTML = (center: { latitude: number; longitude: number; zoom: number }, pin: Place | null, pinColor: string) =>
    leafletDocument({
        css: `.pin { width: 22px; height: 22px; border-radius: 50%; background: ${pinColor}; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); }`,
        script: `
    map.setView([${center.latitude}, ${center.longitude}], ${center.zoom});

    const icon = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
    let marker = null;

    function report(latlng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: latlng.lat, lng: latlng.lng }));
    }

    window.setPin = function (lat, lng, zoom) {
      if (!marker) {
        marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
        marker.on('dragend', function () { report(marker.getLatLng()); });
      } else {
        marker.setLatLng([lat, lng]);
      }
      map.setView([lat, lng], zoom || Math.max(map.getZoom(), 16));
    };

    map.on('click', function (e) {
      window.setPin(e.latlng.lat, e.latlng.lng, map.getZoom());
      report(e.latlng);
    });

    ${pin ? `window.setPin(${pin.latitude}, ${pin.longitude}, 16);` : ''}`,
    });

export function LocationPicker({ visible, onClose, onConfirm, initial, title = 'Choose a location' }: LocationPickerProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const webviewRef = useRef<WebView>(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Place[]>([]);
    const [selected, setSelected] = useState<Place | null>(null);
    const [busy, setBusy] = useState<'search' | 'address' | 'locate' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [mapKey, setMapKey] = useState(0);
    const latestSearch = useRef(0); // only the newest search may show its results
    const searchedQuery = useRef(''); // what the results on screen are for

    // Fresh state every time the picker opens
    useEffect(() => {
        if (!visible) return;
        // The modal stays mounted between openings, so each opening starts clean here
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuery('');
        setResults([]);
        setSelected(initial ?? null);
        setError(null);
        setBusy(null);
        setMapKey((k) => k + 1);
        searchedQuery.current = '';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Built once per opening — rebuilding on every tap would reload the whole map.
    const html = useMemo(() => {
        const home = user?.homeLocation;
        const center = initial
            ? { latitude: initial.latitude, longitude: initial.longitude, zoom: 16 }
            : home
                ? { latitude: home.latitude, longitude: home.longitude, zoom: 13 }
                : FALLBACK_CENTER;
        return buildMapHTML(center, initial ?? null, colors.primary);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapKey]);

    const placePin = (latitude: number, longitude: number) => {
        webviewRef.current?.injectJavaScript(`window.setPin(${latitude}, ${longitude}); true;`);
    };

    // Pin first, address after — the address lookup can fail without losing the spot.
    const selectPoint = async (latitude: number, longitude: number) => {
        const isStill = (current: Place | null) => current?.latitude === latitude && current?.longitude === longitude;
        setError(null);
        setSelected({ address: '', latitude, longitude });
        setBusy('address');
        try {
            const place = await reverseGeocode(latitude, longitude);
            setSelected((current) => (isStill(current) ? place : current));
        } catch {
            setSelected((current) => (isStill(current) ? { address: coordsLabel(latitude, longitude), latitude, longitude } : current));
        } finally {
            setBusy(null);
        }
    };

    // Results are ranked around the pin, else the user's home, else the default city
    const searchNear = () => selected ?? initial ?? user?.homeLocation ?? FALLBACK_CENTER;

    const runSearch = async (text: string) => {
        const requestId = ++latestSearch.current;
        searchedQuery.current = text;
        setError(null);
        setBusy('search');
        try {
            const places = await searchPlaces(text, searchNear());
            if (requestId !== latestSearch.current) return;
            setResults(places);
            if (places.length === 0) setError(`No places found for "${text}". Try adding the city.`);
        } catch (err: any) {
            if (requestId !== latestSearch.current) return;
            setResults([]);
            setError(err?.response?.data?.message || "Couldn't search right now. Check your connection and try again.");
        } finally {
            if (requestId === latestSearch.current) setBusy(null);
        }
    };

    // Search as you type: once typing pauses for a moment
    useEffect(() => {
        const text = query.trim();
        if (text.length < MIN_QUERY_LENGTH) {
            latestSearch.current++; // drop any search still in flight
            // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale results for a too-short query
            setResults([]);
            setBusy((b) => (b === 'search' ? null : b));
            return;
        }
        if (text === searchedQuery.current) return; // e.g. results were just picked
        const timer = setTimeout(() => runSearch(text), TYPING_DEBOUNCE_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the text changes
    }, [query]);

    // The keyboard's Search key: skip the wait
    const handleSubmit = () => {
        const text = query.trim();
        if (text.length < MIN_QUERY_LENGTH) {
            setError(`Type at least ${MIN_QUERY_LENGTH} characters to search.`);
            return;
        }
        Keyboard.dismiss();
        if (text !== searchedQuery.current || results.length === 0) runSearch(text);
    };

    const handlePickResult = (place: Place) => {
        Keyboard.dismiss();
        latestSearch.current++;
        searchedQuery.current = place.address;
        setQuery(place.address);
        setResults([]);
        setError(null);
        setSelected(place);
        placePin(place.latitude, place.longitude);
    };

    const handleUseMyLocation = async () => {
        setError(null);
        setBusy('locate');
        const location = await getCurrentLocation();
        setBusy(null);
        if (location.status === 'denied') {
            setError('Location permission is off. You can still search or tap the map.');
            return;
        }
        if (location.status === 'unavailable') {
            setError("Couldn't find your location. Make sure location services are on.");
            return;
        }
        placePin(location.lat, location.lng);
        selectPoint(location.lat, location.lng);
    };

    const handleMessage = (event: WebViewMessageEvent) => {
        try {
            const { lat, lng } = JSON.parse(event.nativeEvent.data);
            setResults([]);
            selectPoint(lat, lng);
        } catch {
            // Not one of our messages
        }
    };

    const canConfirm = !!selected?.address && busy !== 'address';

    const handleConfirm = () => {
        if (!selected || !canConfirm) return;
        onConfirm(selected);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
                    <ThemedText size="lg" weight="bold">{title}</ThemedText>
                    <IconButton icon={X} accessibilityLabel="Close" onPress={onClose} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm, gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 12 }}>
                        <Search color={colors.textMuted} size={18} />
                        <TextInput
                            placeholder="Search address or place"
                            placeholderTextColor={colors.textMuted}
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={handleSubmit}
                            autoFocus={!initial}
                            clearButtonMode="while-editing"
                            returnKeyType="search"
                            autoCorrect={false}
                            style={{ flex: 1, color: colors.textPrimary, height: 44, paddingHorizontal: 8 }}
                        />
                        {busy === 'search' ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : query.length > 0 && Platform.OS !== 'ios' ? (
                            <PressableScale onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search" pressedScale={1} pressedStyle={{ opacity: 0.5 }}>
                                <X color={colors.textMuted} size={16} />
                            </PressableScale>
                        ) : null}
                    </View>
                    {busy === 'locate' ? (
                        <ActivityIndicator color={colors.primary} style={{ width: 44 }} />
                    ) : (
                        <IconButton icon={LocateFixed} color={colors.primary} size={44} accessibilityLabel="Use my current location" onPress={handleUseMyLocation} style={{ borderRadius: radius.md }} />
                    )}
                </View>

                <View style={{ flex: 1 }}>
                    <WebView
                        key={mapKey}
                        ref={webviewRef}
                        originWhitelist={['*']}
                        source={{ html }}
                        onMessage={handleMessage}
                        style={{ flex: 1 }}
                    />

                    {results.length > 0 && (
                        <View style={{ position: 'absolute', top: 4, left: spacing.lg, right: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
                            {results.map((place, i) => {
                                const { title: placeTitle, detail } = splitAddress(place.address);
                                return (
                                    <PressableScale
                                        key={`${place.latitude},${place.longitude},${i}`}
                                        onPress={() => handlePickResult(place)}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight, backgroundColor: 'transparent' }} pressedStyle={{ backgroundColor: colors.surfaceLight }} pressedScale={1}
                                    >
                                        <MapPin color={colors.textMuted} size={16} />
                                        <View style={{ flex: 1 }}>
                                            <ThemedText size="sm" weight="medium" numberOfLines={1}>{placeTitle}</ThemedText>
                                            {!!detail && (
                                                <ThemedText variant="secondary" size="xs" numberOfLines={1}>{detail}</ThemedText>
                                            )}
                                        </View>
                                    </PressableScale>
                                );
                            })}
                        </View>
                    )}
                </View>

                <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface }}>
                    {error ? (
                        <ThemedText color={colors.danger} size="sm" style={{ marginBottom: spacing.md }}>{error}</ThemedText>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, minHeight: 20 }}>
                            {busy === 'address' && <ActivityIndicator size="small" color={colors.textMuted} />}
                            <ThemedText variant={selected?.address ? 'primary' : 'secondary'} size="sm" numberOfLines={2} style={{ flex: 1 }}>
                                {busy === 'address'
                                    ? 'Finding the address…'
                                    : selected?.address || 'Search, tap the map, or use your location to drop a pin.'}
                            </ThemedText>
                        </View>
                    )}
                    <Button label="Use This Location" icon={Check} onPress={handleConfirm} disabled={!canConfirm} />
                </View>
            </View>
        </Modal>
    );
}
