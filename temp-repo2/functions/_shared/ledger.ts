import type { Env } from './types';

export async function findCreditedDeposit(env: Env, txHash: string) {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding DB is required for production cashier ledger storage.');
  }

  return env.DB
    .prepare('SELECT tx_hash FROM credited_deposits WHERE tx_hash = ?')
    .bind(txHash)
    .first<{ tx_hash: string }>();
}

export async function recordCreditedDeposit(
  env: Env,
  deposit: {
    txHash: string;
    amount: number;
    coin: string;
    network: string;
    userId: string;
  }
) {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding DB is required for production cashier ledger storage.');
  }

  await env.DB
    .prepare(
      `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(deposit.txHash, deposit.amount, deposit.coin, deposit.network, deposit.userId, new Date().toISOString())
    .run();
}

export async function recordWithdrawal(
  env: Env,
  withdrawal: {
    withdrawOrderId: string;
    amount: number;
    coin: string;
    network: string;
    address: string;
    userId: string;
    binanceId?: string;
  }
) {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding DB is required for production cashier ledger storage.');
  }

  await env.DB
    .prepare(
      `INSERT INTO withdrawals (withdraw_order_id, amount, coin, network, address, user_id, requested_at, binance_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      withdrawal.withdrawOrderId,
      withdrawal.amount,
      withdrawal.coin,
      withdrawal.network,
      withdrawal.address,
      withdrawal.userId,
      new Date().toISOString(),
      withdrawal.binanceId || null
    )
    .run();
}

