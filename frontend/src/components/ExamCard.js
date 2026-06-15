import { motion } from 'framer-motion';
import { Clock, FileText, Users, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ExamCard({ exam, role, onSetLive, onEnd, onView, onTake }) {
  const getStatusClasses = () => {
    if (exam.status === 'live') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (exam.status === 'ended') return 'bg-red-50 text-red-600 border-red-100';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  const getTypeClasses = () => {
    return exam.type === 'manual' 
      ? 'bg-violet-50 text-violet-600 border-violet-100' 
      : 'bg-sky-50 text-sky-600 border-sky-100';
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isLive = exam.status === 'live';
  const isDraft = exam.status === 'draft';
  const isEnded = exam.status === 'ended';
  
  // For students: check if exam is currently takeable (between start and end time)
  const now = new Date();
  const start = exam.start_time ? new Date(exam.start_time) : null;
  const end = exam.end_time ? new Date(exam.end_time) : null;
  const isCurrentlyTakeable = isLive && start && end && now >= start && now <= end;
  const isUpcoming = isLive && start && now < start;
  const hasEnded = isEnded || (end && now > end);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
          
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-base font-bold text-slate-900 font-heading leading-tight line-clamp-2">
                {exam.title}
              </h3>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-wider ${getStatusClasses()}`}>
                  {exam.status}
                </Badge>
                <Badge variant="outline" className={`text-[9px] uppercase font-bold tracking-wider ${getTypeClasses()}`}>
                  {exam.type}
                </Badge>
              </div>
            </div>

            {(exam.require_seb || exam.requireSeb) && (
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 text-[9px] uppercase font-bold tracking-wider inline-flex">
                SEB REQUIRED
              </Badge>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="truncate">Subject: {exam.subject}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                <Users className="w-4 h-4 text-amber-500" />
                <span className="truncate">Class: {exam.class_name}</span>
              </div>
              {exam.start_time && (
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="truncate font-mono">Start: {formatDateTime(exam.start_time)}</span>
                </div>
              )}
              {exam.end_time && (
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="truncate font-mono">End: {formatDateTime(exam.end_time)}</span>
                </div>
              )}
              {role === 'teacher' && exam.submission_count !== undefined && (
                <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span className="truncate font-mono">Submissions: {exam.submission_count || 0}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {role === 'student' && exam.submitted && (
              <button disabled className="w-full py-2.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center gap-1 cursor-default">
                ✓ Submitted
              </button>
            )}

            {role === 'student' && !exam.submitted && isCurrentlyTakeable && (
              <button 
                onClick={() => onTake(exam.id)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1"
              >
                Take Exam
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            
            {role === 'student' && !exam.submitted && !isCurrentlyTakeable && (
              <button disabled className="w-full py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-bold text-xs flex items-center justify-center gap-1 cursor-not-allowed">
                {isDraft ? 'Not Available' : hasEnded ? 'Ended' : isUpcoming ? 'Upcoming' : 'Not Available'}
              </button>
            )}

            {role === 'teacher' && (
              <div className="flex flex-col sm:flex-row gap-2">
                {isDraft && (
                  <>
                    <button onClick={() => onSetLive(exam.id)} className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all">
                      Set Live
                    </button>
                    <button onClick={() => onView(exam.id)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all">
                      Edit
                    </button>
                  </>
                )}
                {isLive && (
                  <>
                    <button onClick={() => onView(exam.id)} className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all">
                      Submissions
                    </button>
                    <button onClick={() => onEnd(exam.id)} className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs transition-all">
                      End
                    </button>
                  </>
                )}
                {isEnded && (
                  <button onClick={() => onView(exam.id)} className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all">
                    View Submissions
                  </button>
                )}
              </div>
            )}
          </div>
          
        </CardContent>
      </Card>
    </motion.div>
  );
}
