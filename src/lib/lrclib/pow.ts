import crypto from 'crypto';

export async function sha256Hex(input: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  hash.update(input, 'utf8');
  return hash.digest('hex');
}

export function hexToBigInt(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + clean);
}

export async function solvePow(
  prefix: string,
  targetHex: string,
  maxMs = 15000
): Promise<{ nonce: string; duration: number } | null> {
  const target = hexToBigInt(targetHex);
  const deadline = Date.now() + maxMs;
  const startTime = Date.now();
  let i = 0;
  
  while (Date.now() < deadline) {
    const nonce = i.toString(16);
    const digest = await sha256Hex(prefix + nonce);
    if (hexToBigInt(digest) <= target) {
      return { nonce, duration: Date.now() - startTime };
    }
    i++;
    // Yield periodically to prevent blocking
    if ((i & 0x3fff) === 0) await new Promise((r) => setImmediate(r));
  }
  return null;
}
