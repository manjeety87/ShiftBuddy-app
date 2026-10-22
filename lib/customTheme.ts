import { themeFamilies, type ResolvedMode, type ThemeColors } from '../constants/themes';
import { contrastRatio, mixColors } from './color';

// The person's own theme: four colours for each side (light and dark), and
// everything else mixed from them so it stays one family. Status colours come
// from Sunsama Focus's matching side: they were contrast-checked, and red has to stay red.

/** What their own theme is called in the theme list */
export const CUSTOM_THEME_LABEL = 'My theme';

export interface CustomColors {
    /** Behind everything */
    background: string;
    /** Cards, lists, fields */
    surface: string;
    /** Words and icons */
    textPrimary: string;
    /** Buttons, links, today */
    primary: string;
}

/** Their own theme: one set of colours for each side */
export type CustomTheme = Record<ResolvedMode, CustomColors>;

export const CUSTOM_FIELDS: { key: keyof CustomColors; label: string; hint: string }[] = [
    { key: 'background', label: 'Page', hint: 'Behind everything' },
    { key: 'surface', label: 'Cards', hint: 'Lists, panels, fields' },
    { key: 'textPrimary', label: 'Text', hint: 'Words and icons' },
    { key: 'primary', label: 'Accent', hint: 'Buttons, links, today' },
];

export const CUSTOM_SIDES: { value: ResolvedMode; label: string }[] = [
    { value: 'light', label: 'Light side' },
    { value: 'dark', label: 'Dark side' },
];

const HEX = /^#[0-9a-f]{6}$/i;

/** "#abc", "abc", "AABBCC" → "#aabbcc"; anything else → null. */
export const normaliseHex = (input: string): string | null => {
    const value = input.trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(value)) return `#${[...value].map((c) => c + c).join('')}`;
    return /^[0-9a-f]{6}$/.test(value) ? `#${value}` : null;
};

/** The four colours of a theme side — where "Start from" begins. */
export const colorsOf = (theme: ThemeColors): CustomColors => ({
    background: theme.background.toLowerCase(),
    surface: theme.surface.toLowerCase(),
    textPrimary: theme.textPrimary.toLowerCase(),
    primary: theme.primary.toLowerCase(),
});

/** Both sides of a built-in theme */
export const customThemeOf = (family: { light: ThemeColors; dark: ThemeColors }): CustomTheme => ({ light: colorsOf(family.light), dark: colorsOf(family.dark) });

export const DEFAULT_CUSTOM_THEME = customThemeOf(themeFamilies.sunsamaFocus);

const validSide = (value: unknown, side: ResolvedMode): CustomColors => {
    const saved = (value && typeof value === 'object' ? value : {}) as Partial<CustomColors>;
    const pick = (key: keyof CustomColors) => (typeof saved[key] === 'string' && HEX.test(saved[key]!) ? saved[key]!.toLowerCase() : DEFAULT_CUSTOM_THEME[side][key]);
    return { background: pick('background'), surface: pick('surface'), textPrimary: pick('textPrimary'), primary: pick('primary') };
};

/**
 * Saved JSON → their theme. Anything missing or not a colour falls back to Sunsama
 * Focus (the value comes from storage). Versions before light/dark saved one flat
 * set: that becomes the light side, with Sunsama Focus's dark side.
 */
export const parseCustomTheme = (raw: unknown): CustomTheme => {
    const saved = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    if ('light' in saved || 'dark' in saved) return { light: validSide(saved.light, 'light'), dark: validSide(saved.dark, 'dark') };
    return { light: validSide(saved, 'light'), dark: DEFAULT_CUSTOM_THEME.dark };
};

/** One side of their theme as a full set of colours. */
export const buildCustomTheme = (theme: CustomTheme, side: ResolvedMode): ThemeColors => {
    const colors = theme[side];
    const isDark = side === 'dark';
    const base = themeFamilies.sunsamaFocus[side];
    return {
        ...base,
        ...colors,
        surfaceLight: mixColors(colors.background, colors.textPrimary, isDark ? 0.14 : 0.08),
        textSecondary: mixColors(colors.textPrimary, colors.background, isDark ? 0.3 : 0.38),
        textMuted: mixColors(colors.textPrimary, colors.background, isDark ? 0.55 : 0.58),
        primaryLight: mixColors(colors.primary, isDark ? colors.textPrimary : colors.background, 0.25),
        jobPalette: [colors.primary, ...base.jobPalette.slice(1)],
    };
};

export const sameCustomTheme = (a: CustomTheme, b: CustomTheme) =>
    CUSTOM_SIDES.every(({ value }) => CUSTOM_FIELDS.every(({ key }) => a[value][key] === b[value][key]));

/**
 * What would be hard to read. Advice, not a block: it is their theme. Same bars the
 * built-in themes are held to — 4.5:1 for words, 3:1 for the accent as a shape.
 */
export const customThemeWarnings = (colors: CustomColors): string[] => {
    const warnings: string[] = [];
    if (contrastRatio(colors.textPrimary, colors.background) < 4.5 || contrastRatio(colors.textPrimary, colors.surface) < 4.5) warnings.push('Text is hard to read on the page or the cards. Move it further from them.');
    if (contrastRatio(colors.primary, colors.background) < 3) warnings.push('The accent fades into the page — buttons and today will be hard to spot.');
    if (contrastRatio(colors.surface, colors.background) < 1.04) warnings.push('Cards and page are the same colour, so cards won’t stand out.');
    return warnings;
};
