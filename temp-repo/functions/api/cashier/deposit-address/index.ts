import { signedBinanceRequest, normalizeCoin, normalizeNetwork } from '../../../_shared/binance';
import { jsonResponse } from '../../../_shared/http';
import type { Env, PagesFunction } from '../../../_shared/types';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const coin = normalizeCoin(env, url.searchParams.get('coin') || undefined);
    const network = normalizeNetwork(env, url.searchParams.get('network') || undefined);

    const address = await signedBinanceRequest(env, 'GET', '/sapi/v1/capital/deposit/address', {
      coin,
      network
    });

    return jsonResponse({ success: true, address });
  } catch (error: any) {
    return jsonResponse({ success: false, message: error.message }, { status: 500 });
  }
};

