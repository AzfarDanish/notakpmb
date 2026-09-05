import type { Metadata } from 'next';
import { FeedbackBoard } from '@/components/FeedbackBoard';

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Suggest improvements and vote on ideas for NotaKPMB anonymously.',
  alternates: { canonical: '/feedback' },
};

export default function FeedbackPage() {
  return (
    <main id="main" className="page-shell">
      <FeedbackBoard />
    </main>
  );
}
