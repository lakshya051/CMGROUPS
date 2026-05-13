import { createContext, useContext } from 'react';

export const FeatureFlagsContext = createContext(null);

// Stable defaults so anything that reads outside the provider tree (tests,
// storybook, error boundaries) sees a sensible empty state instead of crashing.
export const DEFAULT_FEATURE_FLAGS = Object.freeze({
    bundlesEnabled: false,
});

export const useFeatureFlags = () => {
    const context = useContext(FeatureFlagsContext);
    if (context === null) {
        // Provider not mounted yet (very early render or unit tests).
        // Return safe defaults so calling code can keep rendering.
        return { flags: DEFAULT_FEATURE_FLAGS, loading: false, refresh: () => Promise.resolve() };
    }
    return context;
};
