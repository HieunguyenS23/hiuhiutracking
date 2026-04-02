import { requireAdmin } from '@/lib/session';
import { AddMailCenter } from '@/components/add-mail-center';

export default async function AdminAddMailPage() {
  await requireAdmin();

  return (
    <div className="page-stack page-stack-spaced">
      <AddMailCenter />
    </div>
  );
}
