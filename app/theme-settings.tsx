import { router } from 'expo-router';
import { Check, ChevronRight, Paintbrush } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { PressableScale } from '../components/ui/PressableScale';
import { Screen } from '../components/ui/Screen';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { COLLECTIONS, MODES, radius, spacing, THEMES, type FontScaleName, type ThemeMode, type ThemeName } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { CUSTOM_THEME_LABEL } from '../lib/customTheme';
import { notify } from '../lib/notify';
import { themeColorsFor, useTheme } from '../lib/theme-context';

const FONT_OPTIONS: { name: FontScaleName; label: string; size: number }[] = [
    { name: 'small', label: 'Small', size: 14 },
    { name: 'medium', label: 'Default', size: 20 },
    { name: 'large', label: 'Large', size: 26 },
];

const MODE_OPTIONS = MODES.map((mode) => ({ value: mode.value as ThemeMode, label: mode.label }));

/**
 * Light or dark (or follow the phone), the theme and the text size — the same
 * choices as the web app. A tap previews it across the app; nothing is kept until
 * Save, so trying themes never changes the app by accident. Cancel — or closing
 * the sheet — puts the saved look back.
 */
export default function ThemeSettingsScreen() {
    const { colors, themeName, mode, resolvedMode, fontScaleName, isPreviewing, customTheme, previewLook, savePreview, discardPreview } = useTheme();

    // Leaving without saving puts the saved look back
    const discard = useRef(discardPreview);
    useEffect(() => {
        discard.current = discardPreview;
    });
    useEffect(() => () => discard.current(), []);

    const save = () => {
        savePreview();
        notify.success('Appearance saved');
        router.back();
    };

    const sectionTitle = (text: string) => (
        <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 4 }}>
            {text.toUpperCase()}
        </ThemedText>
    );

    // Swatches show the side that is on screen now, so a dark phone sees the dark sides
    const themeRow = (name: ThemeName, label: string, note: string, isFirst: boolean) => {
        const isSelected = themeName === name;
        const side = themeColorsFor(name, resolvedMode, customTheme);
        return (
            <PressableScale
                key={name}
                onPress={() => previewLook({ themeName: name })}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={label}
                pressedScale={1}
                pressedStyle={{ backgroundColor: colors.surfaceLight }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: isFirst ? 0 : 1, borderTopColor: colors.surfaceLight }}
            >
                <View style={{ flexDirection: 'row' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: side.background, borderWidth: 1, borderColor: withAlpha(colors.textPrimary, 0.15) }} />
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: side.primary, marginLeft: -10 }} />
                </View>
                <View style={{ flex: 1 }}>
                    <ThemedText weight={isSelected ? 'semibold' : 'normal'}>{label}</ThemedText>
                    <ThemedText variant="muted" size="xs">{note}</ThemedText>
                </View>
                {isSelected && <Check color={colors.primary} size={20} strokeWidth={2.5} />}
            </PressableScale>
        );
    };

    return (
        <Screen>
            <SheetHeader title="Appearance" onCancel={() => router.back()} onSave={save} saveDisabled={!isPreviewing} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant={isPreviewing ? 'secondary' : 'muted'} size="sm" style={{ marginTop: spacing.md, marginLeft: 4 }}>
                    {isPreviewing ? 'Previewing — tap Save to keep it, or Cancel to go back.' : 'Tap to try it across the app. Save keeps it.'}
                </ThemedText>

                {sectionTitle('Light or dark')}
                <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={(next) => previewLook({ mode: next })} accessibilityLabel="Light or dark" />
                <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginLeft: 4 }}>
                    {mode === 'system' ? `Auto follows your phone — ${resolvedMode} right now.` : 'Every theme has a light and a dark side.'}
                </ThemedText>

                {COLLECTIONS.map((collection) => {
                    const themes = THEMES.filter((theme) => theme.collection === collection.id);
                    return (
                        <View key={collection.id}>
                            {sectionTitle(`${collection.label} · ${themes.length}`)}
                            <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                                {themes.map((theme, i) => themeRow(theme.name, theme.label, theme.note, i === 0))}
                            </View>
                        </View>
                    );
                })}

                {sectionTitle('Yours')}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    {customTheme && themeRow('custom', CUSTOM_THEME_LABEL, 'Your own colours', true)}
                    <PressableScale
                        onPress={() => router.push('/custom-theme')}
                        accessibilityRole="button"
                        pressedScale={1}
                        pressedStyle={{ backgroundColor: colors.surfaceLight }}
                        style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: customTheme ? 1 : 0, borderTopColor: colors.surfaceLight }}
                    >
                        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
                            <Paintbrush color={colors.textSecondary} size={18} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText weight="medium">{customTheme ? `Edit ${CUSTOM_THEME_LABEL}` : 'Make your own'}</ThemedText>
                            <ThemedText variant="secondary" size="xs">Page, card, text and accent — for light and dark</ThemedText>
                        </View>
                        <ChevronRight color={colors.textMuted} size={18} />
                    </PressableScale>
                </View>

                {sectionTitle('Text size')}
                <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {FONT_OPTIONS.map((option) => {
                        const isSelected = fontScaleName === option.name;
                        return (
                            <PressableScale
                                key={option.name}
                                onPress={() => previewLook({ fontScaleName: option.name })}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: isSelected }}
                                accessibilityLabel={`${option.label} text`}
                                style={{
                                    flex: 1,
                                    height: 72,
                                    borderRadius: radius.md,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    backgroundColor: isSelected ? colors.primary : colors.surface,
                                }}
                            >
                                {/* Fixed sizes on purpose: the preview shouldn't grow with the setting it previews */}
                                <ThemedText weight="bold" allowFontScaling={false} style={{ fontSize: option.size, lineHeight: option.size + 4 }} color={isSelected ? colors.onPrimary : colors.textPrimary}>A</ThemedText>
                                <ThemedText size="xs" allowFontScaling={false} style={{ fontSize: 12 }} color={isSelected ? colors.onPrimary : colors.textSecondary}>{option.label}</ThemedText>
                            </PressableScale>
                        );
                    })}
                </View>

                {sectionTitle('Preview')}
                <Card accentColor={colors.primary}>
                    <ThemedText weight="bold" size="lg" style={{ marginBottom: 4 }}>Boathouse</ThemedText>
                    <ThemedText variant="secondary" size="sm">Retail Sales Supervisor · 9:00 AM – 5:30 PM</ThemedText>
                </Card>
            </ScrollView>
        </Screen>
    );
}
