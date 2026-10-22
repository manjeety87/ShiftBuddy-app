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

/** Every theme is an accent with a light and a dark side; Auto follows the phone. */
export interface ThemeFamily {
    light: ThemeColors;
    dark: ThemeColors;
}

// The same sixteen themes as the web app (ShiftBuddy-Web/src/app/globals.css), in
// three collections. Every one follows the Sunsama recipe: a warm off-white (or
// warm charcoal) page, plain cards, soft borders, one muted accent. The four
// originals keep this app's own light colours; everything else is the web's.
// Evening Focus is gone as a theme: it is Sunsama Focus after dark.

export const THEMES = [
    { name: 'sunsamaFocus', label: 'Sunsama Focus', note: 'Sage green on warm paper', collection: 'original' },
    { name: 'clayStudio', label: 'Clay Studio', note: 'Terracotta on cream', collection: 'original' },
    { name: 'harborMist', label: 'Harbor Mist', note: 'Dusty blue on soft stone', collection: 'original' },
    { name: 'lavenderDusk', label: 'Lavender Dusk', note: 'Muted plum on warm grey', collection: 'original' },
    { name: 'cupertinoBlue', label: 'Cupertino Blue', note: 'System blue on cool grey', collection: 'apple' },
    { name: 'titaniumGraphite', label: 'Titanium Graphite', note: 'Graphite on light stone', collection: 'apple' },
    { name: 'sageAtelier', label: 'Sage Atelier', note: 'Botanical green on mist', collection: 'apple' },
    { name: 'pacificTeal', label: 'Pacific Teal', note: 'Deep teal on sea-glass white', collection: 'apple' },
    { name: 'midnightIndigo', label: 'Midnight Indigo', note: 'Rich indigo on soft lilac grey', collection: 'apple' },
    { name: 'champagneSand', label: 'Champagne Sand', note: 'Warm gold-brown on ivory', collection: 'apple' },
    { name: 'obsidianSilver', label: 'Obsidian & Silver', note: 'Near-black and silver', collection: 'elegant' },
    { name: 'deepForest', label: 'Deep Forest', note: 'Forest green on pale sage', collection: 'elegant' },
    { name: 'nocturnePlum', label: 'Nocturne Plum', note: 'Muted plum on blush white', collection: 'elegant' },
    { name: 'oxfordNavy', label: 'Oxford Navy', note: 'Navy on cool paper', collection: 'elegant' },
    { name: 'espressoBronze', label: 'Espresso Bronze', note: 'Bronze on warm linen', collection: 'elegant' },
    { name: 'slateIce', label: 'Slate & Ice', note: 'Slate teal on icy grey', collection: 'elegant' },
] as const;

/** The picker's groups, in order */
export const COLLECTIONS = [
    { id: 'original', label: 'Original' },
    { id: 'apple', label: 'Apple-inspired' },
    { id: 'elegant', label: 'Elegant' },
] as const;

export type BuiltInThemeName = (typeof THEMES)[number]['name'];
export type ThemeName = BuiltInThemeName | 'custom';

