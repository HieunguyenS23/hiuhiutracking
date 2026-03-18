const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

type SearchParams = {
  level: 'province' | 'district' | 'ward';
  query: string;
  province?: string;
  district?: string;
};

type AddressOption = {
  label: string;
  value: string;
  description: string;
};

function normalizeName(input: string) {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

export function hasGoogleMapsKey() {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

export async function searchAddressOptions(params: SearchParams): Promise<AddressOption[]> {
  if (!GOOGLE_MAPS_API_KEY || !params.query.trim()) return [];

  const baseQuery = params.level === 'province'
    ? `${params.query} Việt Nam`
    : params.level === 'district'
      ? `${params.query}, ${params.province || ''}, Việt Nam`
      : `${params.query}, ${params.district || ''}, ${params.province || ''}, Việt Nam`;

  const requestUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  requestUrl.searchParams.set('input', baseQuery.trim());
  requestUrl.searchParams.set('language', 'vi');
  requestUrl.searchParams.set('components', 'country:vn');
  requestUrl.searchParams.set('types', params.level === 'ward' ? 'geocode' : '(regions)');
  requestUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

  const response = await fetch(requestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Không gọi được Google Maps API.');
  }
  const payload = await response.json();
  const predictions = Array.isArray(payload.predictions) ? payload.predictions : [];

  const normalizedProvince = normalizeName(params.province || '');
  const normalizedDistrict = normalizeName(params.district || '');
  const seen = new Set<string>();

  return predictions
    .map((item: { description?: string }) => {
      const description = String(item.description || '').trim();
      const parts = description.split(',').map((part) => part.trim()).filter(Boolean);
      return {
        label: parts[0] || description,
        value: parts[0] || description,
        description,
      };
    })
    .filter((item: AddressOption) => {
      const normalizedDescription = normalizeName(item.description);
      if (params.level === 'district' && normalizedProvince && !normalizedDescription.includes(normalizedProvince)) {
        return false;
      }
      if (params.level === 'ward' && normalizedProvince && !normalizedDescription.includes(normalizedProvince)) {
        return false;
      }
      if (params.level === 'ward' && normalizedDistrict && !normalizedDescription.includes(normalizedDistrict)) {
        return false;
      }
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    })
    .slice(0, 8);
}

export async function validateAddressWithGoogleMaps(addressLine: string, ward: string, district: string, province: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    return { ok: true, skipped: true };
  }

  const requestUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  requestUrl.searchParams.set('address', `${addressLine}, ${ward}, ${district}, ${province}, Việt Nam`);
  requestUrl.searchParams.set('language', 'vi');
  requestUrl.searchParams.set('components', 'country:VN');
  requestUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

  const response = await fetch(requestUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Không xác thực được địa chỉ qua Google Maps.');
  }
  const payload = await response.json();
  const firstResult = Array.isArray(payload.results) ? payload.results[0] : null;
  if (!firstResult) {
    return { ok: false, message: 'Google Maps không tìm thấy địa chỉ này.' };
  }

  const normalizedAddress = normalizeName(firstResult.formatted_address || '');
  const matchesWard = normalizedAddress.includes(normalizeName(ward));
  const matchesDistrict = normalizedAddress.includes(normalizeName(district));
  const matchesProvince = normalizedAddress.includes(normalizeName(province));

  if (!matchesWard || !matchesDistrict || !matchesProvince) {
    return { ok: false, message: 'Địa chỉ chưa khớp với phường/xã, quận/huyện hoặc tỉnh/thành đã chọn.' };
  }

  return { ok: true, skipped: false, formattedAddress: firstResult.formatted_address as string };
}
