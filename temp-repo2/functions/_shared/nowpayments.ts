import type { Env } from './types';

export async function nowPaymentsRequest(
  env: Env,
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any
) {
  const apiKey = env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable is missing on Cloudflare runtime.');
  }

  const baseUrl = env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.msg || `NOWPayments request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function verifyIPNSignature(env: Env, body: any, signature: string) {
    const secret = env.NOWPAYMENTS_IPN_SECRET;
    if (!secret || !signature) return false;

    // NOWPayments IPN signature is HMAC-SHA512 of sorted JSON body
    const sortedKeys = Object.keys(body).sort();
    const sortedObj: any = {};
    for (const key of sortedKeys) {
        sortedObj[key] = body[key];
    }
    const message = JSON.stringify(sortedObj);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    );
    const sigArrayBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const hexSignature = Array.from(new Uint8Array(sigArrayBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return hexSignature === signature;
}
