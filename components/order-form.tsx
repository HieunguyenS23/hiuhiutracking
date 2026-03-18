'use client';

import { useMemo, useState } from 'react';
import type { VoucherType } from '@/lib/types';
import { locationTree } from '@/lib/locations';

const voucherOptions: { value: VoucherType; label: string }[] = [
  { value: '100k', label: 'Mã 100k' },
  { value: '80k', label: 'Mã 80k' },
  { value: '60k', label: 'Mã 60k' },
];

export function OrderForm() {
  const [province, setProvince] = useState<string>(locationTree[0].province);
  const [district, setDistrict] = useState<string>(locationTree[0].districts[0].district);
  const [ward, setWard] = useState<string>(locationTree[0].districts[0].wards[0]);
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

  const provinceData = useMemo(() => locationTree.find((item) => item.province === province) || locationTree[0], [province]);
  const districtData = useMemo(() => provinceData.districts.find((item) => item.district === district) || provinceData.districts[0], [provinceData, district]);

  function onProvinceChange(value: string) {
    const nextProvince = locationTree.find((item) => item.province === value) || locationTree[0];
    setProvince(nextProvince.province);
    setDistrict(nextProvince.districts[0].district);
    setWard(nextProvince.districts[0].wards[0]);
  }

  function onDistrictChange(value: string) {
    const nextDistrict = provinceData.districts.find((item) => item.district === value) || provinceData.districts[0];
    setDistrict(nextDistrict.district);
    setWard(nextDistrict.wards[0]);
  }

  async function submitOrder() {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, phone, addressLine, ward, district, province, voucherType, productLink, variant, quantity: Number(quantity) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không gửi được đơn.');
      setRecipientName('');
      setPhone('');
      setAddressLine('');
      setVoucherType('100k');
      setProductLink('');
      setVariant('');
      setQuantity('1');
      setMessage('Đơn đã được gửi thành công.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Lên đơn</p>
          <h2>Điền thông tin đặt hàng</h2>
        </div>
        <span className="chip">Mobile-first</span>
      </div>
      <div className="form-grid compact">
        <label><span>Tên người nhận</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nguyễn Văn A" /></label>
        <label><span>Số điện thoại</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09xxxxxxxx" /></label>
        <label className="full-span"><span>Địa chỉ cụ thể</span><input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="Số nhà, tên đường, toà nhà..." /></label>
        <label><span>Tỉnh / Thành phố</span><select value={province} onChange={(event) => onProvinceChange(event.target.value)}>{locationTree.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}</select></label>
        <label><span>Quận / Huyện</span><select value={district} onChange={(event) => onDistrictChange(event.target.value)}>{provinceData.districts.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}</select></label>
        <label><span>Phường / Xã</span><select value={ward} onChange={(event) => setWard(event.target.value)}>{districtData.wards.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Loại mã</span><select value={voucherType} onChange={(event) => setVoucherType(event.target.value as VoucherType)}>{voucherOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="full-span"><span>Link sản phẩm</span><input value={productLink} onChange={(event) => setProductLink(event.target.value)} placeholder="https://shopee.vn/..." /></label>
        <label><span>Phân loại sản phẩm</span><input value={variant} onChange={(event) => setVariant(event.target.value)} placeholder="Màu đỏ / size M" /></label>
        <label><span>Số lượng</span><input value={quantity} min="1" type="number" onChange={(event) => setQuantity(event.target.value)} /></label>
      </div>
      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}
      <button className="primary-button" disabled={loading} onClick={submitOrder} type="button">{loading ? 'Đang gửi đơn...' : 'Gửi đơn'}</button>
    </section>
  );
}

