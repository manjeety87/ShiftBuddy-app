import { keyValueStore } from './keyValueStore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isDarkColor, readableTextOn } from './color';
import { buildCustomTheme, type CustomColors } from './customTheme';
import {
    builtInThemes,
    fontScaleValues,
    DEFAULT_THEME_NAME,
    isThemeName,
    type FontScaleName,
    type ResolvedThemeColors,
    type ThemeColors,
    type ThemeName,
} from '../constants/themes';

const THEME_KEY = 'shiftbuddy_theme_name';
const CUSTOM_COLORS_KEY = 'shiftbuddy_custom_colors';
const FONT_SCALE_KEY = 'shiftbuddy_font_scale';

/** A look: the theme and the text size. */
export interface Look {
    themeName: ThemeName;
    fontScaleName: FontScaleName;
}

interface ThemeContextType {
    /** What is on screen — the preview while there is one */
    themeName: ThemeName;
    colors: ResolvedThemeColors;
    fontScale: number;
    fontScaleName: FontScaleName;
    /** True while a pick is on screen but not saved */
    isPreviewing: boolean;
    /** Their own colours, or null before they make a theme */
    customColors: CustomColors | null;
    /** Show a theme or text size across the app without saving it */
    previewLook: (change: Partial<Look>) => void;
    /** Keep what is being previewed */
    savePreview: () => void;
    /** Back to the saved look */
    discardPreview: () => void;
    /** Save their own colours and switch to them (keeps the text size on screen) */
    saveCustomTheme: (colors: CustomColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FONT_SCALE_NAMES = Object.keys(fontScaleValues) as FontScaleName[];
const isFontScaleName = (value: string | null): value is FontScaleName => FONT_SCALE_NAMES.includes(value as FontScaleName);

const resolveColors = (theme: ThemeColors): ResolvedThemeColors => ({
    ...theme,
    onPrimary: readableTextOn(theme.primary),
    isDark: isDarkColor(theme.background),
});

const themeFor = (name: ThemeName, custom: CustomColors | null) => (name === 'custom' ? buildCustomTheme(custom) : builtInThemes[name]);

const defaultColors = resolveColors(builtInThemes[DEFAULT_THEME_NAME]);
const DEFAULT_LOOK: Look = { themeName: DEFAULT_THEME_NAME, fontScaleName: 'medium' };

const parseCustom = (raw: string | null): CustomColors | null => {
    if (!raw) return null;
    try {
        const saved = JSON.parse(raw);
        return saved && typeof saved === 'object' ? (saved as CustomColors) : null;
    } catch {
        return null;
    }
};

/**
 * The app's look. Two layers: what is saved, and a preview. Picking in
 * Appearance only previews — the whole app shows it, nothing is stored — until
 * Save; Cancel, or leaving the screen, puts the saved look back.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [saved, setSaved] = useState<Look>(DEFAULT_LOOK);
    const [preview, setPreview] = useState<Look | null>(null);
    const [customColors, setCustomColors] = useState<CustomColors | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Saved preferences, once at launch
    useEffect(() => {
        const load = async () => {
            try {
                const [savedTheme, savedCustom, savedFontScale] = await Promise.all([
                    keyValueStore.getItem(THEME_KEY),
                    keyValueStore.getItem(CUSTOM_COLORS_KEY),
                    keyValueStore.getItem(FONT_SCALE_KEY),
                ]);
                // A theme that no longer exists (renamed/removed) falls back to the default
                setSaved({ themeName: isThemeName(savedTheme) ? savedTheme : DEFAULT_THEME_NAME, fontScaleName: isFontScaleName(savedFontScale) ? savedFontScale : 'medium' });
                setCustomColors(parseCustom(savedCustom));
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
            keyValueStore.setItem(FONT_SCALE_KEY, look.fontScaleName);
        };
        const look = isLoaded ? shown : DEFAULT_LOOK;
        return {
            themeName: look.themeName,
            // Until preferences load, the default — so a wrong theme never flashes for a frame
            colors: isLoaded ? resolveColors(themeFor(look.themeName, customColors)) : defaultColors,
            fontScale: fontScaleValues[look.fontScaleName],
            fontScaleName: look.fontScaleName,
            isPreviewing: preview !== null,
            customColors,
            previewLook: (change) => {
                const next = { ...shown, ...change };
                setPreview(next.themeName === saved.themeName && next.fontScaleName === saved.fontScaleName ? null : next);
            },
            savePreview: () => {
                if (preview) store(preview);
            },
            discardPreview: () => setPreview(null),
            saveCustomTheme: (colors) => {
                setCustomColors(colors);
                keyValueStore.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
                store({ themeName: 'custom', fontScaleName: shown.fontScaleName });
            },
        };
    }, [isLoaded, saved, preview, customColors]);

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
