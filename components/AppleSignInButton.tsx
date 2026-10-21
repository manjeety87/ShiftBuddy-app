import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../lib/auth-context';
import { PressableScale } from './ui/PressableScale';
import { showAlert } from '../lib/dialog';

/** Apple logo glyph (24×24). */
function AppleLogo({ size = 17, color = '#000' }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                fill={color}
                d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"
            />
        </Svg>
    );
}

/**
 * "Sign in with Apple", drawn in JS instead of the native
 * AppleAuthenticationButton view. The native view isn't registered in every
 * Expo Go build ("Unimplemented component <ViewManagerAdapter_…>"), while
 * signInAsync() is — so this works in Expo Go and in development builds.
 * Styled per Apple's HIG for custom buttons (white style, logo + approved title)
 * and sized to sit beside the Google button.
 */
export function AppleSignInButton() {
    const { loginWithApple } = useAuth();
    const [isAvailable, setIsAvailable] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;
        AppleAuthentication.isAvailableAsync()
            .then(setIsAvailable)
            .catch(() => setIsAvailable(false));
    }, []);

    if (!isAvailable) return null;

    const handlePress = async () => {
        setIsSigningIn(true);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) throw new Error('No identity token received from Apple');

            const fullName = credential.fullName?.givenName
                ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
                : undefined;

            await loginWithApple(credential.identityToken, fullName);
        } catch (err: any) {
            if (err.code === 'ERR_REQUEST_CANCELED') return;
            const message = err?.response?.data?.message || 'Apple sign-in failed. Please try again.';
            showAlert('Error', message);
        } finally {
            setIsSigningIn(false);
        }
    };

    return (
        <PressableScale
            onPress={handlePress}
            disabled={isSigningIn}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Apple"
            style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: isSigningIn ? 0.6 : 1 }}
        >
            <AppleLogo />
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                Sign in with Apple
            </Text>
        </PressableScale>
    );
}
