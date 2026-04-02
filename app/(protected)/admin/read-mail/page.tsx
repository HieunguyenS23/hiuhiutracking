import { requireAdmin } from '@/lib/session';
import { ReadMailCenter } from '@/components/read-mail-center';

export default async function AdminReadMailPage() {
  await requireAdmin();

  return (
    <div className="page-stack page-stack-spaced">
      <ReadMailCenter />
    </div>
  );
}
