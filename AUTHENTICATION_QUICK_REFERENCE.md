# 🔐 CampusFlow Authentication - Quick Reference Card

## 🎯 Three Login Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT PORTAL                               │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/auth/login/student                                    │
│                                                                 │
│ Request:                                                        │
│   { "username": "2024F-BSE-001", "password": "ssuet+001" }     │
│                                                                 │
│ Response (200):                                                 │
│   {                                                             │
│     "access_token": "eyJhbGc...",                              │
│     "role": "STUDENT",                                          │
│     "registration_no": "2024F-BSE-001",                        │
│     "department": "Computer Science",                           │
│     "program": "BSE",                                           │
│     "current_semester": 3                                       │
│   }                                                             │
│                                                                 │
│ ✅ Only STUDENT role can login here                            │
│ ❌ Teacher/Admin → 403 Forbidden                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TEACHER PORTAL                               │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/auth/login/teacher                                    │
│                                                                 │
│ Request:                                                        │
│   { "username": "ahmedkhan", "password": "teacher123" }        │
│                                                                 │
│ Response (200):                                                 │
│   {                                                             │
│     "access_token": "eyJhbGc...",                              │
│     "role": "TEACHER",                                          │
│     "employee_id": "EMP-2024-001",                             │
│     "designation": "Assistant Professor",                       │
│     "department": "Computer Science",                           │
│     "specialization": "Machine Learning"                        │
│   }                                                             │
│                                                                 │
│ ✅ Only TEACHER role can login here                            │
│ ❌ Student/Admin → 403 Forbidden                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN PORTAL                                │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/auth/login/admin                                      │
│                                                                 │
│ Request:                                                        │
│   { "username": "admin", "password": "admin" }                 │
│                                                                 │
│ Response (200):                                                 │
│   {                                                             │
│     "access_token": "eyJhbGc...",                              │
│     "role": "ADMIN",                                            │
│     "admin_level": "SUPER_ADMIN"                               │
│   }                                                             │
│                                                                 │
│ ✅ Only ADMIN role can login here                              │
│ ❌ Student/Teacher → 403 Forbidden                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Test Credentials

| Portal | Username | Password | Dashboard URL |
|--------|----------|----------|---------------|
| 🎓 Student | `2024F-BSE-001` | `ssuet+001` | `/student` |
| 👨‍🏫 Teacher | `ahmedkhan` | `teacher123` | `/teacher` |
| 🔧 Admin | `admin` | `admin` | `/admin` |

---

## 📡 Token Verification

```javascript
// Verify if token is still valid
GET /api/auth/verify
Headers: Authorization: Bearer <token>

Response (200):
{
  "valid": true,
  "username": "2024F-BSE-001",
  "role": "STUDENT",
  "is_active": true
}
```

---

## 🚀 Quick Setup

```bash
# 1. Start Backend
cd backend
python -m uvicorn app.main:app --port 8000 --reload

# 2. Seed Test Users (new terminal)
python seed_test_users.py

# 3. Run Tests
python test_auth_endpoints.py

# 4. Open Swagger UI
http://localhost:8000/docs
```

---

## 🎨 Frontend Integration

```javascript
// Student Login
const studentLogin = async (username, password) => {
  const res = await fetch('http://localhost:8000/api/auth/login/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data));
    window.location.href = '/student';
  }
};

// Teacher Login
const teacherLogin = async (username, password) => {
  const res = await fetch('http://localhost:8000/api/auth/login/teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data));
    window.location.href = '/teacher';
  }
};

// Admin Login
const adminLogin = async (username, password) => {
  const res = await fetch('http://localhost:8000/api/auth/login/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (res.ok) {
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data));
    window.location.href = '/admin';
  }
};

// Token Verification
const verifyToken = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:8000/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.ok;
};

// Protected Request
const makeAuthRequest = async (url) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (res.status === 401) {
    // Token expired
    localStorage.clear();
    window.location.href = '/login';
  }
  
  return res.json();
};
```

---

## ⚠️ Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue to dashboard |
| 401 | Invalid credentials or token | Show error message |
| 403 | Wrong portal or deactivated | Show appropriate message |
| 404 | User not found | Show error |
| 422 | Validation error | Check request format |

---

## 📋 Checklist for Frontend Developer

### Login Pages
- [ ] Create `/student-login` page
- [ ] Create `/teacher-login` page
- [ ] Create `/admin-login` page
- [ ] Add "Forgot Password" link (UI only, backend needs implementation)

### Landing Page
- [ ] Add three portal buttons:
  - [ ] Student Portal → `/student-login`
  - [ ] Teacher Portal → `/teacher-login`
  - [ ] Admin Portal → `/admin-login`

### API Integration
- [ ] Update `api.js` with three login functions
- [ ] Add token verification function
- [ ] Handle 401 errors (redirect to login)
- [ ] Handle 403 errors (show error message)

### Authentication Flow
- [ ] Save token to localStorage after login
- [ ] Save user data to localStorage
- [ ] Verify token on protected route access
- [ ] Clear localStorage on logout
- [ ] Redirect based on role after login

### Protected Routes
- [ ] Add auth check on `/student` routes
- [ ] Add auth check on `/teacher` routes
- [ ] Add auth check on `/admin` routes
- [ ] Redirect to login if not authenticated
- [ ] Show 403 page if wrong role

### User Experience
- [ ] Show loading spinner during login
- [ ] Display error messages clearly
- [ ] Remember user preference (optional)
- [ ] Add "Stay logged in" option (optional)
- [ ] Show user info in navbar after login

---

## 🔒 Security Best Practices

✅ **Implemented:**
- Role-based login portals
- Password hashing (bcrypt)
- JWT token with expiration
- Account activation status
- Generic error messages
- Last login tracking

⚠️ **Recommended for Production:**
- Rate limiting on login endpoints
- Refresh token mechanism
- Password reset flow
- Email verification
- 2FA for admin accounts
- HTTPS only in production
- CORS configuration for production domain

---

## 📖 Documentation Files

- `backend/API_DOCUMENTATION.md` - Complete API reference
- `backend/SETUP_AND_TEST.md` - Setup and testing guide
- `backend/IMPLEMENTATION_SUMMARY.md` - What was implemented
- `AUTHENTICATION_QUICK_REFERENCE.md` - This file (quick reference)

---

## 🎉 Summary

✅ Backend has **THREE separate login endpoints**
✅ Each endpoint **validates role** before allowing login
✅ **JWT tokens** include role information
✅ **Test users** ready for each role
✅ **Automated tests** verify everything works
✅ **Complete documentation** for integration

**Your frontend developer can now create three beautiful login pages! 🚀**
