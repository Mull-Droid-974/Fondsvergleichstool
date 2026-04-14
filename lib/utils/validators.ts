/**
 * Validates an ISIN using the Luhn algorithm (modulo 10 checksum).
 * Format: 2-letter country code + 9 alphanumeric + 1 check digit
 */
export function validateIsin(isin: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
    return false
  }

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  const digits = isin
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0)
      return code >= 65 ? String(code - 55) : c
    })
    .join("")

  // Luhn algorithm
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }

  return sum % 10 === 0
}

export function normalizeIsin(isin: string): string {
  return isin.trim().toUpperCase()
}

export function isValidIsinFormat(isin: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(normalizeIsin(isin))
}
