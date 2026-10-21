import { useState, type Ref } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { fontSize, radius } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

interface ThemedInputProps extends TextInputProps {
    ref?: Ref<TextInput>;
}

/**
 * The app's text field: follows the theme and the user's text size, and shows
 * which field is active with an accent border (so it's clear where typing goes).
 */
export function ThemedInput({ style, multiline, onFocus, onBlur, ref, ...props }: ThemedInputProps) {
    const { colors, fontScale } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            multiline={multiline}
            onFocus={(event) => {
                setIsFocused(true);
                onFocus?.(event);
            }}
            onBlur={(event) => {
                setIsFocused(false);
                onBlur?.(event);
            }}
            style={[
                {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: isFocused ? colors.primary : 'transparent',
                    paddingHorizontal: 16,
                    fontSize: fontSize.base * fontScale,
                },
                multiline ? { minHeight: 96, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' } : { height: 48 },
                style,
            ]}
            {...props}
        />
    );
}
