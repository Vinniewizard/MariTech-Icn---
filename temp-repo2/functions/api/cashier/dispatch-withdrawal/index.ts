import { nowPaymentsRequest } from '../../../_shared/nowpayments';
import { jsonResponse, readJson } from '../../../_shared/http';
import type { Env, PagesFunction } from '../../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<any>(request);
    const { amount, coin } = body;
    const address = body.targetAddress || body.address;

    if (!env.NOWPAYMENTS_WITHDRAWALS_ENABLED) {
        return jsonResponse({ success: false, message: 'Withdrawals are currently disabled for maintenance.' }, { status: 403 });
    }

    const payout = await nowPaymentsRequest(env, 'POST', '/payout', {
      withdrawals: [
        {
          address,
          currency: String(coin).toLowerCase(),
          amount: Number(amount)
        }
      ]
    });

    return jsonResponse({
        success: true,
        message: 'Withdrawal dispatch successful.',
        withdrawalId: payout.id || payout.payout_id,
        status: payout.status
    });
  } catch (error: any) {
    return jsonResponse({ success: false, message: error.message }, { status: 500 });
  }
};
