import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './ExamTimer.css';

export default function ExamTimer({ endTime, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (onTimeUp) onTimeUp();
        return null;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Warning when less than 5 minutes
      setIsWarning(hours === 0 && minutes < 5);

      return { hours, minutes, seconds };
    };

    // Initial calculation
    const initial = calculateTimeLeft();
    setTimeLeft(initial);

    // Update every second
    const timer = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);
      
      if (time && time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onTimeUp]);

  if (!timeLeft) return null;

  const formatTime = (num) => String(num).padStart(2, '0');

  return (
    <motion.div
      className={`exam-timer ${isWarning ? 'warning' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="timer-content">
        <div className="timer-icon">
          {isWarning ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <AlertTriangle size={24} />
            </motion.div>
          ) : (
            <Clock size={24} />
          )}
        </div>
        
        <div className="timer-display">
          <span className="timer-label">Time Remaining:</span>
          <span className="timer-time">
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </div>

        <AnimatePresence>
          {isWarning && (
            <motion.div
              className="timer-warning-text"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              Hurry up!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
