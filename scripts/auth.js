// Authentication Logic

const API_Base = ''; // In a real app, this would be your backend URL

// --- Mock Database (LocalStorage) ---
function getUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
}

function saveUser(user) {
    const users = getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
}

function findUser(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

function setCurrentUser(user) {
    // Remove sensitive data
    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem('currentUser', JSON.stringify(safeUser));
    updateHeaderAuth();
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    window.location.href = '/pages/login.html';
}

// --- Logic ---

function generateReferralCode(name) {
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const cleanName = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    return `${cleanName}${randomStr}`;
}

async function register(name, email, phone, password) {
    // 1. Validate
    if (findUser(email)) {
        throw new Error('User already exists with this email.');
    }

    // 2. Create User Object
    const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        password, // In real app, hash this!
        referralCode: generateReferralCode(name),
        points: 0,
        role: 'customer',
        createdAt: new Date().toISOString()
    };

    // 3. Save
    saveUser(newUser);

    // 4. Login
    setCurrentUser(newUser);
    return newUser;
}

async function login(email, password) {
    const user = findUser(email);
    if (!user || user.password !== password) {
        throw new Error('Invalid email or password.');
    }
    setCurrentUser(user);
    return user;
}

// --- UI Updates ---
function updateHeaderAuth() {
    const user = getCurrentUser();
    const headers = document.querySelectorAll('.header-actions'); // Select likely container

    // This function might run before header is loaded, so we retry or use event delegation if needed.
    // Ideally header.js should call this on load.
}

// Export functions for use in pages
window.auth = {
    register,
    login,
    logout: logoutUser,
    getCurrentUser
};
