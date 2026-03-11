import { useEffect } from 'react';

/**
 * Sets document title and meta description per page.
 * @param {{ title: string, description?: string, noIndex?: boolean }} opts
 */
export function useSEO({ title, description, noIndex = false }) {
    useEffect(() => {
        document.title = title;

        let descTag = document.querySelector('meta[name="description"]');
        if (description) {
            if (!descTag) {
                descTag = document.createElement('meta');
                descTag.setAttribute('name', 'description');
                document.head.appendChild(descTag);
            }
            descTag.setAttribute('content', description);
        }

        let robotsTag = document.querySelector('meta[name="robots"]');
        if (noIndex) {
            if (!robotsTag) {
                robotsTag = document.createElement('meta');
                robotsTag.setAttribute('name', 'robots');
                document.head.appendChild(robotsTag);
            }
            robotsTag.setAttribute('content', 'noindex, nofollow');
        } else if (robotsTag) {
            robotsTag.remove();
        }

        return () => {
            if (noIndex && robotsTag && robotsTag.parentNode) {
                robotsTag.remove();
            }
        };
    }, [title, description, noIndex]);
}
