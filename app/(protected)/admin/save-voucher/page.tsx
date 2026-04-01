import { requireAdmin } from '@/lib/session';
import { SaveVoucherCenter } from '@/components/save-voucher-center';

export default async function SaveVoucherPage() {
  await requireAdmin();

  return (
    <div className="page-stack page-stack-spaced">
      <SaveVoucherCenter />
    </div>
  );
}
