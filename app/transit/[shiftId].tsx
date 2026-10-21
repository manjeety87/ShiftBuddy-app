import { router, useLocalSearchParams } from 'expo-router';
import { Clock, House, LocateFixed, Navigation, RotateCw, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { TransitItineraryCard } from '../../components/TransitItineraryCard';
import { Button, IconButton, TextButton } from '../../components/ui/Button';
import { PressableScale } from '../../components/ui/PressableScale';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ThemedText } from '../../components/ui/ThemedText';
import { radius, spacing } from '../../constants/themes';
import type { Shift } from '../../interfaces/shift.d';
import { useAuth } from '../../lib/auth-context';
import { describeArrivalBuffer, getShiftRoutes, type ShiftRoutes } from '../../lib/commute';
import { formatTime } from '../../lib/dateUtils';
import { splitAddress } from '../../lib/geocode';
import { leafletDocument } from '../../lib/leafletMap';
import { getCurrentLocation } from '../../lib/location';
import { openDrivingDirections, openTransitDirections } from '../../lib/mapLinks';
import { getShiftById } from '../../lib/shifts';
import { useTheme } from '../../lib/theme-context';
import { isWalk } from '../../lib/transit';
import { showAlert } from '../../lib/dialog';
import { jobName } from '../../lib/jobLabels';

type Tab = 'transit' | 'driving';
type Origin = 'home' | 'here';
type Coords = { lat: number; lng: number };
type MapSegment = { points: [number, number][]; color: string; dashed?: boolean };
const MODE_OPTIONS: { value: Tab; label: string }[] = [
    { value: 'transit', label: 'Transit' },
    { value: 'driving', label: 'Driving' },
];

type RoutesState =
    | { status: 'loading' }
    | { status: 'error'; message: string; isLocationProblem: boolean }
    | { status: 'ready'; routes: ShiftRoutes };

// Route map: each leg drawn in its own colour (walking dashed), fitted to the trip.
const buildRouteMapHTML = (origin: Coords, dest: Coords, segments: MapSegment[], accent: string) =>
    leafletDocument({
        showAttribution: false,
        script: `
    const segments = ${JSON.stringify(segments)};
    const bounds = L.latLngBounds([[${origin.lat}, ${origin.lng}], [${dest.lat}, ${dest.lng}]]);
    segments.forEach(function (s) {
      if (s.points.length < 2) return;
      const line = L.polyline(s.points, { color: s.color, weight: s.dashed ? 4 : 6, opacity: 0.9, dashArray: s.dashed ? '2 8' : null, lineCap: 'round' }).addTo(map);
      bounds.extend(line.getBounds());
    });

    const dot = (lat, lng, fill) => L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: fill, fillOpacity: 1 }).addTo(map);
    dot(${origin.lat}, ${origin.lng}, '#64748B');
    dot(${dest.lat}, ${dest.lng}, '${accent}');

    frameMap(function () { map.fitBounds(bounds, { padding: [28, 28], animate: false }); });`,
    });

