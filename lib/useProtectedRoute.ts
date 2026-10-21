import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from './auth-context';

export function useProtectedRoute() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        // "/" (app/index.tsx) is only the loading splash — never a destination.
        // At "/" useSegments() returns [] at runtime, though the typed tuple claims otherwise.
        const firstSegment: string | undefined = (segments as string[])[0];
        const atRoot = firstSegment === undefined || firstSegment === 'index';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && (inAuthGroup || atRoot)) {
            // Only bounce signed-in users off the login screens and the splash.
            // Every other route (tabs and modals like create-shift, edit-job,
            // settings screens) must stay reachable.
            router.replace('/(tabs)');
        }
    }, [user, isLoading, segments, router]);
}