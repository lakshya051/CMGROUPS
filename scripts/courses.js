// Courses Logic

import { addPoints } from './loyalty.js';

export function enrollCourse(userId, courseId) {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
        if (!users[userIndex].enrolledCourses) users[userIndex].enrolledCourses = [];

        // Check if already enrolled
        if (users[userIndex].enrolledCourses.includes(courseId)) {
            return { success: false, message: 'Already enrolled.' };
        }

        users[userIndex].enrolledCourses.push({
            courseId,
            enrolledAt: new Date().toLocaleDateString(),
            progress: 0
        });

        localStorage.setItem('users', JSON.stringify(users));

        // Update Current User
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.id === userId) {
            currentUser.enrolledCourses = users[userIndex].enrolledCourses;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        // Award Points for Enrollment? Maybe small amount
        addPoints(userId, 50, 'Course Enrollment Bonus');

        return { success: true, message: 'Enrollment successful!' };
    }
    return { success: false, message: 'User not found.' };
}

export function getUserCourses(user) {
    return user.enrolledCourses || [];
}
