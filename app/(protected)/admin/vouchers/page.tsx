import { requireAdmin } from '@/lib/session';
import { AdminVouchersManager } from '@/components/admin-vouchers-manager';

export default async function AdminVouchersPage() {
  await requireAdmin();

  return (
    <div className="page-stack page-stack-spaced">
      <AdminVouchersManager />
    </div>
  );
}
