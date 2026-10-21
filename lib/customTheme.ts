import { builtInThemes, eveningFocusTheme, sunsamaFocusTheme, type ThemeColors } from '../constants/themes';
import { contrastRatio, isDarkColor, mixColors } from './color';

// The person's own theme: four colours they pick, and everything else mixed from
// them so it stays one family. Status colours come from Sunsama Focus (or Evening
// Focus on a dark page): they were contrast-checked, and red has to stay red.

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

export const CUSTOM_FIELDS: { key: keyof CustomColors; label: string; hint: string }[] = [
    { key: 'background', label: 'Page', hint: 'Behind everything' },
    { key: 'surface', label: 'Cards', hint: 'Lists, panels, fields' },
    { key: 'textPrimary', label: 'Text', hint: 'Words and icons' },
    { key: 'primary', label: 'Accent', hint: 'Buttons, links, today' },
];

const HEX = /^#[0-9a-f]{6}$/i;

/** "#abc", "abc", "AABBCC" → "#aabbcc"; anything else → null. */
export const normaliseHex = (input: string): string | null => {
    const value = input.trim().replace(/^#/, '').toLowerCase();
    if (/^[0-9a-f]{3}$/.test(value)) return `#${[...value].map((c) => c + c).join('')}`;
    return /^[0-9a-f]{6}$/.test(value) ? `#${value}` : null;
};

/** The four colours of a built-in theme — where "Start from" begins. */
export const colorsOf = (theme: ThemeColors): CustomColors => ({
    background: theme.background.toLowerCase(),
    surface: theme.surface.toLowerCase(),
    textPrimary: theme.textPrimary.toLowerCase(),
    primary: theme.primary.toLowerCase(),
});

export const DEFAULT_CUSTOM_COLORS = colorsOf(builtInThemes.sunsamaFocus);

/**
 * Saved colours → a theme. Anything missing or not a colour falls back to Sunsama
 * Focus (the value comes from storage, and older versions saved only an accent).
 */
export const buildCustomTheme = (saved: Partial<CustomColors> | null): ThemeColors => {
    const pick = (key: keyof CustomColors) => (saved && typeof saved[key] === 'string' && HEX.test(saved[key]!) ? saved[key]! : DEFAULT_CUSTOM_COLORS[key]);
    const colors: CustomColors = { background: pick('background'), surface: pick('surface'), textPrimary: pick('textPrimary'), primary: pick('primary') };
    const isDark = isDarkColor(colors.background);
    const base = isDark ? eveningFocusTheme : sunsamaFocusTheme;
    return {
        ...base,
        ...colors,
        surfaceLight: mixColors(colors.background, colors.textPrimary, isDark ? 0.14 : 0.08),
        textSecondary: mixColors(colors.textPrimary, colors.background, 0.38),
        textMuted: mixColors(colors.textPrimary, colors.background, 0.58),
        primaryLight: mixColors(colors.primary, colors.background, 0.25),
        jobPalette: [colors.primary, ...base.jobPalette.slice(1)],
    };
};

export const sameCustomColors = (a: CustomColors, b: CustomColors) => CUSTOM_FIELDS.every(({ key }) => a[key] === b[key]);

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
