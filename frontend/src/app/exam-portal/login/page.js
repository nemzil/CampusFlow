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
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in as STUDENT, redirect to exams
  // If logged in as non-student, redirect to main portal
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'STUDENT') {
        router.replace('/exam-portal/exams');
      } else {
        router.replace('/login');
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

      const response = await fetch(
        'http://localhost:8000/api/auth/login',
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
      localStorage.setItem('token', data.access_token);

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

      localStorage.setItem('user', JSON.stringify(userData));

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
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <div className="min-h-screen relative flex items-center justify-center px-6 py-12 overflow-hidden bg-background">

      {/* Animated Background Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-30 pointer-events-none"
        style={{ background: 'var(--amber-glow, #f59e0b)' }}
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ background: 'var(--orange-glow, #ea580c)' }}
      />

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
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-600 to-orange-600 shadow-lg shadow-amber-500/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>

            <span className="text-3xl font-bold font-heading gradient-text">
              Exam Portal
            </span>
          </motion.div>
        </div>

        {/* Login Card */}
        <Card className="glass-card border-white/10 shadow-2xl backdrop-blur-xl">

          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Student Login
            </CardTitle>

            <CardDescription className="text-slate-400">
              Sign in to access your exams
            </CardDescription>
          </CardHeader>

          <CardContent>

            <form onSubmit={handleSubmit} className="space-y-4">

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                      y: -10
                    }}
                    animate={{
                      opacity: 1,
                      height: 'auto',
                      y: 0
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -10
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username */}
              <div className="space-y-2">

                <label className="text-sm font-medium text-slate-300 ml-1">
                  Username
                </label>

                <div className="relative">

                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value
                      })
                    }
                    className="pl-10 bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/30 h-11"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">

                <label className="text-sm font-medium text-slate-300 ml-1">
                  Password
                </label>

                <div className="relative">

                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

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
                    className="pl-10 bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:ring-amber-500/30 h-11"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 mt-2 bg-amber-600 hover:bg-amber-700 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 border-t border-white/5 pt-6 pb-6">
            <p className="text-sm text-center text-slate-400">
              Forgot your password? Contact administrator.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="text-sm text-center text-violet-400 hover:text-violet-300 transition-colors"
            >
              Go to Main Portal Login
            </button>
          </CardFooter>

        </Card>

        {/* Test Credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm shadow-lg text-center"
        >

          <p className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Test Credentials
          </p>

          <div className="flex flex-col gap-2 text-xs text-slate-400 font-mono">

            <div className="flex justify-between px-4">
              <span>Student:</span>

              <button
                type="button"
                onClick={() =>
                  fillCredentials(
                    '2024F-BSE-001',
                    'ssuet+001'
                  )
                }
                className="text-amber-300 hover:text-amber-200 transition-colors" style={{ cursor: "pointer" }}
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