export default function TransitPlanningScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
    const home = user?.homeLocation ?? null;

    const [shift, setShift] = useState<Shift | null>(null);
    const [isLoadingShift, setIsLoadingShift] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>(user?.commuteMode === 'DRIVING' ? 'driving' : 'transit');
    const [origin, setOrigin] = useState<Origin>(home ? 'home' : 'here');
    const [routesState, setRoutesState] = useState<RoutesState>({ status: 'loading' });
    const [selectedTrip, setSelectedTrip] = useState(0);
    const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        getShiftById(shiftId)
            .then(setShift)
            .catch(() => {
                showAlert('Error', 'Could not load shift details.');
                router.back();
            })
            .finally(() => setIsLoadingShift(false));
    }, [shiftId]);

    const hasJobLocation = shift?.job.latitude != null && shift.job.longitude != null;
    const fromHome = origin === 'home' && !!home;

    // The backend plans everything (arrival buffer, leave-by, transit + driving, the way home),
    // from home or from wherever the phone is right now.
    useEffect(() => {
        if (!shift || !hasJobLocation) return;
        let cancelled = false;

        const load = async () => {
            setRoutesState({ status: 'loading' });
            setSelectedTrip(0);
            setExpandedTrip(null);

            let from: Coords | undefined;
            if (!fromHome) {
                const location = await getCurrentLocation();
                if (location.status !== 'ok') {
                    if (!cancelled) {
                        setRoutesState({
                            status: 'error',
                            isLocationProblem: true,
                            message: location.status === 'denied'
                                ? 'Location permission is off, so we can’t plan from where you are.'
                                : 'Couldn’t find your current location. Make sure location services are on.',
                        });
                    }
                    return;
                }
                from = { lat: location.lat, lng: location.lng };
            }

            try {
                const routes = await getShiftRoutes(shift.id, from);
                if (!cancelled) setRoutesState({ status: 'ready', routes });
            } catch (err: any) {
                if (!cancelled) {
                    setRoutesState({
                        status: 'error',
                        isLocationProblem: false,
                        message: err?.response?.data?.message || 'Couldn’t plan your route. Check your connection and try again.',
                    });
                }
            }
        };
        load();

        return () => { cancelled = true; };
    }, [shift, hasJobLocation, fromHome, attempt, user?.arrivalBufferMinutes]);

    const routes = routesState.status === 'ready' ? routesState.routes : null;
    const toWork = routes?.transit.status === 'ok' ? routes.transit.toWork : [];
    const tripOnMap = toWork[selectedTrip];

    const mapHtml = useMemo(() => {
        if (!routes) return null;
        let segments: MapSegment[] = [];
        if (activeTab === 'driving' && routes.driving) {
            segments = [{ points: routes.driving.geometry, color: colors.primary }];
        } else if (activeTab === 'transit' && tripOnMap) {
            segments = tripOnMap.legs.map((leg) => ({
                points: leg.geometry,
                color: isWalk(leg) ? '#64748B' : leg.color ?? colors.primary,
                dashed: isWalk(leg),
            }));
        }
        return buildRouteMapHTML(routes.origin, routes.destination, segments, colors.primary);
    }, [activeTab, routes, tripOnMap, colors.primary]);

    if (isLoadingShift || !shift) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const closeButton = <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />;

    if (!hasJobLocation) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + spacing.sm }}>
                <View style={{ alignItems: 'flex-end' }}>{closeButton}</View>
                <ThemedText weight="semibold" style={{ textAlign: 'center', marginTop: 40 }}>
                    This job doesn’t have a location yet.
                </ThemedText>
                <ThemedText variant="muted" size="sm" style={{ textAlign: 'center', marginTop: 8, marginBottom: spacing.lg }}>
                    Pin it on the map to plan your route.
                </ThemedText>
                <Button label="Set Job Location" onPress={() => router.replace(`/edit-job/${shift.jobId}`)} />
            </View>
        );
    }

    const dest = { lat: shift.job.latitude!, lng: shift.job.longitude! };
    const startForLinks = fromHome ? routes?.origin : undefined; // "here" = maps app's own location
    const jobLabel = jobName(shift.job);
    const bufferNote = routes ? describeArrivalBuffer(routes.arrivalBufferMinutes) : '';

    const handleTripPress = (index: number) => {
        setSelectedTrip(index);
        setExpandedTrip((current) => (current === index ? null : index));
    };

    const retryButton = <TextButton label="Try Again" icon={RotateCw} size="sm" onPress={() => setAttempt((n) => n + 1)} style={{ alignSelf: 'flex-start' }} />;

    const renderStatus = () => {
        if (routesState.status === 'loading') {
            return (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
                    <ActivityIndicator color={colors.primary} />
                    <ThemedText variant="muted" size="sm">{activeTab === 'transit' ? 'Finding buses and trains…' : 'Working out the drive…'}</ThemedText>
                </View>
            );
        }
        if (routesState.status === 'error') {
            return (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                    <ThemedText color={colors.danger} size="sm" style={{ marginBottom: spacing.sm }}>{routesState.message}</ThemedText>
                    {routesState.isLocationProblem && !home ? (
                        <ThemedText variant="muted" size="sm">Adding your home address lets you plan without location access.</ThemedText>
                    ) : (
                        retryButton
                    )}
                </View>
            );
        }
        return null;
    };

    const renderTransit = () => {
        if (!routes) return renderStatus();
        if (routes.transit.status === 'unavailable') {
            return (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                    <ThemedText color={colors.danger} size="sm" style={{ marginBottom: spacing.sm }}>{routes.transit.message}</ThemedText>
                    {retryButton}
                </View>
            );
        }
        if (toWork.length === 0) {
            return (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                    <ThemedText weight="semibold" style={{ marginBottom: 4 }}>No transit trips found</ThemedText>
                    <ThemedText variant="secondary" size="sm">
                        Nothing gets you there by {formatTime(routes.arriveBy)} — this area may not have open schedule data yet. Try driving, or check your maps app.
                    </ThemedText>
                </View>
            );
        }
        const returnTrip = routes.transit.toHome[0];
        return (
            <>
                {toWork.map((itinerary, i) => (
                    <TransitItineraryCard
                        key={`${itinerary.departure}-${i}`}
                        itinerary={itinerary}
                        selected={selectedTrip === i}
                        expanded={expandedTrip === i}
                        onPress={() => handleTripPress(i)}
                        leaveLabel={fromHome ? 'Leave home by' : 'Leave by'}
                        destinationLabel={jobLabel}
                    />
                ))}

                {returnTrip && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md }}>
                        <ThemedText variant="muted" size="xs" style={{ marginBottom: 4 }}>GETTING HOME AFTER YOUR SHIFT</ThemedText>
                        <ThemedText weight="semibold">
                            Leave {formatTime(returnTrip.departure)} → home by {formatTime(returnTrip.arrival)}
                        </ThemedText>
                        <ThemedText variant="muted" size="xs" style={{ marginTop: 2 }}>
                            {returnTrip.durationMinutes} min · first trip after your shift ends at {formatTime(shift.endTime)}
                        </ThemedText>
                    </View>
                )}

                <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginBottom: spacing.md, lineHeight: 16 }}>
                    Scheduled times from open transit data (Transitous) — live delays aren’t included.
                </ThemedText>
            </>
        );
    };

    const renderDriving = () => {
        if (!routes) return renderStatus();
        const { driving } = routes;
        if (!driving) {
            return (
                <ThemedText variant="muted" style={{ textAlign: 'center', marginVertical: spacing.lg }}>
                    Could not calculate driving time right now.
                </ThemedText>
            );
        }
        return (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Clock color={colors.primary} size={18} />
                    <ThemedText weight="semibold" style={{ marginLeft: 8 }}>
                        {driving.durationMinutes} min drive · {driving.distanceKm} km
                    </ThemedText>
                </View>
                <View style={{ height: 1, backgroundColor: colors.surfaceLight, marginVertical: spacing.sm }} />

                <ThemedText variant="muted" size="xs" style={{ marginBottom: 4 }}>{fromHome ? 'LEAVE HOME BY' : 'LEAVE BY'}</ThemedText>
                <ThemedText size="lg" weight="bold" color={colors.primary}>{formatTime(driving.leaveBy)}</ThemedText>
                <ThemedText variant="muted" size="xs" style={{ marginTop: 2 }}>
                    For your {formatTime(shift.startTime)} shift — planned to {bufferNote}
                </ThemedText>

                {driving.backHomeAround && (
                    <>
                        <View style={{ height: 1, backgroundColor: colors.surfaceLight, marginVertical: spacing.sm }} />
                        <ThemedText variant="muted" size="xs" style={{ marginBottom: 4 }}>BACK HOME AROUND</ThemedText>
                        <ThemedText weight="semibold">{formatTime(driving.backHomeAround)}</ThemedText>
                        <ThemedText variant="muted" size="xs" style={{ marginTop: 2 }}>
                            {driving.durationMinutes} min after your shift ends ({formatTime(shift.endTime)})
                        </ThemedText>
                    </>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <ThemedText size="xl" weight="bold">Plan your route</ThemedText>
                {closeButton}
            </View>

            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }}>
                {/* The one real choice on this screen: how you're travelling */}
                <SegmentedControl options={MODE_OPTIONS} value={activeTab} onChange={setActiveTab} accessibilityLabel="How to get there" />
                {home ? (
                    // Where the trip starts is said in words, with a way to switch — a second
                    // toggle under the first one read as two unrelated settings
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
                        {fromHome ? <House color={colors.textSecondary} size={18} /> : <LocateFixed color={colors.textSecondary} size={18} />}
                        <View style={{ flex: 1 }}>
                            <ThemedText variant="muted" size="xs">FROM</ThemedText>
                            <ThemedText size="sm" weight="medium" numberOfLines={1}>
                                {fromHome ? `Home · ${splitAddress(home.address).title}` : 'Where you are now'}
                            </ThemedText>
                        </View>
                        <TextButton
                            label={fromHome ? 'Use my location' : 'Use home'}
                            size="sm"
                            onPress={() => setOrigin(fromHome ? 'here' : 'home')}
                            accessibilityHint="Changes where the route starts"
                        />
                    </View>
                ) : (
                    <PressableScale
                        onPress={() => router.push('/home-address')}
                        accessibilityRole="button"
                        pressedScale={0.98}
                        style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                        <House color={colors.primary} size={18} />
                        <ThemedText size="sm" style={{ flex: 1 }}>
                            Planning from where you are now. <ThemedText size="sm" color={colors.primary} weight="medium">Add your home address</ThemedText> to plan from home.
                        </ThemedText>
                    </PressableScale>
                )}
            </View>

            {mapHtml && (
                <View style={{ height: 200, marginHorizontal: spacing.lg, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md }}>
                    <WebView originWhitelist={['*']} source={{ html: mapHtml }} scrollEnabled={false} />
                </View>
            )}

            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <ThemedText variant="muted" size="xs" style={{ marginBottom: 4 }}>DESTINATION</ThemedText>
                        <ThemedText weight="semibold">{jobLabel}</ThemedText>
                        {shift.job.location && <ThemedText variant="secondary" size="sm" numberOfLines={1} style={{ marginTop: 2 }}>{shift.job.location}</ThemedText>}
                    </View>
                    {routes && (
                        <PressableArriveBy
                            arriveBy={formatTime(routes.arriveBy)}
                            note={routes.arrivalBufferMinutes === 0 ? 'on time' : `${routes.arrivalBufferMinutes} min early`}
                            color={colors.primary}
                        />
                    )}
                </View>

                {activeTab === 'driving' ? (
                    <>
                        {renderDriving()}
                        <Button label="Open Turn-by-Turn Directions" icon={Navigation} onPress={() => openDrivingDirections(dest, startForLinks)} />
                    </>
                ) : (
                    <>
                        {renderTransit()}
                        <Button label="Open in Maps App" icon={Navigation} variant="secondary" onPress={() => openTransitDirections(dest, startForLinks)} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}

/** "ARRIVE BY 8:50 AM · 10 min early" — tapping it opens the setting that controls it. */
function PressableArriveBy({ arriveBy, note, color }: { arriveBy: string; note: string; color: string }) {
    return (
        <PressableScale
            onPress={() => router.push('/home-address')}
            accessibilityRole="button"
            accessibilityHint="Change how early you arrive"
            hitSlop={8}
            pressedScale={1}
            pressedStyle={{ opacity: 0.5 }}
            style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}
        >
            <ThemedText variant="muted" size="xs">ARRIVE BY</ThemedText>
            <ThemedText weight="bold" color={color}>{arriveBy}</ThemedText>
            <ThemedText variant="muted" size="xs">{note}</ThemedText>
        </PressableScale>
    );
}
