'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExamPortalHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/exam-portal/exams');
  }, [router]);
  return null;
}
