import { useEffect, useState, useCallback, useMemo } from 'react';
import { featureFlagsAPI } from '../lib/api';
import { FeatureFlagsContext, DEFAULT_FEATURE_FLAGS } from './FeatureFlagsContext';

const STORAGE_KEY = 'featureFlags:v1';

const sanitize = (raw) => ({
    bundlesEnabled: Boolean(raw?.bundlesEnabled),
});

// Read the last-known flag set from localStorage so the very first paint
// already knows whether to draw the Bundles nav, BYOB section, etc. Without
// this, a user who has bundles enabled would see them flicker out for the
// ~200 ms it takes /api/feature-flags to respond on a cold load (and vice
// versa for a user who has them disabled). The stale value gets refreshed in
// the background on every mount, so it can never go more than one session
// out of date.
const readCachedFlags = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return sanitize(parsed);
    } catch {
        return null;
    }
};

export const FeatureFlagsProvider = ({ children, initialFlags }) => {
    // Order of preference for the initial value:
    //   1. `initialFlags` (e.g. when home-bootstrap embedded them in its payload),
    //   2. localStorage cache from a previous session,
    //   3. global defaults (everything OFF).
    const [flags, setFlags] = useState(() => {
        if (initialFlags) return sanitize(initialFlags);
        const cached = readCachedFlags();
        return cached || DEFAULT_FEATURE_FLAGS;
    });
    const [loading, setLoading] = useState(true);

    const persist = useCallback((next) => {
        const clean = sanitize(next);
        setFlags(clean);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        } catch { /* storage full / disabled → fine, in-memory state still updates */ }
    }, []);

    const refresh = useCallback(async () => {
        try {
            const fresh = await featureFlagsAPI.getPublic();
            persist(fresh);
        } catch (err) {
            console.error('[FeatureFlags] failed to load:', err);
        } finally {
            setLoading(false);
        }
    }, [persist]);

    useEffect(() => {
        // Always re-fetch on mount to catch admin toggles made on another device.
        let cancelled = false;
        (async () => {
            try {
                const fresh = await featureFlagsAPI.getPublic();
                if (!cancelled) persist(fresh);
            } catch (err) {
                if (!cancelled) console.error('[FeatureFlags] failed to load:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [persist]);

    // Refresh when the admin updates flags via the AdminSettings page in
    // another tab (or this same tab). The page dispatches a CustomEvent so
    // every consumer re-renders without forcing a full reload.
    useEffect(() => {
        const onUpdate = (event) => {
            if (event?.detail) {
                persist(event.detail);
            } else {
                refresh();
            }
        };
        window.addEventListener('cmgroups:feature-flags-updated', onUpdate);
        return () => window.removeEventListener('cmgroups:feature-flags-updated', onUpdate);
    }, [persist, refresh]);

    const value = useMemo(() => ({
        flags,
        bundlesEnabled: flags.bundlesEnabled,
        loading,
        refresh,
        // Used by AdminSettings after a successful PUT so all consumers update
        // immediately without round-tripping through the public endpoint.
        applyUpdate: (next) => {
            persist(next);
            window.dispatchEvent(new CustomEvent('cmgroups:feature-flags-updated', { detail: sanitize(next) }));
        },
    }), [flags, loading, refresh, persist]);

    return (
        <FeatureFlagsContext.Provider value={value}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};
