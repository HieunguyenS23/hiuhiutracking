'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VoucherType } from '@/lib/types';
import { locationTree } from '@/lib/locations';
import { hasAtLeastTwoWords, isValidVietnamPhone } from '@/lib/validators';

type VoucherOption = {
  id: string;
  label: string;
  price: number;
  active: boolean;
};

function normalizeKeyword(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findExactByName<T extends { name: string }>(items: T[], keyword: string) {
  const key = normalizeKeyword(keyword);
  if (!key) return null;
  return items.find((item) => normalizeKeyword(item.name) === key) || null;
}

export function OrderForm() {
  const router = useRouter();
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [provinceQuery, setProvinceQuery] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [wardQuery, setWardQuery] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [voucherType, setVoucherType] = useState<VoucherType>('100k');
  const [voucherOptions, setVoucherOptions] = useState<VoucherOption[]>([]);
  const [orderFormEnabled, setOrderFormEnabled] = useState(true);
  const [productLink, setProductLink] = useState('');
  const [variant, setVariant] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const province = useMemo(() => locationTree.find((item) => item.code === provinceCode) || null, [provinceCode]);
  const district = useMemo(() => province?.districts.find((item) => item.code === districtCode) || null, [province, districtCode]);
  const ward = useMemo(() => district?.wards.find((item) => item.code === wardCode) || null, [district, wardCode]);

  const districtOptions = province?.districts || [];
  const wardOptions = district?.wards || [];

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [voucherResponse, settingsResponse] = await Promise.all([
          fetch('/api/vouchers', { cache: 'no-store' }),
          fetch('/api/settings', { cache: 'no-store' }),
        ]);
        const voucherData = await voucherResponse.json();
        const settingsData = await settingsResponse.json();
        if (!voucherResponse.ok) throw new Error(voucherData.error || 'Không tải được voucher.');
        if (!settingsResponse.ok) throw new Error(settingsData.error || 'Không tải được cài đặt form.');

        const activeVouchers = (Array.isArray(voucherData.vouchers) ? voucherData.vouchers : []).filter((item: VoucherOption) => item.active);
        setVoucherOptions(activeVouchers);
        setOrderFormEnabled(Boolean(settingsData.settings?.orderFormEnabled !== false));
        if (activeVouchers.length > 0 && !activeVouchers.some((item: VoucherOption) => item.id === voucherType)) {
          setVoucherType(activeVouchers[0].id);
        }
      } catch (configError) {
        setError(configError instanceof Error ? configError.message : 'Không tải được cấu hình voucher.');
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  function onProvinceInput(value: string) {
    setProvinceQuery(value);
    const matched = findExactByName(locationTree, value);
    const nextProvinceCode = matched?.code || '';

    if (nextProvinceCode !== provinceCode) {
      setProvinceCode(nextProvinceCode);
      setDistrictCode('');
      setWardCode('');
      setDistrictQuery('');
      setWardQuery('');
    }
  }

  function onDistrictInput(value: string) {
    setDistrictQuery(value);
    const matched = findExactByName(districtOptions, value);
    const nextDistrictCode = matched?.code || '';

    if (nextDistrictCode !== districtCode) {
      setDistrictCode(nextDistrictCode);
      setWardCode('');
      setWardQuery('');
    }
  }

  function onWardInput(value: string) {
    setWardQuery(value);
    const matched = findExactByName(wardOptions, value);
    setWardCode(matched?.code || '');
  }

  async function submitOrder() {
    setLoading(true);
    setMessage('');
    setError('');

    if (!orderFormEnabled) {
      setLoading(false);
      setError('Form lên đơn đang tạm đóng. Vui lòng quay lại sau.');
      return;
    }

    if (!hasAtLeastTwoWords(recipientName)) {
      setLoading(false);
      setError('Tên người nhận phải có ít nhất 2 từ.');
      return;
    }
    if (phone.trim() && !isValidVietnamPhone(phone)) {
      setLoading(false);
      setError('Số điện thoại phải đúng 10 chữ số hoặc để trống.');
      return;
    }
    if (!province || !district || !ward) {
      setLoading(false);
      setError('Vui lòng chọn đủ tỉnh, huyện và xã từ danh sách gợi ý.');
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
          ward: ward.name,
          district: district.name,
          province: province.name,
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
      setProvinceQuery('');
      setDistrictQuery('');
      setWardQuery('');
      setVoucherType(voucherOptions[0]?.id || '');
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
    <section className="phone-card order-form-card ui-polish-order-form">
      <div className="section-head">
        <div>
          <p className="eyebrow">Lên đơn</p>
          <h2>Điền thông tin đặt hàng</h2>
        </div>
        <span className="chip chip-soft">Form mới</span>
      </div>
      {!orderFormEnabled ? <div className="inline-error">Form lên đơn đang tạm đóng để xử lí hết hàng.</div> : null}
      <div className="form-grid compact order-form-grid-modern">
        <label><span>Tên người nhận</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Nguyễn Văn A" /></label>
        <label><span>Số điện thoại</span><input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="09xxxxxxxx (có thể để trống)" /></label>

        <label>
          <span>Tỉnh / Thành phố</span>
          <input
            list="province-options"
            value={provinceQuery}
            onChange={(event) => onProvinceInput(event.target.value)}
            placeholder="Gõ để tìm nhanh"
            autoComplete="off"
          />
          <datalist id="province-options">
            {locationTree.map((item) => <option key={item.code} value={item.name} />)}
          </datalist>
        </label>

        <label>
          <span>Quận / Huyện</span>
          <input
            list="district-options"
            value={districtQuery}
            onChange={(event) => onDistrictInput(event.target.value)}
            placeholder={province ? 'Gõ để tìm nhanh' : 'Chọn tỉnh trước'}
            autoComplete="off"
            disabled={!province}
          />
          <datalist id="district-options">
            {districtOptions.map((item) => <option key={item.code} value={item.name} />)}
          </datalist>
        </label>

        <label>
          <span>Phường / Xã</span>
          <input
            list="ward-options"
            value={wardQuery}
            onChange={(event) => onWardInput(event.target.value)}
            placeholder={district ? 'Gõ để tìm nhanh' : 'Chọn huyện trước'}
            autoComplete="off"
            disabled={!district}
          />
          <datalist id="ward-options">
            {wardOptions.map((item) => <option key={item.code} value={item.name} />)}
          </datalist>
        </label>

        <label><span>Địa chỉ cụ thể</span><input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="Số nhà, tên đường, toà nhà..." /></label>

        <label>
          <span>Loại mã</span>
          <select value={voucherType} onChange={(event) => setVoucherType(event.target.value as VoucherType)} disabled={!orderFormEnabled || voucherOptions.length === 0}>
            {voucherOptions.map((item) => <option key={item.id} value={item.id}>{item.label} - {item.price.toLocaleString('vi-VN')}đ</option>)}
          </select>
        </label>
        <label><span>Link sản phẩm</span><input value={productLink} onChange={(event) => setProductLink(event.target.value)} placeholder="https://shopee.vn/..." /></label>
        <label><span>Phân loại sản phẩm</span><input value={variant} onChange={(event) => setVariant(event.target.value)} placeholder="Màu đỏ / size M" /></label>
        <label><span>Số lượng</span><input value={quantity} min="1" type="number" onChange={(event) => setQuantity(event.target.value)} /></label>
      </div>
      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}
      <div className="submit-bar">
        <button className="primary-button" disabled={loading || !orderFormEnabled || voucherOptions.length === 0} onClick={submitOrder} type="button">{loading ? 'Đang gửi đơn...' : 'Gửi đơn'}</button>
      </div>
    </section>
  );
}

