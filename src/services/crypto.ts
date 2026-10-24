/**
 * Mulberry AES-256-GCM Decryption Engine
 * Uses the Web Crypto API for high-performance in-memory decryption.
 */

export const AES_KEY_HEX = 'f0e67a11bcd402d9851a86dcd157e0257155b7755567dcabb3603216ff04095a';

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

let cachedCryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }
  const keyBytes = hexToBytes(AES_KEY_HEX);
  cachedCryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  return cachedCryptoKey;
}

/**
 * Checks if the binary buffer is already unencrypted PDF (magic bytes %PDF-)
 */
function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const header = new Uint8Array(buffer, 0, 5);
  // ASCII %PDF- is [0x25, 0x50, 0x44, 0x46, 0x2D]
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  );
}

/**
 * Decrypts an AES-256-GCM encrypted binary buffer into raw PDF ArrayBuffer.
 * In the Mulberry storage format:
 * - Bytes 0..11 (12 bytes): IV (Initialization Vector)
 * - Bytes 12..end: Ciphertext + 16-byte Auth Tag
 */
export async function decryptBookBinary(encryptedBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  // If it's already an unencrypted PDF, return directly
  if (isPdfBuffer(encryptedBuffer)) {
    return encryptedBuffer;
  }

  if (encryptedBuffer.byteLength <= 12 + 16) {
    throw new Error('Encrypted file buffer is too small to contain IV and ciphertext.');
  }

  const iv = new Uint8Array(encryptedBuffer, 0, 12);
  const data = new Uint8Array(encryptedBuffer, 12);
  const key = await getCryptoKey();

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    return decryptedBuffer;
  } catch (error) {
    // If standard 12-byte IV fails, check if 16-byte IV was used
    try {
      const iv16 = new Uint8Array(encryptedBuffer, 0, 16);
      const data16 = new Uint8Array(encryptedBuffer, 16);
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv16,
        },
        key,
        data16
      );
      return decryptedBuffer;
    } catch {
      throw new Error('Decryption failed. Please verify the file integrity.');
    }
  }
}
