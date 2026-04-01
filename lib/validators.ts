export function isValidVietnamPhone(phone: string) {
  return /^\d{10}$/.test(phone.trim());
}

export function hasAtLeastTwoWords(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}

export function isValidUsername(value: string) {
  return /^[a-z0-9_]{5,}$/.test(String(value || '').trim());
}


