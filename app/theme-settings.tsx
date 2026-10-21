import { router } from 'expo-router';
import { Check, ChevronRight, Paintbrush } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Card } from '../components/ui/Card';
import { PressableScale } from '../components/ui/PressableScale';
import { Screen } from '../components/ui/Screen';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { builtInThemes, radius, spacing, themeLabels, type FontScaleName, type ThemeName } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { buildCustomTheme, CUSTOM_THEME_LABEL } from '../lib/customTheme';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';

const FONT_OPTIONS: { name: FontScaleName; label: string; size: number }[] = [
    { name: 'small', label: 'Small', size: 14 },
    { name: 'medium', label: 'Default', size: 20 },
    { name: 'large', label: 'Large', size: 26 },
];

/**
 * Theme and text size. A tap previews it across the app; nothing is kept until
 * Save, so trying themes never changes the app by accident. Cancel — or closing
 * the sheet — puts the saved look back.
 */
export default function ThemeSettingsScreen() {
    const { colors, themeName, fontScaleName, isPreviewing, customColors, previewLook, savePreview, discardPreview } = useTheme();

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

    const themeRow = (name: ThemeName, label: string, background: string, accent: string, isFirst: boolean) => {
        const isSelected = themeName === name;
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
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: background, borderWidth: 1, borderColor: withAlpha(colors.textPrimary, 0.12) }} />
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accent, marginLeft: -10 }} />
                </View>
                <ThemedText weight={isSelected ? 'semibold' : 'normal'} style={{ flex: 1 }}>{label}</ThemedText>
                {isSelected && <Check color={colors.primary} size={20} strokeWidth={2.5} />}
            </PressableScale>
        );
    };

    const custom = customColors ? buildCustomTheme(customColors) : null;

    return (
        <Screen>
            <SheetHeader title="Appearance" onCancel={() => router.back()} onSave={save} saveDisabled={!isPreviewing} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant={isPreviewing ? 'secondary' : 'muted'} size="sm" style={{ marginTop: spacing.md, marginLeft: 4 }}>
                    {isPreviewing ? 'Previewing — tap Save to keep it, or Cancel to go back.' : 'Tap a theme to try it across the app. Save keeps it.'}
                </ThemedText>

                {sectionTitle('Theme')}
                <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    {(Object.keys(builtInThemes) as Exclude<ThemeName, 'custom'>[]).map((name, i) =>
                        themeRow(name, themeLabels[name], builtInThemes[name].background, builtInThemes[name].primary, i === 0),
                    )}
                    {custom && themeRow('custom', CUSTOM_THEME_LABEL, custom.background, custom.primary, false)}
                </View>

                <PressableScale
                    onPress={() => router.push('/custom-theme')}
                    accessibilityRole="button"
                    pressedScale={0.98}
                    style={{ marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                    <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
                        <Paintbrush color={colors.textSecondary} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <ThemedText weight="medium">{custom ? `Edit ${CUSTOM_THEME_LABEL}` : 'Make your own'}</ThemedText>
                        <ThemedText variant="secondary" size="xs">Pick the page, card, text and accent colours</ThemedText>
                    </View>
                    <ChevronRight color={colors.textMuted} size={18} />
                </PressableScale>

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
