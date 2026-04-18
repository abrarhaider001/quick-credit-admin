import { digitsOnly, normalizeIndianPhoneStorage } from './validation'

/** @param {import('firebase/firestore').Timestamp | undefined} ts */
export function formatDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** @param {import('firebase/firestore').Timestamp | undefined} ts */
export function toDatetimeLocalValue(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** @param {string} local */
export function fromDatetimeLocal(local) {
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number(n))
}

/**
 * Display stored phone as compact `+913010668945` (same as Firestore).
 * @param {string | undefined} phone
 */
export function formatIndianPhoneDisplay(phone) {
  if (phone == null || phone === '') return '—'
  const n = normalizeIndianPhoneStorage(phone)
  if (n) return n
  const d = digitsOnly(phone)
  let local = ''
  if (d.length >= 12 && d.startsWith('91')) local = d.slice(-10)
  else if (d.length === 10) local = d
  else if (d.length === 11 && d.startsWith('0')) local = d.slice(1)
  if (local.length === 10) return `+91${local}`
  return String(phone)
}

/** Groups digits as `1234 5678 9012 8842` for bank account / card-style display (max 16 digits). */
export function formatCardNumberInput(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}
