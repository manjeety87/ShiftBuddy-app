import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type LoadMode = 'initial' | 'background' | 'pull';

export interface FetchState<T> {
    data: T | null;
    /** Nothing to show yet — first load, or the inputs (deps) changed. */
    isLoading: boolean;
    /** The user pulled to refresh — drives RefreshControl. */
    isRefreshing: boolean;
    error: string | null;
    /** Quiet refresh (e.g. on screen focus): keeps what's on screen, no spinners. */
    refetch: () => Promise<void>;
    /** Pull-to-refresh: same as refetch but shows the refresh spinner. */
    refresh: () => Promise<void>;
}

/**
 * Loads data for a screen. Only the newest request may update state, so a slow
 * response for last month can't overwrite this month's. A failed background
 * refresh keeps the data already on screen instead of replacing it with an error.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): FetchState<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const latestRequest = useRef(0);

    // Always call the latest fetcher without making it a dependency (inline arrows change every render)
    const fetcherRef = useRef(fetcher);
    useLayoutEffect(() => {
        fetcherRef.current = fetcher;
    });

    const load = useCallback(async (mode: LoadMode) => {
        const requestId = ++latestRequest.current;
        if (mode === 'pull') setIsRefreshing(true);
        if (mode === 'initial') setIsLoading(true);

        try {
            const result = await fetcherRef.current();
            if (requestId !== latestRequest.current) return;
            setData(result);
            setError(null);
        } catch (err: any) {
            if (requestId !== latestRequest.current) return;
            setError(err?.response?.data?.message || 'Couldn’t load this. Check your connection and try again.');
        } finally {
            if (requestId === latestRequest.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
        // `deps` is this hook's own input (like useEffect's), so it can't be a literal here
        // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
    }, deps);

    // New inputs → old data no longer applies
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting is the point: the inputs changed
        setData(null);
        load('initial');
    }, [load]);

    const refetch = useCallback(() => load('background'), [load]);
    const refresh = useCallback(() => load('pull'), [load]);

    return { data, isLoading, isRefreshing, error, refetch, refresh };
}
