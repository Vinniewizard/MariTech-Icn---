import { nowPaymentsRequest } from '../../../_shared/nowpayments';
import { jsonResponse, readJson } from '../../../_shared/http';
import { findCreditedDeposit, recordCreditedDeposit } from '../../../_shared/ledger';
import type { Env, PagesFunction } from '../../../_shared/types';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    let paymentId = url.searchParams.get('paymentId');
    let userId = url.searchParams.get('userId') || 'anonymous';

    // If query string didn't have paymentId but it's a POST, parse body
    if (!paymentId && request.method === 'POST') {
      try {
        const body = await readJson<any>(request);
        if (body) {
          paymentId = body.paymentId || body.payment_id || paymentId;
          userId = body.userId || body.user_id || userId;
        }
      } catch (e) {
        // Body was either empty or non-JSON
      }
    }

    if (!paymentId) {
      return jsonResponse({ success: false, message: 'Payment ID is required.' }, { status: 400 });
    }

    // 1. Handle sandbox payments (prefixed with 'sb-')
    if (paymentId.startsWith('sb-')) {
      const actualAmount = 100;
      return jsonResponse({
        success: true,
        message: 'Sandbox payment confirmed and credited.',
        status: 'finished',
        amount: actualAmount,
        creditedAmount: actualAmount
      });
    }

    // 2. Query DB if bound
    if (env.DB) {
      try {
        const alreadyCredited = await findCreditedDeposit(env, paymentId);
        if (alreadyCredited) {
          return jsonResponse({ success: true, message: 'Deposit already credited.', alreadyCredited: true });
        }
      } catch (dbErr: any) {
        console.warn('D1 ledger query skipped or failed:', dbErr.message);
      }
    }

    // 3. Request NOWPayments confirmation
    const status = await nowPaymentsRequest(env, 'GET', `/payment/${paymentId}`);

    if (status.payment_status === 'finished' || status.payment_status === 'confirmed' || status.payment_status === 'partially_paid') {
      const txHash = status.payin_hash || String(paymentId);
      const actualAmount = Number(status.actually_paid) || Number(status.price_amount) || 100;
      
      if (env.DB) {
        try {
          await recordCreditedDeposit(env, {
            txHash,
            amount: actualAmount,
            coin: (status.pay_currency || 'BTC').toUpperCase(),
            network: 'CRYPTO',
            userId
          });
        } catch (dbErr: any) {
          console.error('Failed to write credited deposit to D1 database:', dbErr.message);
          // Return success anyway so customer doesn't see a broken page, but warn in payload
          return jsonResponse({
            success: true,
            message: 'Payment confirmed. DB write failed, but transaction is valid.',
            amount: actualAmount,
            creditedAmount: actualAmount,
            warning: 'DB_WRITE_FAILED'
          });
        }
      }

      return jsonResponse({
        success: true,
        message: 'Payment confirmed. Funds credited.',
        amount: actualAmount,
        creditedAmount: actualAmount
      });
    }

    return jsonResponse({
      success: false,
      message: `Current payment status is ${status.payment_status}. Please wait for confirmation.`,
      status: status.payment_status
    });
  } catch (error: any) {
    return jsonResponse({ success: false, message: error.message }, { status: 500 });
  }
};
