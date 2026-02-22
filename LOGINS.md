# 🔐 Test Logins

> For local development only. Do NOT commit this file to production.

## Admin Accounts

| Field    | Admin 1 | Admin 2 (New) |
|----------|---------|---------------|
| Email    | `admin@cmgroups.in` | `admin@test.com` |
| Password | `admin123` | `password123` |
| Role     | `admin` | `admin` |
| URL      | http://localhost:5173/admin | http://localhost:5173/admin |

---

## Customer Accounts

| Name | Email | Password | Referral Code |
|------|-------|----------|---------------|
| Rahul Sharma | `rahul@example.com` | `customer123` | RAHUL01 |
| Priya Patel | `priya@example.com` | `customer123` | PRIYA02 |
| Amit Kumar | `amit@example.com` | `customer123` | AMIT03 |
| Neha Singh | `neha@example.com` | `customer123` | NEHA04 |
| Vikram Reddy | `vikram@example.com` | `customer123` | VIKRAM05 |

---

## URLs

| Page | URL |
|------|-----|
| Home | http://localhost:5173 |
| Shop | http://localhost:5173/products |
| Courses | http://localhost:5173/courses |
| Services | http://localhost:5173/services |
| Login | http://localhost:5173/login |
| Register | http://localhost:5173/signup |
| User Dashboard | http://localhost:5173/dashboard |
| Admin Panel | http://localhost:5173/admin |
| Admin → Courses | http://localhost:5173/admin/courses |
| Admin → Enrollments | http://localhost:5173/admin/enrollments |
| Backend API | http://localhost:5000/api |

---

## Notes

- All accounts use `isVerified: true` by default (OTP is skipped)
- Referral codes are auto-generated at signup (visible in `/dashboard/courses`)
- To create a new admin: register normally → update `role` to `admin` via `/admin/users`
