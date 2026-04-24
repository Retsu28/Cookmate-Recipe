import { useState } from 'react';
import { Check, EyeOff, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { reviewItems, type ReviewItem } from '../data/adminMockData';

export default function ReviewsFeedback() {
  const [reviews, setReviews] = useState<ReviewItem[]>(reviewItems);

  const setStatus = (id: number, status: ReviewItem['status']) => {
    setReviews((current) => current.map((review) => (review.id === id ? { ...review, status } : review)));
  };

  const columns: AdminTableColumn<ReviewItem>[] = [
    { header: 'Recipe', render: (review) => <span className="font-extrabold text-stone-900">{review.recipe}</span> },
    { header: 'User', render: (review) => review.user },
    { header: 'Rating', render: (review) => <span className="font-bold text-stone-900">{review.rating}/5</span> },
    { header: 'Feedback', render: (review) => <p className="max-w-xs leading-relaxed">{review.comment}</p> },
    { header: 'Created', render: (review) => review.createdAt },
    { header: 'Status', render: (review) => <StatusBadge tone={statusToneFromLabel(review.status)}>{review.status}</StatusBadge> },
    {
      header: 'Actions',
      render: (review) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full text-green-700" aria-label="Approve review" onClick={() => setStatus(review.id, 'Approved')}>
            <Check size={14} />
          </Button>
          <Button variant="ghost" size="icon-sm" className="rounded-full text-stone-500" aria-label="Hide review" onClick={() => setStatus(review.id, 'Hidden')}>
            <EyeOff size={14} />
          </Button>
          <Button variant="ghost" size="icon-sm" className="rounded-full text-red-500" aria-label="Flag review" onClick={() => setStatus(review.id, 'Flagged')}>
            <Flag size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Reviews and Feedback"
        description="Moderate recipe reviews, ratings, and feedback. Actions update local mock state only."
      />

      <AdminSectionCard title="Review Queue" description="Approve, hide, or flag feedback for future moderation workflows.">
        <AdminTable data={reviews} columns={columns} getRowKey={(review) => review.id} />
      </AdminSectionCard>
    </div>
  );
}
