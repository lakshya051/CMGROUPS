import { useEffect } from 'react';

// Data seeding is now handled by the backend seed.js script.
// This hook is kept as a no-op for backward compatibility.
export const useDataSeeder = () => {
    useEffect(() => {
        // Backend database is now the source of truth.
        // No localStorage seeding needed.
    }, []);
};
