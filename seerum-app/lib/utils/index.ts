/**
 * Format Ethereum address to short form
 */
export function formatAddress(address: string, startLength: number = 6): string {
  if (!address) return "Unknown";
  return `${address.slice(0, startLength)}...${address.slice(-4)}`;
}

/**
 * Format currency values
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'number' ? value : parseFloat(value?.toString() || "0");
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  }
  return `$${num.toFixed(2)}`;
}

