import { router } from 'expo-router';
import { AlertTriangle, MapPin, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ColorSwatches } from '../components/ui/ColorSwatches';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedInput } from '../components/ui/ThemedInput';
import { ThemedText } from '../components/ui/ThemedText';
import { builtInThemes, radius, spacing, themeLabels, type ThemeName } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { buildCustomTheme, colorsOf, CUSTOM_FIELDS, CUSTOM_THEME_LABEL, customThemeWarnings, normaliseHex, sameCustomColors, type CustomColors } from '../lib/customTheme';
import { notify } from '../lib/notify';
import { ThemePreview, useTheme } from '../lib/theme-context';
import { useDiscardGuard } from '../lib/useDiscardGuard';

// Starting points for each colour; any other one can be typed as a hex code
const PRESETS: Record<keyof CustomColors, string[]> = {
    background: ['#f4f1ea', '#f6f0e9', '#f0f2f0', '#f3f0f2', '#fafafa', '#1b1a17', '#171a1c', '#0f1115'],
    surface: ['#ffffff', '#fbf8f3', '#f5f5f7', '#ece7dc', '#262420', '#212628', '#1c1c1e'],
    textPrimary: ['#2b2a25', '#1f1f1f', '#232a2d', '#3a2f45', '#ede9df', '#e8e8e8', '#ffffff'],
    primary: ['#6b8f71', '#b0674a', '#557a95', '#866aa0', '#007aff', '#e0669a', '#d97706', '#0f766e'],
};

const STARTS = Object.keys(builtInThemes) as Exclude<ThemeName, 'custom'>[];

/**
 * Their own theme: four colours, and a made-up Home drawn in them as they pick.
 * The app behind keeps its theme until Save & Use — the preview is the place to
 * look, so nothing changes under them while they experiment.
 */
