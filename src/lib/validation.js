export function normalizePhone(phone) {
  return String(phone || '').trim()
}

export function isValidPhone(phone) {
  const p = normalizePhone(phone)
  return p.length >= 8 && p.length <= 20
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
