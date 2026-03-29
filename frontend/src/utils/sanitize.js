/**
 * Validates a link for safe in-app navigation.
 * Rejects protocol-relative, external, and javascript: URLs.
 * Returns the sanitized path or null if unsafe.
 */
export function toSafeInternalPath(link) {
    if (typeof link !== 'string') return null;
    const p = link.trim();
    if (!p || p.startsWith('//')) return null;
    if (/^(https?:|javascript:|data:|vbscript:)/i.test(p)) return null;
    if (!p.startsWith('/')) return null;
    return p;
}