export default function CustomThemeScreen() {
    const { colors, themeName, customColors, saveCustomTheme } = useTheme();
    // A first one starts from the theme on screen, so it begins somewhere that already works
    const [initial] = useState<CustomColors>(() => (customColors ? colorsOf(buildCustomTheme(customColors)) : colorsOf(colors)));
    const [draft, setDraft] = useState(initial);
    const [editing, setEditing] = useState<keyof CustomColors>('primary');
    const [hexText, setHexText] = useState(initial.primary);
    const { leave } = useDiscardGuard(JSON.stringify(draft), JSON.stringify(initial));

    const changed = !sameCustomColors(draft, initial);
    const warnings = customThemeWarnings(draft);
    const field = CUSTOM_FIELDS.find(({ key }) => key === editing)!;

    const setColor = (key: keyof CustomColors, value: string) => {
        setDraft((before) => ({ ...before, [key]: value }));
        if (key === editing) setHexText(value);
    };

    const choose = (key: keyof CustomColors) => {
        setEditing(key);
        setHexText(draft[key]);
    };

    const save = () => {
        saveCustomTheme(draft);
        notify.success(`${CUSTOM_THEME_LABEL} saved and in use`);
        leave();
    };

    const label = (text: string) => (
        <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 4 }}>{text}</ThemedText>
    );

    return (
        <KeyboardSafeView>
            <SheetHeader
                title={customColors ? `Edit ${CUSTOM_THEME_LABEL}` : 'Make Your Own'}
                onCancel={() => router.back()}
                onSave={save}
                saveLabel="Save & Use"
                saveDisabled={!!customColors && !changed && themeName === 'custom'}
            />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>PREVIEW · HOME</ThemedText>
                <ThemePreview theme={buildCustomTheme(draft)}>
                    <HomePreview />
                </ThemePreview>
                <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginLeft: 4 }}>Made-up shifts, your colours.</ThemedText>

                {label('START FROM')}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {STARTS.map((name) => (
                        <PressableScale
                            key={name}
                            onPress={() => {
                                const next = colorsOf(builtInThemes[name]);
                                setDraft(next);
                                setHexText(next[editing]);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Start from ${themeLabels[name]}`}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface }}
                        >
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: builtInThemes[name].primary }} />
                            <ThemedText size="sm">{themeLabels[name]}</ThemedText>
                        </PressableScale>
                    ))}
                </ScrollView>

                {label('YOUR COLOURS')}
                <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    {CUSTOM_FIELDS.map(({ key, label: name, hint }, index) => {
                        const isOn = key === editing;
                        return (
                            <PressableScale
                                key={key}
                                onPress={() => choose(key)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: isOn }}
                                pressedScale={1}
                                pressedStyle={{ backgroundColor: colors.surfaceLight }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight, backgroundColor: isOn ? withAlpha(colors.primary, 0.08) : undefined }}
                            >
                                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: draft[key], borderWidth: 1, borderColor: withAlpha(colors.textPrimary, 0.15) }} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText weight={isOn ? 'semibold' : 'medium'}>{name}</ThemedText>
                                    <ThemedText variant="secondary" size="xs">{hint}</ThemedText>
                                </View>
                                <ThemedText variant="secondary" size="sm" style={{ fontVariant: ['tabular-nums'] }}>{draft[key].toUpperCase()}</ThemedText>
                            </PressableScale>
                        );
                    })}
                </View>

                {label(`${field.label.toUpperCase()} COLOUR`)}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }}>
                    <ColorSwatches colors={PRESETS[editing]} selected={draft[editing]} onSelect={(color) => setColor(editing, color)} label={`${field.label} colour`} />
                    <ThemedInput
                        value={hexText}
                        onChangeText={(text) => {
                            setHexText(text);
                            // A full code applies as it's typed; a short one (#abc) waits for the field to be left
                            const hex = text.replace(/^#?/, '#');
                            if (/^#[0-9a-f]{6}$/i.test(hex)) setDraft((before) => ({ ...before, [editing]: hex.toLowerCase() }));
                        }}
                        onBlur={() => {
                            const hex = normaliseHex(hexText);
                            if (hex) setColor(editing, hex);
                            else setHexText(draft[editing]);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={7}
                        placeholder="#6b8f71"
                        accessibilityLabel={`${field.label} colour code`}
                    />
                </View>

                {warnings.length > 0 && (
                    <View style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: withAlpha(colors.warning, 0.14), gap: 6 }}>
                        {warnings.map((warning) => (
                            <View key={warning} style={{ flexDirection: 'row', gap: 8 }}>
                                <AlertTriangle color={colors.warning} size={16} style={{ marginTop: 1 }} />
                                <ThemedText size="sm" style={{ flex: 1 }}>{warning}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </KeyboardSafeView>
    );
}

const WEEK = [
    { day: 'S', date: 19 },
    { day: 'M', date: 20, dot: true },
    { day: 'T', date: 21, dot: true },
    { day: 'W', date: 22 },
    { day: 'T', date: 23, dot: true },
    { day: 'F', date: 24, dot: true },
    { day: 'S', date: 25 },
];
const SELECTED = 2;
// Job colours are picked per job, not by the theme, so the preview keeps fixed ones
const SHIFTS = [
    { job: 'Tim Hortons', detail: '9:00 AM – 2:30 PM · Front counter', pay: '$95.70', color: '#d97706' },
    { job: 'Campus Library', detail: '4:00 PM – 8:00 PM · Desk assistant', pay: '$70.40', color: '#2563eb' },
];

/** A made-up Home in the theme being made, built from the theme's own colours. */
function HomePreview() {
    const { colors } = useTheme();
    return (
        <View accessibilityLabel="Preview of Home in these colours" style={{ backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: withAlpha(colors.textPrimary, 0.1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                    <ThemedText variant="secondary" size="xs">Tuesday, October 21</ThemedText>
                    <ThemedText weight="bold" size="lg">Good evening, Sam</ThemedText>
                </View>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
                    <Plus color={colors.onPrimary} size={18} />
                </View>
            </View>

            <View style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md }}>
                <ThemedText size="xs" weight="semibold" color={withAlpha(colors.onPrimary, 0.8)}>NEXT SHIFT · TOMORROW</ThemedText>
                <ThemedText weight="bold" color={colors.onPrimary} style={{ marginTop: 2 }}>Tim Hortons</ThemedText>
                <ThemedText size="sm" color={withAlpha(colors.onPrimary, 0.85)}>9:00 AM – 2:30 PM</ThemedText>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.sm }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, backgroundColor: withAlpha(colors.onPrimary, 0.18) }}>
                        <ThemedText size="xs" weight="semibold" color={colors.onPrimary}>Clock In</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, backgroundColor: withAlpha(colors.onPrimary, 0.18) }}>
                        <MapPin color={colors.onPrimary} size={12} />
                        <ThemedText size="xs" color={colors.onPrimary}>Leave 8:25</ThemedText>
                    </View>
                </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {WEEK.map((item, index) => {
                    const isOn = index === SELECTED;
                    return (
                        <View key={index} style={{ alignItems: 'center', width: 36, paddingVertical: 6, borderRadius: radius.md, backgroundColor: isOn ? colors.primary : 'transparent' }}>
                            <ThemedText size="xs" color={isOn ? colors.onPrimary : colors.textMuted}>{item.day}</ThemedText>
                            <ThemedText size="sm" weight="semibold" color={isOn ? colors.onPrimary : colors.textPrimary}>{item.date}</ThemedText>
                            <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: item.dot ? (isOn ? colors.onPrimary : colors.primary) : 'transparent' }} />
                        </View>
                    );
                })}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: radius.sm, backgroundColor: withAlpha(colors.warning, 0.15) }}>
                <AlertTriangle color={colors.warning} size={14} />
                <ThemedText size="xs">Thursday: two shifts overlap by 30 min</ThemedText>
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                {SHIFTS.map((shift, index) => (
                    <View key={shift.job} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: shift.color }} />
                        <View style={{ flex: 1 }}>
                            <ThemedText size="sm" weight="semibold">{shift.job}</ThemedText>
                            <ThemedText variant="secondary" size="xs">{shift.detail}</ThemedText>
                        </View>
                        <ThemedText size="sm" weight="semibold" color={colors.success}>{shift.pay}</ThemedText>
                    </View>
                ))}
            </View>
        </View>
    );
}
