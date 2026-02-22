// Loyalty System Logic

const LOYALTY_RATE = 0.01; // Earn 1 point per 1 unit currency (actually 1 per 100 is 1%, let's say 1 point per 1000 Rs spent -> 0.001?
// Prompt said: "earn X points per ₹100 spent". Let's say 1 point per ₹100.
const POINTS_PER_RUPEE = 0.01; // 100 Rs = 1 Point

export function calculatePoints(amount) {
    return Math.floor(amount * POINTS_PER_RUPEE);
}

export function getUserPoints(user) {
    return user.points || 0;
}

export function getTier(points) {
    if (points >= 5000) return { name: 'Platinum', color: '#e5e4e2', icon: '👑' };
    if (points >= 2000) return { name: 'Gold', color: '#ffd700', icon: '🥇' };
    return { name: 'Silver', color: '#c0c0c0', icon: '🥈' };
}

export function addPoints(userId, amount, description) {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === userId || u.email === userId); // Handle various ID types

    if (userIndex !== -1) {
        const points = calculatePoints(amount);
        if (!users[userIndex].points) users[userIndex].points = 0;

        users[userIndex].points += points;

        // Add History
        if (!users[userIndex].pointHistory) users[userIndex].pointHistory = [];
        users[userIndex].pointHistory.push({
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            type: 'Credit',
            amount: points,
            description: description || 'Purchase Reward'
        });

        localStorage.setItem('users', JSON.stringify(users));

        // Update Current User Session if it matches
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && (currentUser.id === users[userIndex].id || currentUser.email === users[userIndex].email)) {
            currentUser.points = users[userIndex].points;
            currentUser.pointHistory = users[userIndex].pointHistory;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        return points;
    }
    return 0;
}

export function redeemPoints(userId, pointsToRedeem) {
    // Mock redemption logic
    // In real app, this would reduce points and return a coupon code
    return true;
}
