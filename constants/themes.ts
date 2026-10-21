export interface ThemeColors {
    background: string;
    surface: string;
    surfaceLight: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryLight: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    jobPalette: string[];
}

/**
 * What screens actually receive from useTheme(): a theme plus values derived
 * from it (see lib/theme-context) — so they're right for custom themes too.
 */
export interface ResolvedThemeColors extends ThemeColors {
    /** Text/icon colour that reads well on `primary` (buttons, FABs, hero card) */
    onPrimary: string;
    /** True when `background` is dark — drives status bar style */
    isDark: boolean;
}

// Every theme follows the same recipe as Sunsama: a warm off-white (or warm
// charcoal) page, white cards, soft low-contrast borders, one muted accent and
// gentle status colours. Job colours are muted too, so a busy week stays calm.

// Sunsama Focus — sage green on warm paper (default)
export const sunsamaFocusTheme: ThemeColors = {
    background: '#F4F1EA',
    surface: '#FFFFFF',
    surfaceLight: '#E8E3D8',
    textPrimary: '#2B2A25',
    textSecondary: '#7C7A70',
    textMuted: '#A8A59A',
    primary: '#6B8F71',
    primaryLight: '#89AB8F',
    success: '#5C8A5C',
    warning: '#C99A3A',
    danger: '#B85C4E',
    info: '#5B8A9A',
    jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
};

// Clay Studio — terracotta on cream, warm and grounded
export const clayStudioTheme: ThemeColors = {
    background: '#F6F0E9',
    surface: '#FFFFFF',
    surfaceLight: '#ECE3D8',
    textPrimary: '#2E2823',
    textSecondary: '#807468',
    textMuted: '#ADA295',
    primary: '#B0674A',
    primaryLight: '#C98668',
    success: '#6E8F5E',
    warning: '#C9973E',
    danger: '#B4533F',
    info: '#5E8496',
    jobPalette: ['#B0674A', '#6E8F5E', '#C9973E', '#5E8496', '#8E6F9E', '#C27C8A', '#8A8F5A'],
};

// Harbor Mist — dusty blue on soft stone, cool and clear
export const harborMistTheme: ThemeColors = {
    background: '#F0F2F0',
    surface: '#FFFFFF',
    surfaceLight: '#E0E5E2',
    textPrimary: '#232A2D',
    textSecondary: '#6F7A7E',
    textMuted: '#A1AAAD',
    primary: '#557A95',
    primaryLight: '#7495AD',
    success: '#5E8C70',
    warning: '#C29A45',
    danger: '#B55D55',
    info: '#557A95',
    jobPalette: ['#557A95', '#5E8C70', '#B55D55', '#C29A45', '#8873A6', '#C07D93', '#5F9A9A'],
};

// Lavender Dusk — muted plum on warm grey, soft and quiet
export const lavenderDuskTheme: ThemeColors = {
    background: '#F3F0F2',
    surface: '#FFFFFF',
    surfaceLight: '#E6E0E5',
    textPrimary: '#2A252D',
    textSecondary: '#7A7180',
    textMuted: '#A9A1AE',
    primary: '#866AA0',
    primaryLight: '#A089B6',
    success: '#62896A',
    warning: '#C3984A',
    danger: '#B35A63',
    info: '#5F7FA0',
    jobPalette: ['#866AA0', '#62896A', '#B35A63', '#C3984A', '#5F7FA0', '#C47C9C', '#6E9A93'],
};

// Evening Focus — Sunsama Focus after dark: warm charcoal, never pure black
export const eveningFocusTheme: ThemeColors = {
    background: '#1B1A17',
    surface: '#262420',
    surfaceLight: '#36332D',
    textPrimary: '#EDE9DF',
    textSecondary: '#ADA899',
    textMuted: '#7A766B',
    primary: '#8DB393',
    primaryLight: '#A7C7AC',
    success: '#86B886',
    warning: '#D9B064',
    danger: '#D98273',
    info: '#86AFBD',
    jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;
export const fontSize = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 } as const;

export type ThemeName = 'sunsamaFocus' | 'clayStudio' | 'harborMist' | 'lavenderDusk' | 'eveningFocus' | 'custom';

export const DEFAULT_THEME_NAME: Exclude<ThemeName, 'custom'> = 'sunsamaFocus';

export const builtInThemes: Record<Exclude<ThemeName, 'custom'>, ThemeColors> = {
    sunsamaFocus: sunsamaFocusTheme,
    clayStudio: clayStudioTheme,
    harborMist: harborMistTheme,
    lavenderDusk: lavenderDuskTheme,
    eveningFocus: eveningFocusTheme,
};

export const themeLabels: Record<ThemeName, string> = {
    sunsamaFocus: 'Sunsama Focus',
    clayStudio: 'Clay Studio',
    harborMist: 'Harbor Mist',
    lavenderDusk: 'Lavender Dusk',
    eveningFocus: 'Evening Focus',
    custom: 'My theme',
};

export const isThemeName = (value: string | null): value is ThemeName =>
    value === 'custom' || (value != null && value in builtInThemes);

export type FontScaleName = 'small' | 'medium' | 'large';
export const fontScaleValues: Record<FontScaleName, number> = { small: 0.9, medium: 1, large: 1.15 };