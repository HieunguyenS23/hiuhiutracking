'use client';

import { useEffect, useState } from 'react';

type AddressLevel = 'province' | 'district' | 'ward';

type AddressOption = {
  label: string;
  value: string;
  description: string;
};

type Props = {
  label: string;
  level: AddressLevel;
  value: string;
  onChange: (value: string) => void;
  province?: string;
  district?: string;
  placeholder: string;
  disabled?: boolean;
};

export function AddressCombobox({ label, level, value, onChange, province, district, placeholder, disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open || disabled) return;
    if (query.trim().length < 2) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const search = new URLSearchParams({ level, query });
        if (province) search.set('province', province);
        if (district) search.set('district', district);
        const response = await fetch(`/api/address/search?${search.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tải được danh sách địa chỉ.');
        setOptions(Array.isArray(data.options) ? data.options : []);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Không tải được địa chỉ.');
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, level, province, district, disabled]);

  return (
    <label className="address-combobox">
      <span>{label}</span>
      <div className={`combo-shell ${disabled ? 'is-disabled' : ''}`}>
        <input
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              if (!value) setQuery('');
              else setQuery(value);
            }, 150);
          }}
          placeholder={placeholder}
        />
        <span className="combo-meta">{loading ? 'Đang tải...' : 'Google Maps'}</span>
      </div>
      {open && !disabled ? (
        <div className="combo-panel">
          {error ? <div className="combo-empty">{error}</div> : null}
          {!error && query.trim().length < 2 ? <div className="combo-empty">Gõ ít nhất 2 ký tự để tìm.</div> : null}
          {!error && query.trim().length >= 2 && !loading && options.length === 0 ? <div className="combo-empty">Không có kết quả phù hợp.</div> : null}
          {options.map((option) => (
            <button
              className="combo-option"
              key={option.description}
              type="button"
              onMouseDown={() => {
                onChange(option.value);
                setQuery(option.value);
                setOpen(false);
              }}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}
