'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Lock,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ExamPortalLoginPage() {
  const router = useRouter();
  const { user, login, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as STUDENT, redirect to exams
  // If logged in as non-student, redirect to home page
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'STUDENT') {
        router.replace('/exam-portal/exams');
      } else {
        router.replace('/');
      }
    }
  }, [user, authLoading, router]);

  const fillCredentials = (username, password) => {
    setFormData({ username, password });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const username = formData.username.includes('-')
        ? formData.username.toUpperCase()
        : formData.username.toLowerCase();

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api';
      const response = await fetch(
        `${apiBase}/auth/login/student`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Only students allowed in exam portal
      if (data.role !== 'STUDENT') {
        throw new Error('Only students can access the Exam Portal');
      }

      // Set portal flag so 401 redirects come back here
      localStorage.setItem('portal', 'exam-portal');

      const userData = {
        username: data.username,
        email: data.email,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        profile_picture_url: data.profile_picture_url,
        registration_no: data.registration_no,
        department: data.department,
        program: data.program,
        batch: data.batch,
        current_semester: data.current_semester,
      };

      login(data.access_token, userData);

      // Hard navigate to exam portal exams so AuthContext re-hydrates
      window.location.href = '/exam-portal/exams';

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // If already logged in, don't render login form (redirect handled in useEffect)
  if (user && user.role === 'STUDENT') {
    return null;
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-12 overflow-hidden bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1]
        }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 mb-6 cursor-pointer"
            onClick={() => window.location.href = '/'}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold font-heading text-slate-900 tracking-tight">
              Exam Portal
            </span>
          </motion.div>
        </div>

        {/* Login Card */}
        <Card className="bg-white border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center pb-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
              Secure Login
            </CardTitle>
            <CardDescription className="text-slate-500 font-sans">
              Authenticate to access your examination dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm overflow-hidden font-medium"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
                  Registration Number
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="2024F-BSE-001"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value
                      })
                    }
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-amber-500 h-11 rounded-xl"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password: e.target.value
                      })
                    }
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-amber-500 h-11 rounded-xl"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Portal'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 border-t border-slate-100 pt-6 pb-6 bg-slate-50/50">
            <p className="text-xs text-center text-slate-500">
              Having trouble? Contact the examination department.
            </p>
            <button
              onClick={() => window.location.href = '/student/login'}
              className="text-xs font-bold text-center text-amber-600 hover:text-amber-700 transition-colors"
            >
              ← Back to Main Student Portal
            </button>
          </CardFooter>
        </Card>

        {/* Test Credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 rounded-xl border border-slate-200 bg-white shadow-sm text-center"
        >
          <p className="text-[9px] font-bold text-slate-400 mb-3 uppercase tracking-widest">
            Demo Credentials
          </p>
          <div className="flex flex-col gap-2 text-xs text-slate-600 font-mono font-medium">
            <div className="flex justify-between px-4">
              <span>Student Account:</span>
              <button
                type="button"
                onClick={() =>
                  fillCredentials(
                    '2024F-BSE-001',
                    'ssuet+001'
                  )
                }
                className="text-amber-600 hover:text-amber-700 transition-colors" style={{ cursor: "pointer" }}
              >
                2024F-BSE-001 / ssuet+001
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
