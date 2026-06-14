'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export default function LoginTemplate({ role, title, description, colorVar }) {
    const router = useRouter();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const usernamePayload = username.includes('-')
                ? username.toUpperCase()
                : username.toLowerCase();

            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
            const res = await fetch(`${apiBase}/auth/login/${role.toLowerCase()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: usernamePayload,
                    password: password,
                    role: role
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Login failed');
            }
            // Save token securely
            const userData = {
                username: data.username,
                email: data.email,
                role: data.role,
                first_name: data.first_name,
                last_name: data.last_name,
                profile_picture_url: data.profile_picture_url,
                ...(role === 'STUDENT' ? {
                    registration_no: data.registration_no,
                    department: data.department,
                    program: data.program,
                    batch: data.batch,
                    current_semester: data.current_semester
                } : {}),
                ...(role === 'TEACHER' ? {
                    employee_id: data.employee_id,
                    department: data.department,
                    designation: data.designation,
                    qualification: data.qualification,
                    specialization: data.specialization,
                    office_location: data.office_location
                } : {}),
                ...(role === 'ADMIN' ? {
                    admin_level: data.admin_level
                } : {})
            };
            login(data.access_token, userData);
            
            // Redirect to respective dashboard
            router.push(`/${role.toLowerCase()}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Style map for themes
    const themeColors = {
        primary: {
            bg: 'bg-sky-500',
            text: 'text-sky-500',
            border: 'focus:border-sky-500',
            ring: 'focus:ring-sky-500/20',
            hover: 'hover:bg-sky-600',
            glow: 'rgba(14, 165, 233, 0.3)'
        },
        secondary: {
            bg: 'bg-emerald-500',
            text: 'text-emerald-500',
            border: 'focus:border-emerald-500',
            ring: 'focus:ring-emerald-500/20',
            hover: 'hover:bg-emerald-600',
            glow: 'rgba(16, 185, 129, 0.3)'
        },
        tertiary: {
            bg: 'bg-indigo-500',
            text: 'text-indigo-500',
            border: 'focus:border-indigo-500',
            ring: 'focus:ring-indigo-500/20',
            hover: 'hover:bg-indigo-600',
            glow: 'rgba(99, 102, 241, 0.3)'
        }
    };

    const currentTheme = themeColors[colorVar] || themeColors.primary;

    return (
      <div className="flex flex-col md:flex-row min-h-screen w-full bg-[var(--background)]">
        <section
          className="w-full md:w-[45%] p-[var(--margin-mobile)] md:p-[var(--margin-desktop)] flex flex-col justify-between relative overflow-hidden"
          style={{
            backgroundColor: role === 'STUDENT' ? '#0EA5E9' : role === 'TEACHER' ? '#10B981' : '#6366F1'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="z-10 text-white"
          >
            <div className="mb-8">
              <span className="font-headline-sm font-bold text-2xl drop-shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined">school</span> CampusFlow
              </span>
            </div>
            <h1 className="font-headline-md mb-4">{title}</h1>
            <p className="font-body-lg opacity-90 max-w-sm mb-10">{description}</p>
            <ul className="space-y-4">
              <li className="flex items-center gap-2 font-nav-link">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Secure Authentication
              </li>
              <li className="flex items-center gap-2 font-nav-link">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Seamless Dashboard Access
              </li>
              <li className="flex items-center gap-2 font-nav-link">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Real-time Data Sync
              </li>
            </ul>
          </motion.div>
          <div className="z-10 mt-auto pt-10 text-white">
            <Link
              href="/"
              className="group flex items-center gap-2 font-nav-link hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>
              Back to homepage
            </Link>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 border-[40px] border-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 border-[20px] border-white rounded-full translate-y-1/3 -translate-x-1/4" />
          </div>
        </section>
        <section className="w-full md:w-[55%] bg-[var(--surface)] p-[var(--margin-mobile)] md:p-[var(--margin-desktop)] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <header className="mb-10">
              <h2 className="font-headline-md text-[var(--on-background)] mb-2">Sign In</h2>
              <p className="font-body-md text-[var(--on-surface-variant)]">
                Welcome back. Enter your credentials to access your academic workspace.
              </p>
            </header>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-200">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="font-label-caps text-[var(--on-surface-variant)] uppercase tracking-widest text-xs font-bold"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--outline)] rounded-lg font-body-md focus:outline-none focus:ring-1 transition-colors ${currentTheme.border} ${currentTheme.ring}`}
                  placeholder={`Enter your ${role.toLowerCase()} username`}
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="font-label-caps text-[var(--on-surface-variant)] uppercase tracking-widest text-xs font-bold block"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--outline)] rounded-lg font-body-md focus:outline-none focus:ring-1 transition-colors pr-12 ${currentTheme.border} ${currentTheme.ring}`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] hover:text-[var(--on-background)] transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <div className="flex justify-end">
                  <a
                    href="#"
                    className="text-xs font-medium hover:underline"
                    style={{
                      color: role === 'STUDENT' ? '#0EA5E9' : role === 'TEACHER' ? '#10B981' : '#6366F1'
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 text-white rounded-[10px] font-nav-link text-lg transition-all hover:shadow-lg hover:-translate-y-[2px] disabled:opacity-70 disabled:hover:translate-y-0 ${currentTheme.bg} ${currentTheme.hover}`}
                  style={{
                    boxShadow: `0 4px 14px ${currentTheme.glow}`
                  }}
                >
                  {loading ? 'Authenticating...' : 'Access Portal'}
                </button>
              </div>
              <div className="pt-6 text-center">
                <p className="font-body-sm text-[var(--on-surface-variant)]">
                  Don't have an account yet?{' '}
                  <a
                    href="#"
                    className="font-bold hover:underline"
                    style={{
                      color: role === 'STUDENT' ? '#0EA5E9' : role === 'TEACHER' ? '#10B981' : '#6366F1'
                    }}
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </form>
            <div className="mt-16 flex justify-center items-center gap-4 grayscale opacity-40">
              <span className="font-label-caps text-xs">POWERED BY</span>
              <span className="font-headline-sm text-lg font-bold">CampusFlow</span>
            </div>
          </motion.div>
        </section>
      </div>
    );
}
