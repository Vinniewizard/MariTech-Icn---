import { nowPaymentsRequest } from '../../../_shared/nowpayments';
import { jsonResponse, readJson } from '../../../_shared/http';
import type { Env, PagesFunction } from '../../../_shared/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<any>(request);
    const { amount, coin, userId } = body;
    const parsedAmount = Number(amount);
    const selectedCoin = (coin || 'btc').toLowerCase();

    const apiKey = env.NOWPAYMENTS_API_KEY;
    const hasValidKey = apiKey && apiKey.trim() !== '' && !apiKey.includes('placeholder');

    if (!hasValidKey) {
      // Sandbox fallback flow - returns instantly a valid mock address and session
      const mockAddresses: Record<string, string> = {
        btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        usdt: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        usdttrc20: 'TYD6Z98LpP7R1846T89TpyP6S7P97B'
      };
      const address = mockAddresses[selectedCoin] || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
      
      // Mock coin value
      let coinAmount = parsedAmount;
      if (selectedCoin === 'btc') coinAmount = parsedAmount * 0.000015;
      else if (selectedCoin === 'eth') coinAmount = parsedAmount * 0.0003;

      const paymentId = `sb-${Date.now()}-${userId}`;

      return jsonResponse({
        success: true,
        address: address,
        paymentId: paymentId,
        payment_id: paymentId,
        coin: selectedCoin.toUpperCase(),
        amount: parseFloat(coinAmount.toFixed(6)),
        status: 'waiting'
      });
    }

    const payment = await nowPaymentsRequest(env, 'POST', '/payment', {
      price_amount: parsedAmount,
      price_currency: 'usd',
      pay_currency: selectedCoin,
      order_id: `dep-${Date.now()}-${userId}`,
      order_description: 'User Balance Deposit',
      ipn_callback_url: env.IPN_CALLBACK_URL || undefined
    });

    return jsonResponse({
        success: true,
        address: payment.pay_address,
        paymentId: payment.payment_id,
        payment_id: payment.payment_id,
        coin: payment.pay_currency,
        amount: payment.pay_amount,
        status: payment.payment_status || 'waiting'
    });
  } catch (error: any) {
    return jsonResponse({ success: false, message: error.message }, { status: 500 });
  }
};