export const themeFamilies: Record<BuiltInThemeName, ThemeFamily> = {
    // Sunsama Focus — Sage green on warm paper
    sunsamaFocus: {
        light: {
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
        },
        dark: {
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
        },
    },
    // Clay Studio — Terracotta on cream
    clayStudio: {
        light: {
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
        },
        dark: {
            background: '#1D1917',
            surface: '#292320',
            surfaceLight: '#39312C',
            textPrimary: '#EFE7DF',
            textSecondary: '#B3A699',
            textMuted: '#80746A',
            primary: '#D08E72',
            primaryLight: '#DFA88F',
            success: '#93B883',
            warning: '#D9AE62',
            danger: '#DD8370',
            info: '#88ADBD',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Harbor Mist — Dusty blue on soft stone
    harborMist: {
        light: {
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
        },
        dark: {
            background: '#171A1C',
            surface: '#212628',
            surfaceLight: '#2F3639',
            textPrimary: '#E4E9EA',
            textSecondary: '#A0ABAF',
            textMuted: '#6E797D',
            primary: '#86ABC6',
            primaryLight: '#A2C0D6',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Lavender Dusk — Muted plum on warm grey
    lavenderDusk: {
        light: {
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
        },
        dark: {
            background: '#1B181D',
            surface: '#262229',
            surfaceLight: '#353038',
            textPrimary: '#EBE5EE',
            textSecondary: '#ADA3B3',
            textMuted: '#7A7180',
            primary: '#B49ACB',
            primaryLight: '#C7B2DA',
            success: '#8CB894',
            warning: '#D8B06A',
            danger: '#DC8690',
            info: '#8FABC8',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Cupertino Blue — System blue on cool grey
    cupertinoBlue: {
        light: {
            background: '#F5F5F7',
            surface: '#FFFFFF',
            surfaceLight: '#E5E5E7',
            textPrimary: '#1F1F1F',
            textSecondary: '#6A6A6B',
            textMuted: '#8A8A8B',
            primary: '#006CDC',
            primaryLight: '#1A7BE0',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0B0C10',
            surface: '#1C1C1E',
            surfaceLight: '#2E2E30',
            textPrimary: '#E8E8E8',
            textSecondary: '#9B9B9C',
            textMuted: '#666669',
            primary: '#409CFF',
            primaryLight: '#66B0FF',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Titanium Graphite — Graphite on light stone
    titaniumGraphite: {
        light: {
            background: '#F4F4F2',
            surface: '#FFFFFF',
            surfaceLight: '#E4E4E2',
            textPrimary: '#1E1E1E',
            textSecondary: '#696968',
            textMuted: '#898988',
            primary: '#515C6B',
            primaryLight: '#626C7A',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#101113',
            surface: '#202124',
            surfaceLight: '#323336',
            textPrimary: '#E8E8E8',
            textSecondary: '#9F9FA0',
            textMuted: '#69696A',
            primary: '#AAB5C3',
            primaryLight: '#BBC4CF',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Sage Atelier — Botanical green on mist
    sageAtelier: {
        light: {
            background: '#F5F7F3',
            surface: '#FFFFFF',
            surfaceLight: '#E5E7E3',
            textPrimary: '#1E1F1E',
            textSecondary: '#696B69',
            textMuted: '#8A8B88',
            primary: '#447965',
            primaryLight: '#578674',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#101714',
            surface: '#1B2721',
            surfaceLight: '#2D3833',
            textPrimary: '#E8E9E8',
            textSecondary: '#9FA2A0',
            textMuted: '#696D6B',
            primary: '#80BFA2',
            primaryLight: '#99CCB5',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Pacific Teal — Deep teal on sea-glass white
    pacificTeal: {
        light: {
            background: '#F3F8F8',
            surface: '#FFFFFF',
            surfaceLight: '#E3E8E8',
            textPrimary: '#1E1F1F',
            textSecondary: '#696B6B',
            textMuted: '#888C8C',
            primary: '#087E86',
            primaryLight: '#218B92',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0C1619',
            surface: '#19282C',
            surfaceLight: '#2C393D',
            textPrimary: '#E7E9E9',
            textSecondary: '#9DA1A2',
            textMuted: '#666D6E',
            primary: '#53C6C9',
            primaryLight: '#75D1D4',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Midnight Indigo — Rich indigo on soft lilac grey
    midnightIndigo: {
        light: {
            background: '#F5F5FA',
            surface: '#FFFFFF',
            surfaceLight: '#E5E5EA',
            textPrimary: '#1F1F20',
            textSecondary: '#6A6A6C',
            textMuted: '#8A8A8D',
            primary: '#5056B8',
            primaryLight: '#6267BF',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0F1020',
            surface: '#1D2035',
            surfaceLight: '#2F3245',
            textPrimary: '#E8E8EA',
            textSecondary: '#9E9FA5',
            textMuted: '#686973',
            primary: '#A0A7FF',
            primaryLight: '#B3B9FF',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Champagne Sand — Warm gold-brown on ivory
    champagneSand: {
        light: {
            background: '#F9F7F2',
            surface: '#FFFFFF',
            surfaceLight: '#E9E7E2',
            textPrimary: '#1F1F1D',
            textSecondary: '#6B6B68',
            textMuted: '#8E8D8A',
            primary: '#8E6B41',
            primaryLight: '#997A54',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#171511',
            surface: '#29251F',
            surfaceLight: '#3A3731',
            textPrimary: '#E9E8E8',
            textSecondary: '#A2A09F',
            textMuted: '#6D6C69',
            primary: '#D8B987',
            primaryLight: '#E0C79F',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Obsidian & Silver — Near-black and silver
    obsidianSilver: {
        light: {
            background: '#F5F5F4',
            surface: '#FFFFFF',
            surfaceLight: '#E5E5E4',
            textPrimary: '#1F1F1E',
            textSecondary: '#6A6A69',
            textMuted: '#8A8A89',
            primary: '#424A54',
            primaryLight: '#555C65',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0D0F12',
            surface: '#1D2025',
            surfaceLight: '#2F3237',
            textPrimary: '#E8E8E8',
            textSecondary: '#9E9E9F',
            textMuted: '#67686A',
            primary: '#BCC5D1',
            primaryLight: '#C9D1DA',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Deep Forest — Forest green on pale sage
    deepForest: {
        light: {
            background: '#F5F7F3',
            surface: '#FFFFFF',
            surfaceLight: '#E5E7E3',
            textPrimary: '#1E1F1E',
            textSecondary: '#696B69',
            textMuted: '#8A8B88',
            primary: '#285E4D',
            primaryLight: '#3E6E5F',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0C1512',
            surface: '#1A2822',
            surfaceLight: '#2C3934',
            textPrimary: '#E7E8E8',
            textSecondary: '#9DA09F',
            textMuted: '#666C6A',
            primary: '#86C6A5',
            primaryLight: '#9ED1B7',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Nocturne Plum — Muted plum on blush white
    nocturnePlum: {
        light: {
            background: '#F8F5F8',
            surface: '#FFFFFF',
            surfaceLight: '#E8E5E8',
            textPrimary: '#1F1E1F',
            textSecondary: '#6B696B',
            textMuted: '#8C8A8C',
            primary: '#76516D',
            primaryLight: '#84627C',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#141016',
            surface: '#28202B',
            surfaceLight: '#39323C',
            textPrimary: '#E8E8E9',
            textSecondary: '#A09FA1',
            textMuted: '#6B696D',
            primary: '#D4A7CA',
            primaryLight: '#DDB9D5',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Oxford Navy — Navy on cool paper
    oxfordNavy: {
        light: {
            background: '#F4F6F8',
            surface: '#FFFFFF',
            surfaceLight: '#E4E6E8',
            textPrimary: '#1E1F1F',
            textSecondary: '#696A6B',
            textMuted: '#898B8C',
            primary: '#365C80',
            primaryLight: '#4A6C8D',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0D1520',
            surface: '#1A2837',
            surfaceLight: '#2C3947',
            textPrimary: '#E7E9EA',
            textSecondary: '#9DA1A5',
            textMuted: '#666C73',
            primary: '#91B8DC',
            primaryLight: '#A7C6E3',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Espresso Bronze — Bronze on warm linen
    espressoBronze: {
        light: {
            background: '#F9F6F1',
            surface: '#FFFFFF',
            surfaceLight: '#E9E6E1',
            textPrimary: '#1F1E1D',
            textSecondary: '#6B6A67',
            textMuted: '#8E8C89',
            primary: '#866448',
            primaryLight: '#92745A',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#17130F',
            surface: '#2B241D',
            surfaceLight: '#3C362F',
            textPrimary: '#E9E8E8',
            textSecondary: '#A2A09E',
            textMuted: '#6D6A68',
            primary: '#D7B18B',
            primaryLight: '#DFC1A2',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
    // Slate & Ice — Slate teal on icy grey
    slateIce: {
        light: {
            background: '#F4F7F8',
            surface: '#FFFFFF',
            surfaceLight: '#E4E7E8',
            textPrimary: '#1E1F1F',
            textSecondary: '#696B6B',
            textMuted: '#898B8C',
            primary: '#397785',
            primaryLight: '#4D8591',
            success: '#4A775C',
            warning: '#C29A45',
            danger: '#A75149',
            info: '#4D728C',
            jobPalette: ['#6B8F71', '#B85C4E', '#C99A3A', '#5B8A9A', '#9B7EBD', '#C77B8E', '#7A9E7E'],
        },
        dark: {
            background: '#0C151B',
            surface: '#1C2A32',
            surfaceLight: '#2E3B43',
            textPrimary: '#E8E9EA',
            textSecondary: '#9DA1A4',
            textMuted: '#666C70',
            primary: '#8BCBD5',
            primaryLight: '#A2D5DD',
            success: '#88B89A',
            warning: '#D6B166',
            danger: '#DB8880',
            info: '#86ABC6',
            jobPalette: ['#8DB393', '#D98273', '#D9B064', '#86AFBD', '#B39AD1', '#D69AAD', '#A3BE8C'],
        },
    },
};

/** "system" follows the phone: light by day, dark when the phone goes dark. */
export const MODES = [
    { value: 'system', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
] as const;
export type ThemeMode = (typeof MODES)[number]['value'];
export type ResolvedMode = 'light' | 'dark';

export const DEFAULT_THEME_NAME: BuiltInThemeName = 'sunsamaFocus';
export const DEFAULT_MODE: ThemeMode = 'system';
/** Saved by versions before modes: it means Sunsama Focus, dark */
export const LEGACY_DARK_THEME = 'eveningFocus';

export const themeLabels: Record<ThemeName, string> = {
    ...(Object.fromEntries(THEMES.map((theme) => [theme.name, theme.label])) as Record<BuiltInThemeName, string>),
    custom: 'My theme',
};

export const isThemeName = (value: string | null): value is ThemeName =>
    value === 'custom' || THEMES.some((theme) => theme.name === value);
export const isThemeMode = (value: string | null): value is ThemeMode => MODES.some((mode) => mode.value === value);

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 } as const;
export const fontSize = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 } as const;

export type FontScaleName = 'small' | 'medium' | 'large';
export const fontScaleValues: Record<FontScaleName, number> = { small: 0.9, medium: 1, large: 1.15 };
