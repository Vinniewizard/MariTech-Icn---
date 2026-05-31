import { verifyIPNSignature } from '../../../_shared/nowpayments';
import { jsonResponse, readJson } from '../../../_shared/http';
import { recordCreditedDeposit, findCreditedDeposit } from '../../../_shared/ledger';
import type { Env, PagesFunction } from '../../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const signature = request.headers.get('x-nowpayments-sig');
    const body = await readJson<any>(request);

    if (!signature || !await verifyIPNSignature(env, body, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const { payment_status, order_id, actually_paid, pay_currency, payment_id } = body;

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      const txHash = body.payin_hash || String(payment_id);
      
      const alreadyCredited = await findCreditedDeposit(env, txHash);
      if (alreadyCredited) {
        return new Response('Already processed', { status: 200 });
      }

      const parts = order_id.split('-');
      const userId = parts[parts.length - 1];

      await recordCreditedDeposit(env, {
        txHash,
        amount: Number(actually_paid),
        coin: String(pay_currency).toUpperCase(),
        network: 'CRYPTO',
        userId
      });
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    return new Response('Error', { status: 500 });
  }
};
