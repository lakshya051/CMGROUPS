// Admin Logic

// Check Auth
export function checkAdminAuth() {
    const admin = JSON.parse(localStorage.getItem('adminUser'));
    if (!admin || admin.role !== 'admin') {
        window.location.href = 'login.html';
    }
    return admin;
}

export function logoutAdmin() {
    localStorage.removeItem('adminUser');
    window.location.href = 'login.html';
}

// Data Fetchers (Mock + LocalStorage)

export function getStats() {
    const orders = JSON.parse(localStorage.getItem('orders')) || []; // We might not have saved mock orders to LS yet properly in checkout?
    // In checkout step we cleared cart and redirected. We actually didn't save "orders" array in LS.
    // Let's fix that assumption: creating a getter that tries to find 'orders' or 'referrals' or 'bookings'.

    // We do have 'bookings' (Service Requests)
    const bookings = JSON.parse(localStorage.getItem('bookings')) || [];

    // We do have 'users'
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // Let's mock sales data since we didn't persist past orders in a central list (only user-specific logic was hinted)
    // To make this work, let's create a mock "All Orders" list stored in LS if it doesn't exist
    let allOrders = JSON.parse(localStorage.getItem('all_orders_admin')) || [
        { id: 'ORD-MOCK1', customer: 'John Doe', total: 125000, status: 'Delivered', date: '2023-10-01' },
        { id: 'ORD-MOCK2', customer: 'Jane Smith', total: 45000, status: 'Processing', date: '2023-11-15' }
    ];

    if (!localStorage.getItem('all_orders_admin')) {
        localStorage.setItem('all_orders_admin', JSON.stringify(allOrders));
    }

    const totalSales = allOrders.reduce((sum, o) => sum + o.total, 0);

    return {
        orders: allOrders,
        bookings: bookings,
        usersCount: users.length,
        totalSales: totalSales,
        pendingServices: bookings.filter(b => b.status === 'Pending').length
    };
}

export function updateServiceStatus(id, newStatus) {
    let bookings = JSON.parse(localStorage.getItem('bookings')) || [];
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
        bookings[index].status = newStatus;
        localStorage.setItem('bookings', JSON.stringify(bookings));
        return true;
    }
    return false;
}
