/** Digits only */
export function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

/**
 * Indian mobile → stored as `+91` + 10 digits (no spaces), e.g. +919876543210
 * Accepts 10 digits, 0-prefix, or +91 prefix.
 */
export function normalizeIndianPhoneStorage(phone) {
  const d = digitsOnly(phone)
  let local10 = ''
  if (d.length === 12 && d.startsWith('91')) local10 = d.slice(2)
  else if (d.length === 10) local10 = d
  else if (d.length === 11 && d.startsWith('0')) local10 = d.slice(1)
  if (local10.length !== 10) return null
  if (!/^[6-9]\d{9}$/.test(local10)) return null
  return `+91${local10}`
}

export function isValidIndianMobile(phone) {
  return normalizeIndianPhoneStorage(phone) != null
}

/** 10-digit part only (6–9 leading). */
export function isValidIndianLocal10(local10) {
  const d = digitsOnly(local10)
  return d.length === 10 && /^[6-9]\d{9}$/.test(d)
}

/** Build stored value `+91XXXXXXXXXX` from exactly 10 local digits, or null. */
export function fullPhoneFromLocal10(local10) {
  const d = digitsOnly(local10).slice(0, 10)
  if (!isValidIndianLocal10(d)) return null
  return `+91${d}`
}

/** Prefill the 10-digit input from a stored or pasted full number. */
export function getIndianLocal10ForInput(phone) {
  if (phone == null || phone === '') return ''
  const d = digitsOnly(phone)
  if (d.length >= 12 && d.startsWith('91')) return d.slice(-10)
  if (d.length === 10) return d
  if (d.length === 11 && d.startsWith('0')) return d.slice(1)
  return d.length > 10 ? d.slice(-10) : d
}

/** @deprecated use normalizeIndianPhoneStorage for borrowers */
export function normalizePhone(phone) {
  const n = normalizeIndianPhoneStorage(phone)
  return n ?? String(phone || '').trim()
}

export function isValidPhone(phone) {
  return isValidIndianMobile(phone)
}

/**
 * @param {number} amount
 * @param {{ minLimit: number, maxLimit: number }} bounds
 */
export function loanAmountInBounds(amount, bounds) {
  const n = Number(amount)
  if (Number.isNaN(n)) return false
  return n >= bounds.minLimit && n <= bounds.maxLimit
}
