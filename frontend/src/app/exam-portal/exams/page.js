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

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <motion.div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen font-sans space-y-8" variants={pageVariants} initial="initial" animate="animate">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
            Your <span className="text-amber-500">Exams</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View and take your scheduled examinations
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          {['all', 'live', 'upcoming', 'ended'].map((f) => (
            <button
              key={f}
              className={`px-4 py-2 text-xs font-bold tracking-wider rounded-lg transition-all ${
                filter === f 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <EmptyState icon="📝" title="No exams found" message={`No ${filter === 'all' ? '' : filter} exams available right now.`} />
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {filteredExams.map((exam) => (
            <motion.div key={exam.id} variants={itemVariants} className="h-full">
              <ExamCard exam={exam} role="student" onTake={() => handleTakeExam(exam)} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
