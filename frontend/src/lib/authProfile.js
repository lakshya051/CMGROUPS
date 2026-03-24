/** True when the signed-in app user must add a mobile number before using the site. */
export function needsPhoneCapture(user) {
    if (!user || user.role === 'admin') return false;
    return !String(user.phone || '').trim();
}
