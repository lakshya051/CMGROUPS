// Service Booking Logic

export function bookService(userId, serviceType, details, date) {
    let bookings = JSON.parse(localStorage.getItem('bookings')) || [];

    const newBooking = {
        id: 'SRV-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        userId,
        serviceType,
        details,
        date,
        status: 'Pending', // Pending, In Progress, Completed, Cancelled
        createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    localStorage.setItem('bookings', JSON.stringify(bookings));

    return { success: true, bookingId: newBooking.id };
}

export function getUserBookings(userId) {
    const bookings = JSON.parse(localStorage.getItem('bookings')) || [];
    return bookings.filter(b => b.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function cancelBooking(bookingId) {
    let bookings = JSON.parse(localStorage.getItem('bookings')) || [];
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
        bookings[index].status = 'Cancelled';
        localStorage.setItem('bookings', JSON.stringify(bookings));
        return true;
    }
    return false;
}
