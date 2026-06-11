'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { getManualExams, getAiExams } from '@/lib/api';
import { pageVariants } from '@/lib/animations';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import ExamCard from '@/components/ExamCard';
import '../../student/exams/exams.css';

export default function ExamPortalExamsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/exam-portal/login');
    } else if (!authLoading && user && user.role !== 'STUDENT') {
      router.push('/login');
    } else if (!authLoading && user) {
      fetchExams();
    }
  }, [user, authLoading, router]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const [manualExams, aiExams] = await Promise.all([getManualExams(), getAiExams()]);
      const allExams = [
        ...manualExams.map((e) => ({ ...e, type: 'manual', exam_id: e.id })),
        ...aiExams.map((e) => ({ ...e, type: 'ai', id: e.exam_id })),
      ];
      allExams.sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(b.start_time) - new Date(a.start_time);
      });
      setExams(allExams);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExams = () => {
    const now = new Date();
    return exams.filter((exam) => {
      if (filter === 'all') return true;
      const start = exam.start_time ? new Date(exam.start_time) : null;
      const end = exam.end_time ? new Date(exam.end_time) : null;
      
      // Debug: log the comparison for live exams
      if (exam.status === 'live' && start && end) {
        console.log('Exam:', exam.title, 'Now:', now.toISOString(), 'Start:', start.toISOString(), 'End:', end.toISOString());
        console.log('Now >= Start:', now >= start, 'Now <= End:', now <= end);
      }
      
      if (filter === 'live') return exam.status === 'live' && start && end && now >= start && now <= end;
      if (filter === 'upcoming') return exam.status === 'live' && start && now < start;
      if (filter === 'ended') return exam.status === 'ended' || (end && now > end);
      return true;
    });
  };

  const handleTakeExam = (exam) => {
    // Navigate to the appropriate exam taking page based on type
    // Store exam class_name in sessionStorage so the take page can access it
    sessionStorage.setItem(`exam_${exam.type}_${exam.exam_id || exam.id}_class`, exam.class_name);
    
    if (exam.type === 'ai') {
      router.push(`/exam-portal/take-ai/${exam.exam_id}`);
    } else {
      router.push(`/exam-portal/take-manual/${exam.id}`);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner size="large" message="Loading exams..." />;
  }

  const filteredExams = getFilteredExams();

  return (
    <motion.div className="student-exams-page" variants={pageVariants} initial="initial" animate="animate">
      <div className="exams-header">
        <h1>Exam Portal</h1>
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
          </button>
        ))}
      </div>

      {filteredExams.length === 0 ? (
        <EmptyState icon="📝" title="No exams found" message={`No ${filter === 'all' ? '' : filter} exams available`} />
      ) : (
        <div className="exams-grid">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} role="student" onTake={() => handleTakeExam(exam)} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
