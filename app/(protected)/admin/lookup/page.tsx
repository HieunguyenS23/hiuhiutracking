import { requireAdmin } from '@/lib/session';
import { LookupCenter } from '@/components/lookup-center';

export default async function AdminLookupPage() {
  await requireAdmin();

  return (
    <div className="page-stack page-stack-spaced">
      <LookupCenter />
    </div>
  );
}
