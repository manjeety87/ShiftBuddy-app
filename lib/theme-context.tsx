import { keyValueStore } from './keyValueStore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { isDarkColor, readableTextOn } from './color';
import { buildCustomTheme, parseCustomTheme, type CustomTheme } from './customTheme';
import {
    themeFamilies,
    fontScaleValues,
    DEFAULT_MODE,
    DEFAULT_THEME_NAME,
    isThemeMode,
    isThemeName,
    LEGACY_DARK_THEME,
    type FontScaleName,
    type ResolvedMode,
    type ResolvedThemeColors,
    type ThemeColors,
    type ThemeMode,
    type ThemeName,
} from '../constants/themes';

const THEME_KEY = 'shiftbuddy_theme_name';
const MODE_KEY = 'shiftbuddy_theme_mode';
const CUSTOM_COLORS_KEY = 'shiftbuddy_custom_colors';
const FONT_SCALE_KEY = 'shiftbuddy_font_scale';

/** A look: the theme, light/dark (or follow the phone) and the text size. */
export interface Look {
    themeName: ThemeName;
    mode: ThemeMode;
    fontScaleName: FontScaleName;
}

interface ThemeContextType {
    /** What is on screen — the preview while there is one */
    themeName: ThemeName;
    /** The light/dark choice on screen: "system", "light" or "dark" */
    mode: ThemeMode;
    /** What is showing now: "light" or "dark" */
    resolvedMode: ResolvedMode;
    colors: ResolvedThemeColors;
    fontScale: number;
    fontScaleName: FontScaleName;
    /** True while a pick is on screen but not saved */
    isPreviewing: boolean;
    /** Their own colours (both sides), or null before they make a theme */
    customTheme: CustomTheme | null;
    /** Show a theme, mode or text size across the app without saving it */
    previewLook: (change: Partial<Look>) => void;
    /** Keep what is being previewed */
    savePreview: () => void;
    /** Back to the saved look */
    discardPreview: () => void;
    /** Save their own colours and switch to them (keeps the mode and text size on screen) */
    saveCustomTheme: (theme: CustomTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FONT_SCALE_NAMES = Object.keys(fontScaleValues) as FontScaleName[];
const isFontScaleName = (value: string | null): value is FontScaleName => FONT_SCALE_NAMES.includes(value as FontScaleName);

const resolveColors = (theme: ThemeColors): ResolvedThemeColors => ({
    ...theme,
    onPrimary: readableTextOn(theme.primary),
    isDark: isDarkColor(theme.background),
});

/** One side of a theme: a built-in one, or their own */
export const themeColorsFor = (name: ThemeName, side: ResolvedMode, custom: CustomTheme | null): ThemeColors =>
    name === 'custom' ? buildCustomTheme(custom ?? parseCustomTheme(null), side) : themeFamilies[name][side];

const DEFAULT_LOOK: Look = { themeName: DEFAULT_THEME_NAME, mode: DEFAULT_MODE, fontScaleName: 'medium' };

const parseJson = (raw: string | null): unknown => {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * The app's look. Two layers: what is saved, and a preview. Picking in
 * Appearance only previews — the whole app shows it, nothing is stored — until
 * Save; Cancel, or leaving the screen, puts the saved look back. Auto follows
 * the phone's light/dark setting as it changes.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const deviceScheme = useColorScheme();
    const [saved, setSaved] = useState<Look>(DEFAULT_LOOK);
    const [preview, setPreview] = useState<Look | null>(null);
    const [customTheme, setCustomTheme] = useState<CustomTheme | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Saved preferences, once at launch
    useEffect(() => {
        const load = async () => {
            try {
                const [savedTheme, savedMode, savedCustom, savedFontScale] = await Promise.all([
                    keyValueStore.getItem(THEME_KEY),
                    keyValueStore.getItem(MODE_KEY),
                    keyValueStore.getItem(CUSTOM_COLORS_KEY),
                    keyValueStore.getItem(FONT_SCALE_KEY),
                ]);
                // Evening Focus (before modes) was Sunsama Focus after dark
                const wasEvening = savedTheme === LEGACY_DARK_THEME;
                setSaved({
                    themeName: wasEvening ? DEFAULT_THEME_NAME : isThemeName(savedTheme) ? savedTheme : DEFAULT_THEME_NAME,
                    mode: isThemeMode(savedMode) ? savedMode : wasEvening ? 'dark' : DEFAULT_MODE,
                    fontScaleName: isFontScaleName(savedFontScale) ? savedFontScale : 'medium',
                });
                const custom = parseJson(savedCustom);
                setCustomTheme(custom ? parseCustomTheme(custom) : null);
            } finally {
                setIsLoaded(true);
            }
        };
        load();
    }, []);

    const value = useMemo<ThemeContextType>(() => {
        const shown = preview ?? saved;
        const store = (look: Look) => {
            setSaved(look);
            setPreview(null);
            keyValueStore.setItem(THEME_KEY, look.themeName);
            keyValueStore.setItem(MODE_KEY, look.mode);
            keyValueStore.setItem(FONT_SCALE_KEY, look.fontScaleName);
        };
        const look = isLoaded ? shown : DEFAULT_LOOK;
        const resolvedMode: ResolvedMode = look.mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : look.mode;
        return {
            themeName: look.themeName,
            mode: look.mode,
            resolvedMode,
            // Until preferences load, the default family — so a wrong theme never flashes for a frame
            colors: resolveColors(themeColorsFor(look.themeName, resolvedMode, customTheme)),
            fontScale: fontScaleValues[look.fontScaleName],
            fontScaleName: look.fontScaleName,
            isPreviewing: preview !== null,
            customTheme,
            previewLook: (change) => {
                const next = { ...shown, ...change };
                const isSaved = next.themeName === saved.themeName && next.mode === saved.mode && next.fontScaleName === saved.fontScaleName;
                setPreview(isSaved ? null : next);
            },
            savePreview: () => {
                if (preview) store(preview);
            },
            discardPreview: () => setPreview(null),
            saveCustomTheme: (theme) => {
                setCustomTheme(theme);
                keyValueStore.setItem(CUSTOM_COLORS_KEY, JSON.stringify(theme));
                store({ ...shown, themeName: 'custom' });
            },
        };
    }, [isLoaded, saved, preview, customTheme, deviceScheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Draws its children in other colours — the theme maker's made-up Home. Everything
 * inside reads `useTheme()` as usual, so the preview is built from the real components.
 */
export const ThemePreview = ({ theme, children }: { theme: ThemeColors; children: ReactNode }) => {
    const outer = useTheme();
    const value = useMemo(() => ({ ...outer, colors: resolveColors(theme) }), [outer, theme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
