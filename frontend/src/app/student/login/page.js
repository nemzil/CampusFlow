'use client';

import LoginTemplate from '@/components/LoginTemplate';

export default function StudentLoginPage() {
  return (
    <LoginTemplate
      role="STUDENT"
      title="Student Portal"
      description="Access your courses, grades, attendance, and administrative services."
      colorVar="primary"
    />
  );
}
