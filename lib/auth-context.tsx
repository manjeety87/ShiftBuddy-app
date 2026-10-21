import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEV_BYPASS_AUTH, MOCK_USER } from '../constants/devConfig';
import type { User } from '../interfaces/user.d';
import { restoreAccount } from './account';
import { appleLogin, getCurrentUser, googleLogin, loginUser, logoutUser, registerUser } from './auth';
import { onSessionExpired } from './authEvents';
import { getAccessToken, getCachedUser, saveCachedUser } from './storage';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    loginWithApple: (identityToken: string, fullName?: string) => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    /** Brings back an account waiting to be deleted and signs in (the token comes from a refused sign-in) */
    restore: (restoreToken: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: (updatedUser: User) => void;
    clearSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // The signed-in user, also kept on the device for the next launch (see restoreSession)
    const applyUser = (nextUser: User) => {
        setUser(nextUser);
        saveCachedUser(nextUser).catch(() => {});
    };

    useEffect(() => {
        const restoreSession = async () => {
            if (DEV_BYPASS_AUTH) {
                setUser(MOCK_USER as any);
                setIsLoading(false);
                return; // backend ko call hi nahi karega
            }

            try {
                const token = await getAccessToken();
                if (token) applyUser(await getCurrentUser());
            } catch (err: any) {
                // No response at all = no signal or the server is down, not a bad session.
                // Open the app with the profile we last saw instead of showing the login
                // screen; screens show their own "couldn't load" until the network is back.
                setUser(err?.response ? null : await getCachedUser());
            } finally {
                setIsLoading(false);
            }
        };
        restoreSession();

        const unsubscribe = onSessionExpired(() => setUser(null));
        return unsubscribe;
    }, []);


    const login = async (email: string, password: string) => {
        applyUser(await loginUser(email, password));
    };

    const register = async (name: string, email: string, password: string) => {
        applyUser(await registerUser(name, email, password));
    };

    const loginWithApple = async (identityToken: string, fullName?: string) => {
        applyUser(await appleLogin(identityToken, fullName));
    };

    const loginWithGoogle = async (idToken: string) => {
        applyUser(await googleLogin(idToken));
    };

    const restore = async (restoreToken: string) => {
        applyUser(await restoreAccount(restoreToken));
    };

    const logout = async () => {
        await logoutUser();
        setUser(null);
    };

    const clearSession = () => {
        setUser(null);
    };

    const refreshUser = applyUser;

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, clearSession, loginWithApple, loginWithGoogle, restore, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook — har screen isi se auth data access karegi
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
