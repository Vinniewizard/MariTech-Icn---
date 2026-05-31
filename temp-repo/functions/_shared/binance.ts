import type { Env } from './types';

const encoder = new TextEncoder();

async function hmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function normalizeCoin(env: Env, coin?: string) {
  return (coin || env.BINANCE_DEPOSIT_COIN || 'USDT').trim().toUpperCase();
}

export function normalizeNetwork(env: Env, network?: string) {
  return (network || env.BINANCE_DEPOSIT_NETWORK || 'BSC').trim().toUpperCase();
}

export async function signedBinanceRequest(
  env: Env,
  method: 'GET' | 'POST',
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>
) {
  if (!env.BINANCE_API_KEY || !env.BINANCE_SECRET) {
    throw new Error('Server Binance integration is not configured.');
  }

  const query = new URLSearchParams();
  Object.entries({
    ...params,
    recvWindow: params.recvWindow ?? 5000,
    timestamp: Date.now()
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });

  query.set('signature', await hmacSha256(env.BINANCE_SECRET, query.toString()));

  const baseUrl = env.BINANCE_BASE_URL || 'https://api.binance.com';
  const response = await fetch(`${baseUrl}${endpoint}?${query.toString()}`, {
    method,
    headers: { 'X-MBX-APIKEY': env.BINANCE_API_KEY }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.msg || payload?.message || `Binance request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

