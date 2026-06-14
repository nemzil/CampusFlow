'use client';

import LoginTemplate from '@/components/LoginTemplate';

export default function TeacherLoginPage() {
  return (
    <LoginTemplate
      role="TEACHER"
      title="Faculty Portal"
      description="Manage your classes, evaluate assignments, and track student attendance."
      colorVar="secondary"
    />
  );
}
