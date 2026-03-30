'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VoucherType } from '@/lib/types';
import { locationTree } from '@/lib/locations';
import { hasAtLeastTwoWords, isValidVietnamPhone } from '@/lib/validators';

const voucherOptions: { value: VoucherType; label: string }[] = [
  { value: '100k', label: 'Mã 100k' },
  { value: '80k', label: 'Mã 80k' },
  { value: '60k', label: 'Mã 60k' },
];

export function OrderForm() {
  const router = useRouter();
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [voucherType, setVoucherType] = useState<VoucherType>('100k');
  const [productLink, setProductLink] = useState('');
  const [variant, setVariant] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const province = useMemo(() => locationTree.find((item) => item.code === provinceCode) || null, [provinceCode]);
  const district = useMemo(() => province?.districts.find((item) => item.code === districtCode) || null, [province, districtCode]);
  const ward = useMemo(() => district?.wards.find((item) => item.code === wardCode) || null, [district, wardCode]);

  async function submitOrder() {
    setLoading(true);
    setMessage('');
    setError('');

    if (!hasAtLeastTwoWords(recipientName)) {
      setLoading(false);
      setError('Tên người nhận phải có ít nhất 2 từ.');
      return;
    }
    if (!isValidVietnamPhone(phone)) {
      setLoading(false);
      setError('Số điện thoại phải đúng 10 chữ số.');
      return;
    }
    if (!province || !district || !ward) {
      setLoading(false);
      setError('Vui lòng chọn đủ tỉnh, quận và phường từ dropdown.');
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          phone,
          addressLine,
          ward: ward.fullName,
          district: district.fullName,
          province: province.fullName,
          voucherType,
          productLink,
          variant,
          quantity: Number(quantity),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không gửi được đơn.');
      setRecipientName('');
      setPhone('');
      setAddressLine('');
      setProvinceCode('');
      setDistrictCode('');
      setWardCode('');
      setVoucherType('100k');
      setProductLink('');
      setVariant('');
      setQuantity('1');
      setMessage('Đơn đã được gửi thành công.');
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card order-form-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Lên đơn</p>
          <h2>Điền thông tin đặt hàng</h2>
        </div>
      </div>
      <div className="form-grid compact">
        <label><span>Tên người nhận</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nguyễn Văn A" /></label>
        <label><span>Số điện thoại</span><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="09xxxxxxxx" /></label>
        <label className="full-span"><span>Địa chỉ cụ thể</span><input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="Số nhà, tên đường, toà nhà..." /></label>
        <label>
          <span>Tỉnh / Thành phố</span>
          <select value={provinceCode} onChange={(event) => { setProvinceCode(event.target.value); setDistrictCode(''); setWardCode(''); }}>
            <option value="">Chọn tỉnh / thành</option>
            {locationTree.map((item) => <option key={item.code} value={item.code}>{item.fullName}</option>)}
          </select>
        </label>
        <label>
          <span>Quận / Huyện</span>
          <select value={districtCode} disabled={!province} onChange={(event) => { setDistrictCode(event.target.value); setWardCode(''); }}>
            <option value="">Chọn quận / huyện</option>
            {(province?.districts || []).map((item) => <option key={item.code} value={item.code}>{item.fullName}</option>)}
          </select>
        </label>
        <label>
          <span>Phường / Xã</span>
          <select value={wardCode} disabled={!district} onChange={(event) => setWardCode(event.target.value)}>
            <option value="">Chọn phường / xã</option>
            {(district?.wards || []).map((item) => <option key={item.code} value={item.code}>{item.fullName}</option>)}
          </select>
        </label>
        <label>
          <span>Loại mã</span>
          <select value={voucherType} onChange={(event) => setVoucherType(event.target.value as VoucherType)}>
            {voucherOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="full-span"><span>Link sản phẩm</span><input value={productLink} onChange={(event) => setProductLink(event.target.value)} placeholder="https://shopee.vn/..." /></label>
        <label><span>Phân loại sản phẩm</span><input value={variant} onChange={(event) => setVariant(event.target.value)} placeholder="Màu đỏ / size M" /></label>
        <label><span>Số lượng</span><input value={quantity} min="1" type="number" onChange={(event) => setQuantity(event.target.value)} /></label>
      </div>
      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}
      <div className="submit-bar">
        <button className="primary-button" disabled={loading} onClick={submitOrder} type="button">{loading ? 'Đang gửi đơn...' : 'Gửi đơn'}</button>
      </div>
    </section>
  );
}

