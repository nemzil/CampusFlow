import { motion } from 'framer-motion';
import { Clock, FileText, Users, Calendar } from 'lucide-react';
import './ExamCard.css';

export default function ExamCard({ exam, role, onSetLive, onEnd, onView, onTake }) {
  const getStatusColor = () => {
    if (exam.status === 'live') return '#10b981';
    if (exam.status === 'ended') return '#ef4444';
    return '#6b7280';
  };

  const getTypeColor = () => {
    return exam.type === 'manual' ? '#8b5cf6' : '#06b6d4';
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
      className="exam-card"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="exam-card-header">
        <div className="exam-title-section">
          <h3 className="exam-title">{exam.title}</h3>
          <div className="exam-badges">
            <span 
              className="exam-badge status-badge"
              style={{ backgroundColor: getStatusColor() }}
            >
              {exam.status.toUpperCase()}
            </span>
            <span 
              className="exam-badge type-badge"
              style={{ backgroundColor: getTypeColor() }}
            >
              {exam.type.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="exam-card-body">
        <div className="exam-info-row">
          <FileText size={16} />
          <span>Subject: {exam.subject}</span>
        </div>
        <div className="exam-info-row">
          <Users size={16} />
          <span>Class: {exam.class_name}</span>
        </div>
        {exam.start_time && (
          <div className="exam-info-row">
            <Calendar size={16} />
            <span>Start: {formatDateTime(exam.start_time)}</span>
          </div>
        )}
        {exam.end_time && (
          <div className="exam-info-row">
            <Clock size={16} />
            <span>End: {formatDateTime(exam.end_time)}</span>
          </div>
        )}
        {role === 'teacher' && exam.submission_count !== undefined && (
          <div className="exam-info-row">
            <Users size={16} />
            <span>Submissions: {exam.submission_count || 0}</span>
          </div>
        )}
      </div>

      <div className="exam-card-actions">
        {role === 'student' && isCurrentlyTakeable && (
          <button className="btn-primary" onClick={() => onTake(exam.id)}>
            Take Exam
          </button>
        )}
        
        {role === 'student' && !isCurrentlyTakeable && (
          <button className="btn-secondary" disabled>
            {isDraft ? 'Not Available' : hasEnded ? 'Ended' : isUpcoming ? 'Upcoming' : 'Not Available'}
          </button>
        )}

        {role === 'teacher' && (
          <>
            {isDraft && (
              <>
                <button className="btn-primary" onClick={() => onSetLive(exam.id)}>
                  Set Live
                </button>
                <button className="btn-secondary" onClick={() => onView(exam.id)}>
                  Edit
                </button>
              </>
            )}
            {isLive && (
              <>
                <button className="btn-primary" onClick={() => onView(exam.id)}>
                  View Submissions
                </button>
                <button className="btn-danger" onClick={() => onEnd(exam.id)}>
                  End Exam
                </button>
              </>
            )}
            {isEnded && (
              <button className="btn-secondary" onClick={() => onView(exam.id)}>
                View Submissions
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
