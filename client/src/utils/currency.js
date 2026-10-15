/**
 * Currency utilities for Indian Rupee (INR) formatting throughout FreelanceFlow.
 * Enforces standard en-IN Indian number grouping (e.g. ₹1,25,000.00).
 */

export const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a numeric amount into standard INR currency string.
 * @param {number|string} amount 
 * @returns {string} e.g. "₹1,25,000.00"
 */
export function formatINR(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return inrFormatter.format(numeric);
}

/**
 * Format hourly rate with /hr suffix.
 * @param {number|string} rate
 * @returns {string} e.g. "₹2,500.00/hr"
 */
export function formatRateINR(rate) {
  return `${formatINR(rate)}/hr`;
}

/**
 * Compact or integer INR formatter for chart axes and summary cards.
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,25,000"
 */
export function formatINRCompact(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return inrWholeFormatter.format(numeric);
}
