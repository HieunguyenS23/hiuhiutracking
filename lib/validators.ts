export function isValidVietnamPhone(phone: string) {
  return /^\d{10}$/.test(phone.trim());
}

export function hasAtLeastThreeWords(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 3;
}
