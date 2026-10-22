import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { PressableScale } from './ui/PressableScale';
import { pendingDeletionOf } from '../lib/account';
import { showAlert } from '../lib/dialog';
import { offerRestore } from '../lib/restorePrompt';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const GOOGLE_CLIENT_ID = '544366245378-dh17l8il2edi24ug1qt6oo7nuitkcg8n.apps.googleusercontent.com';

export function GoogleSignInButton() {
    const { loginWithGoogle, restore } = useAuth();

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: GOOGLE_CLIENT_ID,
            scopes: ['openid', 'profile', 'email'],
            redirectUri: AuthSession.makeRedirectUri({ scheme: 'shiftbuddy' }),
            responseType: AuthSession.ResponseType.IdToken,
            usePKCE: false,
        },
        discovery
    );

    useEffect(() => {
        const handleResponse = async () => {
            if (response?.type === 'success' && response.params.id_token) {
                try {
                    await loginWithGoogle(response.params.id_token);
                } catch (err: any) {
                    const pending = pendingDeletionOf(err);
                    if (pending) return offerRestore(pending, restore);
                    const message = err?.response?.data?.message || 'Google sign-in failed. Please try again.';
                    showAlert('Error', message);
                }
            }
        };
        handleResponse();
    }, [response, loginWithGoogle, restore]);

    return (
        <PressableScale
            onPress={() => promptAsync()}
            disabled={!request}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={{ flex: 1, height: 46, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: !request ? 0.6 : 1 }}
        >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#4285F4' }}>G</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Google</Text>
        </PressableScale>
    );
}