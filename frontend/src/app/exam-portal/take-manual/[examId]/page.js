'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getManualExam, submitManualExam } from '@/lib/api';
import { motion } from 'framer-motion';
import { Clock, Send, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function TakeManualExamPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/exam-portal/login');
    } else if (!authLoading && user && user.role !== 'STUDENT') {
      router.push('/login');
    } else if (!authLoading && user) {
      loadExam();
    }
  }, [user, authLoading, router]);

  const loadExam = async () => {
    setLoading(true);
    try {
      const data = await getManualExam(params.examId);
      
      // Clean up sessionStorage if it was set
      const storedClassName = sessionStorage.getItem(`exam_manual_${params.examId}_class`);
      if (storedClassName) {
        sessionStorage.removeItem(`exam_manual_${params.examId}_class`);
      }
      
      // Check if exam is live and within time window
      if (!data.live && data.status !== 'live') {
        showError('This exam is not live yet');
        router.push('/exam-portal/exams');
        return;
      }
      
      if (data.start_time && new Date(data.start_time) > new Date()) {
        showError('Exam has not started yet');
        router.push('/exam-portal/exams');
        return;
      }
      
      if (data.end_time && new Date(data.end_time) < new Date()) {
        showError('Exam time has ended');
        router.push('/exam-portal/exams');
        return;
      }
      
      setExam(data);
      
      // Initialize empty answers
      const initialAnswers = {};
      data.questions.forEach((q) => {
        initialAnswers[q.question_number] = '';
      });
      setAnswers(initialAnswers);
      
      // Calculate time left if end time exists
      if (data.end_time) {
        const endTime = new Date(data.end_time);
        const now = new Date();
        const diff = Math.floor((endTime - now) / 1000); // seconds
        setTimeLeft(diff > 0 ? diff : 0);
      }
    } catch (error) {
      showError(error.message || 'Failed to load exam');
      setTimeout(() => router.push('/exam-portal/exams'), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const handleAnswerChange = (questionNumber, value) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: value }));
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = exam.questions.filter((q) => !answers[q.question_number] || answers[q.question_number].trim() === '');
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      // Format answers for submission
      const formattedAnswers = exam.questions.map((q) => ({
        question_number: q.question_number,
        answer_text: answers[q.question_number] || '',
        question: q.text,
        correct_answer: q.correct_answer || '',
        max_marks: q.max_marks
      }));

      await submitManualExam(params.examId, {
        class_name: exam.class_name,
        answers: formattedAnswers
      });
      
      showSuccess('Exam submitted successfully! Your teacher will check it soon.');
      router.push('/exam-portal/exams');
    } catch (error) {
      showError(error.message || 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner size="large" message="Loading exam..." />;
  }

  if (!exam) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#060813] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
              <p className="text-sm text-slate-400">Subject: {exam.subject}</p>
              <p className="text-sm text-slate-400">Class: {exam.class_name}</p>
            </div>
            {timeLeft !== null && timeLeft > 0 && (
              <div className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-lg px-4 py-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-slate-400">Time Left</p>
                  <p className="text-lg font-bold text-indigo-400">{formatTime(timeLeft)}</p>
                </div>
              </div>
            )}
          </div>
          {timeLeft === 0 && (
            <div className="mt-4 flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Time's up! Submitting automatically...</span>
            </div>
          )}
        </motion.div>

        {/* Questions */}
        <div className="space-y-6">
          {exam.questions.map((question, index) => (
            <motion.div
              key={question.question_number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
                  {question.question_number}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-base text-white leading-relaxed">{question.text}</p>
                    <span className="text-xs text-slate-500 ml-4 flex-shrink-0">
                      {question.max_marks} marks
                    </span>
                  </div>
                  
                  <textarea
                    value={answers[question.question_number] || ''}
                    onChange={(e) => handleAnswerChange(question.question_number, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 min-h-[120px] resize-y"
                  />
                  
                  {question.correct_answer && (
                    <p className="mt-2 text-xs text-slate-500">
                      Hint: Consider key points related to {question.correct_answer.substring(0, 30)}...
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-end gap-4"
        >
          <button
            onClick={() => router.push('/exam-portal/exams')}
            disabled={submitting}
            className="px-6 py-3 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || timeLeft === 0}
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Exam
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
