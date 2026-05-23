'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { getManualExams, getAiExams } from '@/lib/api';
import { pageVariants } from '@/lib/animations';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ExamCard from '@/components/ExamCard';
import './exams.css';

export default function StudentExamsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();
  
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, live, upcoming, ended

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    } else if (!authLoading && user) {
      fetchExams();
    }
  }, [user, authLoading, router]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Fetch both manual and AI exams
      const [manualExams, aiExams] = await Promise.all([
        getManualExams(),
        getAiExams()
      ]);

      // Combine and add type field
      const allExams = [
        ...manualExams.map(e => ({ ...e, type: 'manual' })),
        ...aiExams.map(e => ({ ...e, type: 'ai' }))
      ];

      // Sort by start_time (most recent first)
      allExams.sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(b.start_time) - new Date(a.start_time);
      });

      setExams(allExams);
    } catch (error) {
      showError(error.message || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExams = () => {
    const now = new Date();
    
    return exams.filter(exam => {
      if (filter === 'all') return true;
      
      const start = exam.start_time ? new Date(exam.start_time) : null;
      const end = exam.end_time ? new Date(exam.end_time) : null;
      
      if (filter === 'live') {
        return exam.status === 'live' && start && end && now >= start && now <= end;
      }
      if (filter === 'upcoming') {
        return exam.status === 'live' && start && now < start;
      }
      if (filter === 'ended') {
        return exam.status === 'ended' || (end && now > end);
      }
      
      return true;
    });
  };

  const handleTakeExam = (examId) => {
    router.push(`/student/exams/${examId}/take`);
  };

  if (authLoading || loading) {
    return <LoadingSpinner size="large" message="Loading exams..." />;
  }

  const filteredExams = getFilteredExams();

  return (
    <motion.div
      className="student-exams-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="exams-header">
        <h1>Available Exams</h1>
        <p className="subtitle">View and take your scheduled exams</p>
      </div>

      <div className="relative inline-flex p-1 bg-white/5 border border-white/10 rounded-lg">
        {['all', 'live', 'upcoming', 'ended'].map((f) => (
          <button
            key={f}
            className={`relative z-10 px-4 py-2 text-xs font-semibold tracking-wider transition-colors ${
              filter === f ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {filter === f && (
              <motion.div
                layoutId="examTabHighlight"
                className="absolute inset-0 bg-violet-600 rounded-md"
                style={{ zIndex: -1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 35,
                  mass: 0.8
                }}
              />
            )}
          </button>
        ))}
      </div>

      {filteredExams.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No exams found"
          message={`No ${filter === 'all' ? '' : filter} exams available`}
        />
      ) : (
        <div className="exams-grid">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              role="student"
              onTake={handleTakeExam}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
