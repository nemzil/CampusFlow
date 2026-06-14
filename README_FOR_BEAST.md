# 🎨 CampusFlow Frontend - Integration Guide for Your Friend

Hey! The **backend is 100% complete and running**. Here's everything your friend needs to know.

---

## ✅ What's Already Done (Backend)

### Three Separate Login Portals
```
✓ Student Portal: POST /api/auth/login/student
✓ Teacher Portal: POST /api/auth/login/teacher
✓ Admin Portal:   POST /api/auth/login/admin
```

### Test Credentials (Ready to Use)
```
Student: 2024F-BSE-001 / ssuet+001
Teacher: ahmedkhan / teacher123
Admin:   admin / admin
```

### Backend URL
```
http://localhost:8000
```

---

## 🎯 What Frontend Needs to Build

### 1. Three Login Pages

#### Option A: Separate Routes (Recommended)
```
/student-login  →  Student login form
/teacher-login  →  Teacher login form
/admin-login    →  Admin login form
```

#### Option B: Single Page with Tabs
```
/login  →  Single page with role selector (tabs/buttons)
```

---

## 📋 Step-by-Step Integration

### Step 1: Update Landing Page (`/`)

Add three portal buttons:

```jsx
// app/page.js or wherever your landing page is

export default function Home() {
  return (
    <div className="landing-page">
      <h1>Welcome to CampusFlow</h1>
      
      <div className="portal-buttons">
        <Link href="/student-login">
          <Card className="portal-card">
            <GraduationCap size={48} />
            <h2>Student Portal</h2>
            <p>Access your courses, grades, and more</p>
          </Card>
        </Link>
        
        <Link href="/teacher-login">
          <Card className="portal-card">
            <BookOpen size={48} />
            <h2>Teacher Portal</h2>
            <p>Manage courses, grade assignments</p>
          </Card>
        </Link>
        
        <Link href="/admin-login">
          <Card className="portal-card">
            <Settings size={48} />
            <h2>Admin Portal</h2>
            <p>Manage users and system settings</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
```

---

### Step 2: Create Login Pages

#### Student Login (`app/student-login/page.js`)

```jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginStudent } from '@/lib/api';

export default function StudentLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginStudent(username, password);
      
      // Success - redirect to student dashboard
      router.push('/student');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card>
        <CardHeader>
          <h1>Student Portal Login</h1>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username (Registration No.)</label>
              <Input
                type="text"
                placeholder="2024F-BSE-001"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter>
          <p>
            Wrong portal? 
            <Link href="/teacher-login">Teacher</Link> | 
            <Link href="/admin-login">Admin</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

#### Teacher Login (`app/teacher-login/page.js`)

```jsx
// Same structure as student login, but:
// - Change title to "Teacher Portal Login"
// - Change placeholder to "ahmedkhan"
// - Call loginTeacher() instead of loginStudent()
// - Redirect to /teacher instead of /student
```

#### Admin Login (`app/admin-login/page.js`)

```jsx
// Same structure, but:
// - Change title to "Admin Portal Login"
// - Change placeholder to "admin"
// - Call loginAdmin() instead of loginStudent()
// - Redirect to /admin instead of /student
```

---

### Step 3: Update API Client (`lib/api.js`)

Add these login functions:

```javascript
// frontend/src/lib/api.js

const API_BASE = 'http://localhost:8000/api';

// Student Login
export async function loginStudent(username, password) {
  const response = await fetch(`${API_BASE}/auth/login/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await response.json();
  
  // Store token and user data
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data));
  
  return data;
}

// Teacher Login
export async function loginTeacher(username, password) {
  const response = await fetch(`${API_BASE}/auth/login/teacher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data));
  
  return data;
}

