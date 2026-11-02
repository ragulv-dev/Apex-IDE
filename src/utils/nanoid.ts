// Tiny nanoid replacement (no dependency needed)
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export function nanoid(length = 12): string {
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (const byte of array) {
    result += chars[byte % chars.length]
  }
  return result
}

