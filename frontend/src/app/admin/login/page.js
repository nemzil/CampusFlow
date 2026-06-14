'use client';

import LoginTemplate from '@/components/LoginTemplate';

export default function AdminLoginPage() {
  return (
    <LoginTemplate
      role="ADMIN"
      title="Administrator Portal"
      description="Control campus configurations, manage users, and review financial operations."
      colorVar="tertiary"
    />
  );
}