// Admin Login
export async function loginAdmin(username, password) {
  const response = await fetch(`${API_BASE}/auth/login/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data));
  
  return data;
}

// Verify Token
export async function verifyToken() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  const response = await fetch(`${API_BASE}/auth/verify`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.ok;
}
```

---

### Step 4: Protect Dashboard Routes

Add auth check to each dashboard:

```jsx
// app/student/layout.js or page.js

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyToken } from '@/lib/api';

export default function StudentDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if authenticated
    const checkAuth = async () => {
      const isValid = await verifyToken();
      if (!isValid) {
        router.push('/student-login');
        return;
      }
      
      // Check if correct role
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role !== 'STUDENT') {
        router.push('/unauthorized');
      }
    };
    
    checkAuth();
  }, [router]);
  
  return (
    <div>
      {/* Your student dashboard content */}
    </div>
  );
}
```

**Repeat for `/teacher` and `/admin` with appropriate role checks.**

---

### Step 5: Handle Logout

```jsx
// In your navbar or user menu

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/'); // or appropriate login page
};
```

---

## 🧪 Testing Your Integration

### 1. Test Student Login
1. Go to `http://localhost:3000/student-login`
2. Enter: `2024F-BSE-001` / `ssuet+001`
3. Click Login
4. Should redirect to `/student` dashboard
5. Check localStorage for `token` and `user`

### 2. Test Teacher Login
1. Go to `http://localhost:3000/teacher-login`
2. Enter: `ahmedkhan` / `teacher123`
3. Should redirect to `/teacher` dashboard

### 3. Test Admin Login
1. Go to `http://localhost:3000/admin-login`
2. Enter: `admin` / `admin`
3. Should redirect to `/admin` dashboard

### 4. Test Wrong Portal
1. Go to `/student-login`
2. Try logging in with teacher credentials
3. Should show error: "This login portal is for students only"

### 5. Test Wrong Password
1. Go to any login page
2. Enter correct username but wrong password
3. Should show: "Invalid username or password"

---

## ⚠️ Common Errors & Solutions

### "Failed to fetch" or Network Error
**Problem:** Backend not running  
**Solution:** Make sure backend is running on port 8000
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### "This login portal is for X only"
**Problem:** Using wrong login endpoint for the user  
**Solution:** Use correct endpoint:
- Students → `/login/student`
- Teachers → `/login/teacher`
- Admins → `/login/admin`

### "Invalid username or password"
**Problem:** Wrong credentials or user doesn't exist  
**Solution:** Use test credentials or create user via admin

### Token expires quickly
**Problem:** Short token expiry  
**Solution:** Backend tokens last 7 days, but you can implement refresh token mechanism

---

## 📚 Documentation Files

Give your friend these files:
1. **`AUTHENTICATION_QUICK_REFERENCE.md`** ⭐ Start here
2. **`backend/API_DOCUMENTATION.md`** - Full API reference
3. **`BACKEND_STATUS_REPORT.md`** - What's done

---

## 🎯 Checklist for Frontend Developer

### Landing Page
- [ ] Add three portal buttons/cards
- [ ] Style them nicely
- [ ] Add icons (GraduationCap, BookOpen, Settings)

### Login Pages
- [ ] Create `/student-login` page
- [ ] Create `/teacher-login` page
- [ ] Create `/admin-login` page
- [ ] Add form validation
- [ ] Show loading state
- [ ] Display error messages
- [ ] Add "Wrong portal?" links

### API Integration
- [ ] Add `loginStudent()` to `lib/api.js`
- [ ] Add `loginTeacher()` to `lib/api.js`
- [ ] Add `loginAdmin()` to `lib/api.js`
- [ ] Add `verifyToken()` to `lib/api.js`
- [ ] Store token in localStorage
- [ ] Store user data in localStorage

### Protected Routes
- [ ] Add auth check to `/student` routes
- [ ] Add auth check to `/teacher` routes
- [ ] Add auth check to `/admin` routes
- [ ] Redirect to login if not authenticated
- [ ] Check role matches the dashboard

### User Experience
- [ ] Show user info in navbar after login
- [ ] Add logout button
- [ ] Clear localStorage on logout
- [ ] Handle 401 errors globally
- [ ] Show friendly error messages

---

## 🚀 Quick Start for Your Friend

```bash
# 1. Make sure backend is running
# (In backend terminal)
cd backend
python -m uvicorn app.main:app --reload

# 2. Start frontend dev server
# (In frontend terminal)
cd frontend
npm run dev

# 3. Open browser
http://localhost:3000

# 4. Test login with:
Student: 2024F-BSE-001 / ssuet+001
Teacher: ahmedkhan / teacher123
Admin: admin / admin
```

---

## 💡 Pro Tips

1. **Use the existing AuthContext** - It already has `login()`, `logout()`, `user`, and `token`
2. **Check the current login page** (`app/login/page.js`) - You can use it as a template
3. **Test in Swagger first** - http://localhost:8000/docs to verify endpoints work
4. **Check browser console** - Look for errors or network issues
5. **Use React DevTools** - Inspect AuthContext state

---

## 🎉 Summary

**Backend is DONE:**
- ✅ Three login endpoints working
- ✅ Test users created
- ✅ Database connected
- ✅ Gemini AI configured
- ✅ All 20+ modules working

**Frontend needs to:**
1. Create three login page UIs (copy the code above)
2. Update landing page with portal buttons
3. Copy-paste the API functions
4. Test with the provided credentials

**That's it! Everything else is already done on the backend! 🚀**

---

## 📞 Need Help?

- Backend API: http://localhost:8000/docs
- Test the endpoints in Swagger UI first
- Check `AUTHENTICATION_QUICK_REFERENCE.md`
- All code examples are copy-paste ready!

**The backend is 100% complete and tested. Your friend just needs to create the UI! 🎨**
