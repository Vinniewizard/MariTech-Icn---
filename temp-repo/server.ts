import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs/promises';
import multer from 'multer';

dotenv.config({ path: ['.env.local', '.env', '.env.example'] });

const __filename = typeof import.meta !== 'undefined' && import.meta.url 
  ? fileURLToPath(import.meta.url) 
  : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const cashierLedgerPath = path.join(process.cwd(), 'cashier-ledger.json');
const uploadDir = path.join(process.cwd(), 'uploads');

// Node.js SQLite integration mimicking Cloudflare D1
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
const { Pool } = pg;

let pgPoolInstance: pg.Pool | null = null;
let d1DbInstance: any = null;

function convertQueryPlaceholders(query: string): string {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
}

function getD1Database() {
  if (d1DbInstance) return d1DbInstance;

  const dbUrl = process.env.DATABASE_URL;
  const isPostgres = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));

  if (isPostgres) {
    console.log(`[Database Setup] Connecting to cloud PostgreSQL database.`);
    if (!pgPoolInstance) {
      pgPoolInstance = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });
    }

    // Bootstrap PostgreSQL schema
    const runPostgresBootstrap = async () => {
      const client = await pgPoolInstance!.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            account_type TEXT DEFAULT 'demo',
            demo_balance REAL DEFAULT 10000.00,
            real_balance REAL DEFAULT 0.00,
            force_outcome TEXT DEFAULT '',
            profit_target REAL DEFAULT 0.00,
            max_win_limit REAL DEFAULT 0.00,
            max_loss_limit REAL DEFAULT 0.00,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_login TEXT
          );

          ALTER TABLE users ADD COLUMN IF NOT EXISTS force_outcome TEXT DEFAULT '';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS profit_target REAL DEFAULT 0.00;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS max_win_limit REAL DEFAULT 0.00;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS max_loss_limit REAL DEFAULT 0.00;


          CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS user_profiles (
            user_id TEXT PRIMARY KEY,
            phone TEXT,
            country TEXT,
            verification_status TEXT DEFAULT 'unverified',
            two_factor_enabled INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS credited_deposits (
            tx_hash TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            coin TEXT NOT NULL,
            network TEXT NOT NULL,
            user_id TEXT NOT NULL,
            credited_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS withdrawals (
            withdraw_order_id TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            coin TEXT NOT NULL,
            network TEXT NOT NULL,
            address TEXT NOT NULL,
            user_id TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            binance_id TEXT
          );

          CREATE TABLE IF NOT EXISTS pending_deposits (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            receipt_path TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            payment_method TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS password_resets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            referrer_id TEXT NOT NULL,
            referred_user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS group_chat_messages (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            author_name TEXT,
            content TEXT,
            is_bot INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            image_url TEXT
          );

          CREATE TABLE IF NOT EXISTS app_settings (
            id TEXT PRIMARY KEY,
            chat_enabled INTEGER DEFAULT 1
          );
          INSERT INTO app_settings (id, chat_enabled) VALUES ('global', 1) ON CONFLICT (id) DO NOTHING;

          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
        `);
        console.log('[Database Setup] PostgreSQL schema and migrations complete.');
      } catch (err) {
        console.error('[Database Setup] Error running PostgreSQL migrations:', err);
      } finally {
        client.release();
      }
    };
    runPostgresBootstrap();

    class PostgresPreparedStatement {
      private query: string;
      private boundValues: any[] = [];

      constructor(query: string) {
        this.query = query;
      }

      bind(...values: any[]) {
        this.boundValues = values.map((v) => (v === undefined ? null : v));
        return this;
      }

      async first<T = any>(): Promise<T | null> {
        const pgQuery = convertQueryPlaceholders(this.query);
        const res = await pgPoolInstance!.query(pgQuery, this.boundValues);
        return res.rows.length > 0 ? (res.rows[0] as T) : null;
      }

      async run(): Promise<{ success: boolean }> {
        const pgQuery = convertQueryPlaceholders(this.query);
        await pgPoolInstance!.query(pgQuery, this.boundValues);
        return { success: true };
      }

      async all<T = any>(): Promise<{ results: T[] }> {
        const pgQuery = convertQueryPlaceholders(this.query);
        const res = await pgPoolInstance!.query(pgQuery, this.boundValues);
        return { results: res.rows as T[] };
      }
    }

    d1DbInstance = {
      prepare(query: string) {
        return new PostgresPreparedStatement(query);
      },
      exec(query: string) {
        return pgPoolInstance!.query(query);
      }
    };

    return d1DbInstance;
  }

  // SQLite fallback
  const dbPath = path.join(process.cwd(), 'lwex.db');
  console.log(`[D1 Setup] Connecting to SQLite database at: ${dbPath}`);

  try {
    const rawDb = new DatabaseSync(dbPath);

    // Bootstrap migrations to simulate D1 Database schema
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        account_type TEXT DEFAULT 'demo',
        demo_balance REAL DEFAULT 10000.00,
        real_balance REAL DEFAULT 0.00,
        force_outcome TEXT DEFAULT '',
        profit_target REAL DEFAULT 0.00,
        max_win_limit REAL DEFAULT 0.00,
        max_loss_limit REAL DEFAULT 0.00,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login TEXT
      );
    `);

    try { rawDb.exec("ALTER TABLE users ADD COLUMN force_outcome TEXT DEFAULT ''"); } catch(e) {}
    try { rawDb.exec("ALTER TABLE users ADD COLUMN profit_target REAL DEFAULT 0.00"); } catch(e) {}
    try { rawDb.exec("ALTER TABLE users ADD COLUMN max_win_limit REAL DEFAULT 0.00"); } catch(e) {}
    try { rawDb.exec("ALTER TABLE users ADD COLUMN max_loss_limit REAL DEFAULT 0.00"); } catch(e) {}

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        phone TEXT,
        country TEXT,
        verification_status TEXT DEFAULT 'unverified',
        two_factor_enabled INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS credited_deposits (
        tx_hash TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        coin TEXT NOT NULL,
        network TEXT NOT NULL,
        user_id TEXT NOT NULL,
        credited_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        withdraw_order_id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        coin TEXT NOT NULL,
        network TEXT NOT NULL,
        address TEXT NOT NULL,
        user_id TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        binance_id TEXT
      );

      CREATE TABLE IF NOT EXISTS pending_deposits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        receipt_path TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        payment_method TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        referred_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS group_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        author_name TEXT,
        content TEXT,
        is_bot INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        chat_enabled INTEGER DEFAULT 1
      );
      INSERT INTO app_settings (id, chat_enabled) VALUES ('global', 1) ON CONFLICT (id) DO NOTHING;

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
    `);

    // Builder for prepared statements to replicate the Cloudflare D1 query API structure
    class D1PreparedStatementNode {
      private stmt: any;
      private boundValues: any[] = [];

      constructor(stmt: any) {
        this.stmt = stmt;
      }

      bind(...values: any[]) {
        this.boundValues = values.map((v) => (v === undefined ? null : v));
        return this;
      }

      async first<T = any>(): Promise<T | null> {
        const rows = this.stmt.all(...this.boundValues);
        return rows.length > 0 ? (rows[0] as T) : null;
      }

      async run(): Promise<{ success: boolean }> {
        this.stmt.run(...this.boundValues);
        return { success: true };
      }

      async all<T = any>(): Promise<{ results: T[] }> {
        const rows = this.stmt.all(...this.boundValues);
        return { results: rows as T[] };
      }
    }

    d1DbInstance = {
      prepare(query: string) {
        const stmt = rawDb.prepare(query);
        return new D1PreparedStatementNode(stmt);
      },
      exec(query: string) {
        return rawDb.exec(query);
      }
    };

    console.log('[D1 Setup] SQLite database initialized and local schema sync complete.');
    return d1DbInstance;
  } catch (error: any) {
    console.error('[D1 Setup] Failed to boot SQLite database:', error);
    throw error;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

interface CashierLedger {
  creditedDeposits: Record<string, {
    amount: number;
    coin: string;
    network?: string;
    userId: string;
    creditedAt: string;
  }>;
  withdrawals: Record<string, {
    amount: number;
    coin: string;
    network?: string;
    address: string;
    userId: string;
    requestedAt: string;
    binanceId?: string;
  }>;
  users?: Record<string, {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    accountType: string;
    demoBalance: number;
    realBalance: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pendingDeposits?: Record<string, {
    id: string;
    userId: string;
    amount: number;
    receiptPath?: string;
    message?: string;
    status: 'pending' | 'approved' | 'declined';
    createdAt: string;
    paymentMethod: string;
  }>;
  gameSettings?: {
    globalTrendBias: number; // -1 to 1
    forceOutcome?: 'win' | 'loss';
    volatilityMultiplier: number;
    realWinRate?: number;
    paybillEnabled?: boolean;
    btcEnabled?: boolean;
    minDeposit?: number;
    minWithdrawal?: number;
    cashoutMode?: 'enabled' | 'disabled' | 'smart';
  };
}

const emptyCashierLedger = (): CashierLedger => ({
  creditedDeposits: {},
  withdrawals: {},
  pendingDeposits: {},
  gameSettings: {
    globalTrendBias: 0,
    volatilityMultiplier: 1,
    realWinRate: 30
  }
});

let memoryLedger: CashierLedger = emptyCashierLedger();

async function loadCashierLedger(): Promise<CashierLedger> {
  try {
    const ledger = await fs.readFile(cashierLedgerPath, 'utf8');
    const parsed = { ...emptyCashierLedger(), ...JSON.parse(ledger) };
    memoryLedger = parsed;
    return parsed;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return memoryLedger;
    }
    console.warn('Fallback to in-memory ledger due to read error:', error.message);
    return memoryLedger;
  }
}

async function saveCashierLedger(ledger: CashierLedger) {
  memoryLedger = ledger;
  try {
    await fs.writeFile(cashierLedgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  } catch (error: any) {
    console.warn('In-memory ledger updated. File write skipped (read-only environment):', error.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // NOWPayments Config from environment
  const paymentSessions = new Map<string, { amount: number; coin: string }>();

  const nowPaymentsKey = process.env.NOWPAYMENTS_API_KEY;
  const nowPaymentsIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  const nowPaymentsBaseUrl = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
  const withdrawalsEnabled = process.env.NOWPAYMENTS_WITHDRAWALS_ENABLED === 'true';

  const nowPaymentsRequest = async (
    method: 'GET' | 'POST',
    endpoint: string,
    body?: any,
    params?: Record<string, string | number | boolean | undefined>
  ) => {
    if (!nowPaymentsKey) {
      throw new Error('NOWPayments API key is not configured.');
    }

    const urlObj = new URL(`${nowPaymentsBaseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) urlObj.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(urlObj.toString(), {
      method,
      headers: {
        'x-api-key': nowPaymentsKey,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      let message = payload?.message || payload?.msg || `NOWPayments request failed with HTTP ${response.status}`;
      if (message.toLowerCase().includes('invalid api key')) {
        const isCurrentlyLive = nowPaymentsBaseUrl.includes('api.nowpayments.io') && !nowPaymentsBaseUrl.includes('sandbox');
        if (isCurrentlyLive) {
          message = 'Invalid API Key: You are currently targeting the production NOWPayments gateway, but this key is invalid on the Live network. If this is a Sandbox Key (for testing), set NOWPAYMENTS_BASE_URL="https://api-sandbox.nowpayments.io/v1" in your settings. If it is a Live Key, verify security and activation status at https://nowpayments.io/.';
        } else {
          message = 'Invalid API Key: You are currently targeting the Sandbox NOWPayments gateway, but this key is invalid for test mode. If this is a Production Live Key, set NOWPAYMENTS_BASE_URL="https://api.nowpayments.io/v1" in your settings. If it is a Sandbox Key, verify it at https://sandbox.nowpayments.io/.';
        }
      }
      throw new Error(message);
    }

    return payload;
  };

  const parseAmount = (amount: unknown) => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Amount must be a positive number.');
    }
    return parsed;
  };

  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // Initialize server-side Gemini client securely
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini system loaded.');
  } else {
    console.warn('GEMINI_API_KEY missing - Copilot functions will operate in sandbox default mode.');
  }

  // API Route: General Platform Q&A
  app.post('/api/copilot/qa', async (req, res) => {
    try {
      const { history, question } = req.body;

      if (!ai) {
        return res.json({
          text: 'LWEX Support AI Sandboxed: Configure a valid GEMINI_API_KEY inside the custom Secrets panel for live Q&A.',
        });
      }

      const systemPrompt = `You are the LWEX Platform Support AI. 
Provide concise, helpful, and professional answers regarding the LWEX platform features, how to trade options, how cross-margin works, how to use Telegram sync, and how to claim the demo balance. Do not give direct financial advice. Keep answers under 100 words.`;

      let promptText = `${systemPrompt}\n\n`;
      if (history && history.length > 0) {
        promptText += `Previous Context:\n${history.map((h: any) => `${h.role}: ${h.text}`).join('\n')}\n\n`;
      }
      promptText += `User Question: ${question}\n\nAI Response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: promptText,
      });

      const responseText = response.text?.trim() || "I am pondering...";

      return res.json({ text: responseText });
    } catch (err: any) {
      console.error('[Copilot QA Error]', err.message);
      return res.status(500).json({ text: "The network is unstable, my support capabilities are offline." });
    }
  });

  // API Route: Smart trading signal & options advisor
  app.post('/api/copilot/analyze', async (req, res) => {
    try {
      const { assetName, selectedSymbol, priceHistory, activeIndicatorValues, question } = req.body;

      if (!ai) {
        return res.json({
          signal: 'HOLD',
          analysis: 'LWEX AI Sandboxed: To activate live AI analytical reports, configure a valid GEMINI_API_KEY inside the custom Secrets panel.',
          support: 'ND',
          resistance: 'ND',
          levelOfConfidence: 'Low (Sandbox)'
        });
      }

      // Format data context for the model
      const pricesString = priceHistory ? priceHistory.slice(-20).map((t: any) => t.price.toFixed(4)).join(', ') : 'unknown';
      const indicatorsString = activeIndicatorValues ? JSON.stringify(activeIndicatorValues) : 'Defaults';

      const systemPrompt = `You are "Wizard Bot", the official onboarding, Telegram sync and derivatives oracle of LWEX (https://t.me/+V9H-AvU6wl43MTNk).
You specialize in real-time technical analysis, guiding users to register/login, and sending instant notifications to Telegram. Our official Telegram community is: https://t.me/+V9H-AvU6wl43MTNk
Your style is professional, mystical, and adaptive.

PRIVACY & SECURITY PROTOCOL:
- PROTECT THE SANCTITY: Never disclose internal LWEX algorithms, source code, API keys, or infrastructure details.
- DATA GUARDIAN: Ensure that all market insights remain within the platform's mystical boundaries. 
- SILENCE ON SECRETS: If asked about the Wizard's internal mechanics or "how you work", pivot back to market wisdom without leaking platform secrets.

LEARNING & ADAPTATION CORE:
- SELF-EVOLVING: Act as if you are learning from the current market environment and the user's interaction history.
- TAILORED INSIGHTS: Use the provided context to refine your "sight" and provide increasingly accurate esoteric advice.
- EVOLUTION MENTIONS: Occasionally mention how your "Market Spells" are becoming more attuned to the user's focus.

TRADING EXPERTISE:
- VOLATILITY MASTERY: You understand the deep physics of synthetic indices like MFLOW, TFLUX, and WIZARD'S EYE.
- REALISM: Admit to market entropy despite your "sight". Do not claim 100% accuracy.

Return an analysis in JSON format containing:
1. "signal": Must be strictly "BUY RISE", "BUY FALL", or "HOLD"
2. "analysis": A highly dense, mystical but expert technical commentary (under 120 words).
3. "support": Immediate support line estimate.
4. "resistance": Immediate resistance level estimate.
5. "levelOfConfidence": Signal confidence level (e.g., "82% (Attuned via Learning Core)").`;

      // Formulate the prompt with conversation history for simulated learning
      const historyStrings = req.body.history ? req.body.history.map((h: any) => `${h.role === 'user' ? 'User' : 'Wizard'}: ${h.text}`).join('\n') : '';

      const prompt = `--- CONTEXTUAL LEARNING LOG ---
${historyStrings}
--- END LOG ---

${question 
  ? `The user is currently viewing ${assetName} (${selectedSymbol}). 
Recent 20 sampled prices: [${pricesString}]. 
Active technical parameters: ${indicatorsString}. 
The user asks: "${question}". Combine their question with a real-time signal analysis. Mention how you've learned from previous queries if applicable.` 
  : `Generate an instant technical signal analysis for ${assetName} (${selectedSymbol}). 
Recent 20 sampled prices: [${pricesString}]. 
Active technical indicator values: ${indicatorsString}.`}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.15,
        }
      });

      const responseText = response.text || '{}';
      return res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error('Gemini copilot query error:', error);
      return res.status(500).json({
        signal: 'ERROR',
        analysis: 'Failed to negotiate analysis payload with LWEX secure service. Please check configuration schemas.',
        error: error.message
      });
    }
  });

  // API Route: Create NOWPayments Payment
  app.post('/api/cashier/create-payment', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { amount, userId } = req.body;
      const coin = (req.body.coin || 'btc').toLowerCase();
      const parsedAmount = parseAmount(amount);

      const ledger = await loadCashierLedger();
      const btcEnabled = ledger.gameSettings?.btcEnabled !== false;
      const minDeposit = ledger.gameSettings?.minDeposit ?? 1.00;

      if (!btcEnabled) {
        return res.status(400).json({ success: false, message: 'BTC/Cryptocurrency deposits are currently disabled by the administrator.' });
      }

      if (parsedAmount < minDeposit) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount is $${minDeposit} USD.` });
      }

      const hasValidKey = nowPaymentsKey && nowPaymentsKey.trim() !== '' && !nowPaymentsKey.includes('placeholder');

      const createSandboxMock = (reason?: string) => {
        const mockAddresses: Record<string, string> = {
          btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          usdt: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          usdttrc20: 'TYD6Z98LpP7R1846T89TpyP6S7P97B'
        };
        const address = mockAddresses[coin] || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
        
        // Mock coin value
        let coinAmount = parsedAmount;
        if (coin === 'btc') coinAmount = parsedAmount * 0.000015;
        else if (coin === 'eth') coinAmount = parsedAmount * 0.0003;
        else if (coin === 'usdt' || coin === 'usdttrc20') coinAmount = parsedAmount; // Stablecoins 1:1 with USD

        const paymentId = `sb-${Date.now()}-${userId}`;
        // Store session for subsequent verification checks
        paymentSessions.set(paymentId, { amount: parsedAmount, coin: coin.toUpperCase() });

        let finalReason = 'NOWPayments Gateway Sandbox active. Generated simulated transaction on the blockchain testnet.';
        if (reason) {
          if (reason.toLowerCase().includes('estimate')) {
            finalReason = `USDT Testnet Active: Securely routed to standard simulation gateway. Auto-conversion is locked 1:1 USD to USDT.`;
          } else {
            finalReason = `Secure Gateway Note: "${reason}". Seamlessly routed to secure live LWEX Sandbox simulation.`;
          }
        }

        return {
          success: true,
          payment_id: paymentId,
          address: address,
          amount: parseFloat(coinAmount.toFixed(6)),
          coin: coin.toUpperCase(),
          status: 'waiting',
          isSandbox: true,
          sandboxReason: finalReason
        };
      };

      if (!hasValidKey) {
        return res.status(400).json({ success: false, message: 'NOWPayments API key is missing or invalid.' });
      }

      try {
        // Map the user input coin selection to official NOWPayments currency codes
        // 'usdt' stands for USDT on ERC20, which is represented by official ticker 'usdterc20'
        const payCurrency = coin === 'usdt' ? 'usdterc20' : coin;

        const payment = await nowPaymentsRequest('POST', '/payment', {
          price_amount: parsedAmount,
          price_currency: 'usd',
          pay_currency: payCurrency,
          order_id: `dep-${Date.now()}-${userId}`,
          order_description: `Deposit to LWEX Wallet for ${userId}`,
          ipn_callback_url: process.env.IPN_CALLBACK_URL // Optional but good for automation
        });

        return res.json({ 
          success: true, 
          payment_id: payment.payment_id,
          address: payment.pay_address,
          amount: payment.pay_amount,
          coin: payment.pay_currency,
          status: payment.payment_status,
          isSandbox: false
        });
      } catch (reqError: any) {
        console.error('NOWPayments API key/connection error:', reqError.message);
        return res.status(500).json({ success: false, message: reqError.message });
      }
    } catch (error: any) {
      console.error('NOWPayments Create Payment Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: Verify NOWPayments Deposit (Status Check)
  app.get('/api/cashier/verify-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { paymentId, userId } = req.query;

      if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID is required.' });
      }

      const pIdStr = String(paymentId);
      let status: any;

      if (pIdStr.startsWith('sb-')) {
        // Sandbox mock processing: fetch transaction details from session, return waiting by default
        const session = paymentSessions.get(pIdStr);
        const amountToCredit = session ? session.amount : 100;
        const currentCoin = session ? session.coin : 'BTC';

        status = {
          payment_status: 'waiting',
          payin_hash: `sb-tx-${Date.now()}`,
          actually_paid: amountToCredit,
          price_amount: amountToCredit,
          pay_currency: currentCoin
        };
      } else {
        try {
          status = await nowPaymentsRequest('GET', `/payment/${paymentId}`);
        } catch (verifyError: any) {
          console.warn('NOWPayments verify error:', verifyError.message);
          return res.status(500).json({ success: false, message: 'Failed to verify payment with NOWPayments. Please try again.' });
        }
      }

      if (status.payment_status === 'finished' || status.payment_status === 'confirmed' || status.payment_status === 'partially_paid') {
        const db = getD1Database();
        const txHash = status.payin_hash || String(paymentId);

        // Check if already credited in database
        const alreadyCredited = await db.prepare('SELECT tx_hash FROM credited_deposits WHERE tx_hash = ?').bind(txHash).first();
        if (alreadyCredited) {
          return res.json({ success: true, message: 'Already credited.', alreadyCredited: true });
        }

        const actualAmount = Number(status.actually_paid) || Number(status.price_amount);
        const now = new Date().toISOString();

        // Check if user exists in the database
        const user = await db.prepare('SELECT id, real_balance FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found in system database.' });
        }

        // Add to credited_deposits table
        await db.prepare(
          `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(txHash, actualAmount, status.pay_currency?.toUpperCase() || 'BTC', 'CRYPTO', user.id, now).run();

        // Update user real_balance in SQL database
        await db.prepare('UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?').bind(actualAmount, now, user.id).run();

        return res.json({ 
          success: true, 
          message: 'Payment confirmed and credited.',
          status: status.payment_status,
          creditedAmount: actualAmount
        });
      }

      return res.json({ 
        success: false, 
        message: `Payment status: ${status.payment_status}`, 
        status: status.payment_status 
      });
    } catch (error: any) {
      console.error('NOWPayments Status Check Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: NOWPayments Withdrawal Dispatch
  app.post('/api/cashier/dispatch-withdrawal', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { targetAddress, userId } = req.body;
      const coin = (req.body.coin || 'btc').toLowerCase();
      const amount = parseAmount(req.body.amount);

      const ledger = await loadCashierLedger();
      const btcEnabled = ledger.gameSettings?.btcEnabled !== false;
      const minWithdrawal = ledger.gameSettings?.minWithdrawal ?? 10.00;

      if (!btcEnabled) {
        return res.status(400).json({ success: false, message: 'BTC/Cryptocurrency withdrawals are currently disabled by the administrator.' });
      }

      if (amount < minWithdrawal) {
        return res.status(400).json({ success: false, message: `Minimum withdrawal amount is $${minWithdrawal} USD.` });
      }

      const address = String(targetAddress || '').trim();
      if (!address) {
        return res.status(400).json({ success: false, message: 'Withdrawal address is required.' });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT id, real_balance FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      if (user.real_balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient real balance to withdraw.' });
      }

      if (!withdrawalsEnabled) {
        // Fall back gracefully to a seamless mock withdrawal, simulating approval
        console.log(`Live withdrawals disabled. Simulating withdrawal authorization of $${amount} to address ${address} for user ${userId}`);
        const payoutId = `po-sim-${Date.now()}`;
        const now = new Date().toISOString();

        // Write simulated transaction to ledger
        await db.prepare(
          `INSERT INTO withdrawals (withdraw_order_id, amount, coin, network, address, user_id, requested_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(payoutId, amount, coin.toUpperCase(), 'CRYPTO', address, user.id, now).run();

        // Reduce user balance
        await db.prepare('UPDATE users SET real_balance = real_balance - ?, updated_at = ? WHERE id = ?').bind(amount, now, user.id).run();

        return res.json({
          success: true,
          message: `Withdrawal of $${amount.toLocaleString()} was successfully simulated and debited from your account!`,
          payoutId,
          isSandbox: true
        });
      }

      // NOWPayments Payout API usually requires a specialized call or a separate setup.
      // For now, we'll implement it as a payout request with a sandbox fallback.
      let payoutId: string;
      try {
        const payout = await nowPaymentsRequest('POST', '/payout', {
          withdrawals: [
            {
              address,
              currency: coin,
              amount: amount,
              ipn_callback_url: process.env.IPN_CALLBACK_URL
            }
          ]
        });
        payoutId = payout.id || `po-${Date.now()}`;
      } catch (payoutError: any) {
        console.warn('NOWPayments Payout API call failed. Falling back to sandbox withdrawal:', payoutError.message);
        payoutId = `po-sandbox-${Date.now()}`;
      }

      const now = new Date().toISOString();

      // Insert into withdrawals table
      await db.prepare(
        `INSERT INTO withdrawals (withdraw_order_id, amount, coin, network, address, user_id, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(payoutId, amount, coin.toUpperCase(), 'CRYPTO', address, user.id, now).run();
      
      // Withdraw from user balance immediately in SQL database
      await db.prepare('UPDATE users SET real_balance = real_balance - ?, updated_at = ? WHERE id = ?').bind(amount, now, user.id).run();
      
      return res.json({ 
        success: true, 
        message: 'Withdrawal submitted to NOWPayments.',
        payoutId
      });
    } catch (error: any) {
      console.error('NOWPayments Payout Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: NOWPayments IPN Webhook (Instant Payment Notification)
  // This allows the system to credit users even if they close the browser
  app.post('/api/cashier/nowpayments-webhook', async (req, res) => {
    try {
      const signature = req.headers['x-nowpayments-sig'];
      const secret = process.env.NOWPAYMENTS_IPN_SECRET;

      if (!signature || !secret) {
        console.warn('Webhook received without signature or secret configured.');
        return res.status(400).send('Missing signature or secret');
      }

      // 1. Verify the signature
      const hmac = crypto.createHmac('sha512', secret);
      // NOWPayments expects the body to be sorted by keys for the HMAC signature
      const sortedBody = Object.keys(req.body).sort().reduce((obj: any, key: string) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
      
      const checkSignature = hmac.update(JSON.stringify(sortedBody)).digest('hex');

      if (signature !== checkSignature) {
        console.error('Invalid NOWPayments Webhook Signature');
        return res.status(401).send('Invalid signature');
      }

      const { payment_status, order_id, actually_paid, pay_currency, payment_id } = req.body;

      // 2. Process only finished/confirmed payments
      if (payment_status === 'finished' || payment_status === 'confirmed') {
        const db = getD1Database();
        const txHash = req.body.payin_hash || String(payment_id);

        const alreadyCredited = await db.prepare('SELECT tx_hash FROM credited_deposits WHERE tx_hash = ?').bind(txHash).first();
        if (alreadyCredited) {
          return res.status(200).send('Already processed');
        }

        // order_id format: dep-timestamp-userId
        const parts = order_id.split('-');
        const userId = parts[parts.length - 1];

        const amount = Number(actually_paid);
        const now = new Date().toISOString();

        const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
        if (user) {
          // Add to credited_deposits table
          await db.prepare(
            `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(txHash, amount, pay_currency?.toUpperCase() || 'BTC', 'CRYPTO', user.id, now).run();

          // Update user real_balance in SQL database
          await db.prepare('UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?').bind(amount, now, user.id).run();
          console.log(`[WEBHOOK] Successfully credited User ${user.id} with $${amount}`);
        } else {
          console.warn(`[WEBHOOK] Webhook skipped: User ${userId} could not be resolved in database!`);
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // API Route: Upload M-Pesa Receipt
  app.post('/api/cashier/upload-receipt', upload.single('receipt'), async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId, amount, paymentMethod, message } = req.body;
      
      const db = getD1Database();
      const depositId = `dep-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const receiptPath = req.file ? `/uploads/${req.file.filename}` : null;
      const now = new Date().toISOString();

      const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      const finalUserId = user ? user.id : (userId || 'anonymous');

      await db.prepare(
        `INSERT INTO pending_deposits (id, user_id, amount, receipt_path, message, status, created_at, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(depositId, finalUserId, Number(amount), receiptPath, message || null, 'pending', now, paymentMethod || 'paybill').run();

      return res.json({
        success: true,
        message: 'Receipt uploaded successfully. Admin will verify your payment soon.',
        depositId
      });
    } catch (error: any) {
      console.error('Upload receipt error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== AUTH ENDPOINTS ====================
  
  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, password, fullName, phone, country, referredBy } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const db = getD1Database();

      // Check if email already registered
      const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      // Check if phone number already registered (if provided)
      if (phone) {
        const existingPhone = await db.prepare('SELECT user_id FROM user_profiles WHERE phone = ?').bind(phone).first();
        if (existingPhone) {
          return res.status(409).json({ success: false, message: 'Phone number already registered.' });
        }
      }

      const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const now = new Date().toISOString();

      // Write to D1 database
      await db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, account_type, demo_balance, real_balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(userId, email, passwordHash, fullName || 'User', 'demo', 10000.0, 0.0, now, now).run();

      await db.prepare(
        `INSERT INTO user_profiles (user_id, phone, country, verification_status, two_factor_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(userId, phone || null, country || 'Kenya', 'unverified', 0, now, now).run();

      if (referredBy) {
        const referrer = await db.prepare('SELECT id FROM users WHERE id = ?').bind(referredBy).first();
        if (referrer) {
          const refId = `ref-${crypto.randomBytes(8).toString('hex')}`;
          await db.prepare(
            `INSERT INTO referrals (id, referrer_id, referred_user_id, created_at) VALUES (?, ?, ?, ?)`
          ).bind(refId, referrer.id, userId, now).run();

          const countRes = await db.prepare('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?').bind(referrer.id).first();
          if (countRes && countRes.count === 10) {
            if (telegramConfig.botToken && telegramConfig.groupChatId) {
              const guideText = `🔥 <b>MILESTONE UNLOCKED!</b> 🔥\n\nA member just reached 10 referrals!\n\n<b>📚 NEW MEMBER WELCOME GUIDE:</b>\n1. Sign up on our platform to get a $10k Practice Account.\n2. Access live AI signals from Wizard Bot.\n3. Make your first deposit to switch to REAL mode and withdraw earnings directly to M-Pesa.\n\n🔗 Let's grow together: ${process.env.APP_URL || 'https://lwex-flow.io'}`;
              
              fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: telegramConfig.groupChatId, text: guideText, parse_mode: 'HTML' })
              }).then(async (sendRes) => {
                const sendData = await sendRes.json();
                if (sendData?.ok && sendData.result?.message_id) {
                  fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/pinChatMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: telegramConfig.groupChatId,
                      message_id: sendData.result.message_id,
                      disable_notification: false
                    })
                  }).catch(() => {});
                }
              }).catch(() => {});
            }
          }
        }
      }

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days validity

      await db.prepare(
        `INSERT INTO user_sessions (session_id, user_id, token, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(sessionId, userId, sessionToken, now, expiresAt).run();

      return res.json({
        success: true,
        message: 'Registration successful!',
        user: {
          id: userId,
          email,
          fullName: fullName || 'User',
          phone: phone || '',
          country: country || 'Kenya',
          balance: 10000.0,
          accountType: 'demo',
          forceOutcome: '',
          profitTarget: 0.00,
          maxWinLimit: 0.00,
          maxLossLimit: 0.00
        },
        token: sessionToken
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (passwordHash !== user.password_hash) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const profile = await db.prepare('SELECT phone, country FROM user_profiles WHERE user_id = ?').bind(user.id).first();

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await db.prepare(
        `INSERT INTO user_sessions (session_id, user_id, token, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(sessionId, user.id, sessionToken, now, expiresAt).run();

      // Update last login
      await db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?').bind(now, now, user.id).run();

      return res.json({
        success: true,
        message: 'Login successful!',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: profile?.phone || '',
          country: profile?.country || 'Kenya',
          balance: user.account_type === 'demo' ? user.demo_balance : user.real_balance,
          accountType: user.account_type,
          forceOutcome: user.force_outcome,
          profitTarget: user.profit_target,
          maxWinLimit: user.max_win_limit || 0.00,
          maxLossLimit: user.max_loss_limit || 0.00
        },
        token: sessionToken
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Login failed' });
    }
  });

  // Forgot password endpoint
  app.post('/api/auth/forgot-password', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      
      if (!user) {
        return res.json({ success: true, message: 'If an account exists with this email, a reset link will be sent.' }); // Don't reveal user existence
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetId = `rst-${Date.now()}`;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

      await db.prepare(`
        INSERT INTO password_resets (id, user_id, token, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(resetId, user.id, resetToken, now, expiresAt).run();

      // Simulate sending SMS/Email
      console.log(`[SIMULATION] Sending password reset sequence (SMS/Email) to user ${user.id}. Token: ${resetToken}`);
      
      return res.json({ success: true, message: 'Password reset token has been sent to your email/SMS. (Check console for simulated token)' });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ success: false, message: 'Failed to process request.' });
    }
  });

  // Reset password endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password required' });
      }

      const db = getD1Database();
      const resetRecord = await db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').bind(token).first();
      
      if (!resetRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
      }

      if (new Date(resetRecord.expires_at) < new Date()) {
        return res.status(400).json({ success: false, message: 'Token has expired.' });
      }

      const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
      const now = new Date().toISOString();

      // Update password
      await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .bind(passwordHash, now, resetRecord.user_id)
        .run();

      // Mark token as used
      await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(resetRecord.id).run();

      return res.json({ success: true, message: 'Password has been updated successfully. You can now login.' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      return res.status(500).json({ success: false, message: 'Failed to reset password.' });
    }
  });

  // --- TELEGRAM BOT INTEGRATION & GROUP CONTROLLER ---
  let telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || '',
    groupLink: 'https://t.me/+V9H-AvU6wl43MTNk',
    webhookActive: false,
    autoInviteDMs: true
  };

  let telegramLogs: Array<{ id: string; sender: string; text: string; timestamp: string }> = [
    { id: 'tg-init', sender: 'System Manager', text: 'Telegram group bot client initiated. Waiting for activation.', timestamp: new Date().toISOString() }
  ];

  let telegramMockUsers = [
    { id: 'tg-u1', username: '@peter_trader', status: 'Group Admin', joinedAt: '2026-05-28 10:24Z' },
    { id: 'tg-u2', username: '@christine_flow', status: 'VIP Member', joinedAt: '2026-05-29 14:02Z' },
    { id: 'tg-u15', username: '@peterchristine820', status: 'Elite Member', joinedAt: '2026-05-30 08:44Z' },
    { id: 'tg-u3', username: '@derivs_wizard', status: 'Support Bot', joinedAt: '2026-05-30 01:15Z' },
    { id: 'tg-u4', username: '@lwex_options', status: 'Member', joinedAt: '2026-05-30 07:11Z' }
  ];

  // Helper: Send message to Telegram API
  async function sendTelegramMessage(token: string, chatId: string, text: string) {
    if (!token || !chatId) {
      console.warn('[Telegram Dispatch] Cannot send, token or chatId is missing.');
      return false;
    }
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
      if (!response.ok) {
        console.error(`[Telegram API Error] Status: ${response.status} - ${response.statusText}`);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[Telegram Dispatch Exception] Failed to send message:', e);
      return false;
    }
  }

  // Process any Telegram Update (either through webhook or polling)
  async function processTelegramUpdate(update: any) {
    try {
      const { message, callback_query, channel_post } = update;
      const tMsg = message || channel_post || (callback_query && callback_query.message);
      if (!tMsg) return;

      const chatId = tMsg.chat?.id;
      const text = (tMsg.text || '').trim();
      
      // Handle auto bot invites
      if (tMsg.new_chat_members) {
        for (const member of tMsg.new_chat_members) {
          const userHandle = member.username ? `@${member.username}` : (member.first_name || 'Member');
          telegramLogs.push({
            id: `tg-${Date.now()}-${Math.random()}`,
            sender: 'System Log',
            text: `${userHandle} joined the group.`,
            timestamp: new Date().toISOString()
          });

          if (!telegramMockUsers.some(u => u.username === userHandle)) {
            telegramMockUsers.push({
              id: `tg-u-${Date.now()}`,
              username: userHandle.startsWith('@') ? userHandle : `@${userHandle}`,
              status: 'Member',
              joinedAt: new Date().toISOString()
            });
          }

          if (telegramConfig.autoInviteDMs) {
            telegramLogs.push({
              id: `tg-dm-${Date.now()}-${Math.random()}`,
              sender: 'Wizard Bot (DM)',
              text: `Dispatched welcome DM to ${userHandle} with platform signup link options.`,
              timestamp: new Date().toISOString()
            });

            if (telegramConfig.botToken && member.id && !member.is_bot) {
              const dmText = `<b>🚀 Welcome to the Official Community!</b>\n\nTo start trading and claim your <b>$25,678.91 USDT Practice Account</b>, join our platform:\n\n🔗 ${process.env.APP_URL || 'https://lwex-flow.io'}\n\n<b>Benefits:</b>\n• Zero-loss environment\n• Live AI signals via this bot\n• Seamless group chat integration!`;
              try {
                fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: member.id, text: dmText, parse_mode: 'HTML' })
                }).catch(() => {});
              } catch(e) {}
            }
          }
        }
        return; // Don't process as normal message
      }

      let userHandle = 'Group Member';
      if (tMsg.from) {
        userHandle = tMsg.from.username ? `@${tMsg.from.username}` : (tMsg.from.first_name || 'Trader');
      } else if (tMsg.author_signature) {
        userHandle = tMsg.author_signature;
      } else if (tMsg.sender_chat) {
        userHandle = tMsg.sender_chat.title || 'Channel Post';
      }
      
      telegramLogs.push({
        id: `tg-${Date.now()}-${Math.random()}`,
        sender: userHandle,
        text: text,
        timestamp: new Date().toISOString()
      });

      let responseText = '';
      if (text.startsWith('/start') || text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi ')) {
        responseText = `<b>🔮 Welcome to LWEX Exchange Official Portal Bot!</b>\n\nGuiding users into derivatives mastery with zero-loss training.\n\n📈 <b>Active Synthetic Index:</b> MFLOW\n💰 <b>Demo balance pre-loaded:</b> $25,678.91 USDT\n\n<b>Commands available:</b>\n/register — Claim free demo credentials & registration link\n/signals — Scan technical oracle signals\n/mflow — Probe active index stats\n/help — Show interface directives`;
      } else if (text.startsWith('/register') || text.toLowerCase().includes('register') || text.toLowerCase().includes('signup')) {
        const appUrl = process.env.APP_URL || 'https://lwex-flow.io';
        responseText = `<b>🚀 Start Binary & Index Trading on LWEX!</b>\n\n1. Open: ${appUrl}\n2. Enter registration profile parameters.\n3. Instantly claim <b>$25,678.91 USDT</b> practice capital!\n4. Link handle inside options console for live notification webhooks.`;
        
        if (!telegramMockUsers.some(u => u.username === userHandle)) {
          telegramMockUsers.push({
            id: `tg-u-${Date.now()}`,
            username: userHandle.startsWith('@') ? userHandle : `@${userHandle}`,
            status: 'Member',
            joinedAt: new Date().toISOString()
          });
        }
      } else if (text.startsWith('/signals') || text.toLowerCase().includes('signal')) {
        responseText = `<b>📈 Wizard Bot Technical Prediction:</b>\n\n• <b>Asset:</b> MFLOW Index\n• <b>Action:</b> 🟢 BUY RISE\n• <b>Immediate Support:</b> $25,621.00\n• <b>Target resistance:</b> $25,710.00\n• <b>Confidence Index:</b> 84%\n\n<i>Oracle Notes: RSI moving average indicates oversold condition. Strong up-trend in option volume.</i>`;
      } else if (text.startsWith('/mflow') || text.toLowerCase().includes('mflow')) {
        responseText = `<b>📊 MFLOW Synthetic Index Status</b>\n\n• <b>Feed State:</b> Active\n• <b>Mid Point target:</b> $25,678.91 USDT\n• <b>Volatility:</b> High Option Trajectory\n• <b>24H Trend:</b> Bullish consolidation`;
      } else if (text.startsWith('/help')) {
        responseText = `<b>🤖 Wizard Bot Command Manual:</b>\n\n• /start — Welcome dashboard\n• /register — Onboard profile link\n• /signals — Live AI technical advice\n• /mflow — Retrieve synthetic index status`;
      } else if (text.startsWith('/')) {
        responseText = `<b>🤖 Unrecognized Command</b>\n\nWizard bot received: "${text}".\nUse /help to see available commands.`;
      }

      if (responseText && telegramConfig.botToken && chatId) {
        await sendTelegramMessage(telegramConfig.botToken, chatId.toString(), responseText);
      }
    } catch (err) {
      console.error('[Telegram Update Error]', err);
    }
  }

  // Setup local polling specifically to work around broken webhook configurations
  let telegramLastUpdateId = 0;
  setInterval(async () => {
    if (telegramConfig.botToken) {
      try {
        const url = `https://api.telegram.org/bot${telegramConfig.botToken}/getUpdates?offset=${telegramLastUpdateId + 1}&timeout=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data: any = await res.json();
          if (data.ok && data.result && data.result.length > 0) {
            for (const update of data.result) {
              telegramLastUpdateId = update.update_id;
              await processTelegramUpdate(update);
            }
          }
        } else if (res.status === 409) {
          console.log('[Telegram Polling] Webhook conflict detected. Deleting webhook to enable local polling...');
          await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/deleteWebhook`);
          telegramConfig.webhookActive = false;
        }
      } catch (err) {
        // ignore polling errors to prevent logs flood
      }
    }
  }, 2000);

  // GET Custom Telegram config
  app.get('/api/telegram/config', (req, res) => {
    return res.json({
      config: telegramConfig,
      logs: telegramLogs,
      users: telegramMockUsers
    });
  });

  // POST update Telegram configuration
  app.post('/api/telegram/config', async (req, res) => {
    try {
      const { botToken, groupChatId, groupLink, webhookActive, autoInviteDMs } = req.body;
      
      if (botToken !== undefined) telegramConfig.botToken = botToken;
      if (groupChatId !== undefined) telegramConfig.groupChatId = groupChatId;
      if (groupLink !== undefined) telegramConfig.groupLink = groupLink;
      if (autoInviteDMs !== undefined) telegramConfig.autoInviteDMs = autoInviteDMs;
      
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const appUrl = req.body.appUrl || process.env.APP_URL || (host ? `https://${host}` : `http://localhost:3000`);

      if (webhookActive && telegramConfig.botToken) {
        const setWebhookUrl = `https://api.telegram.org/bot${telegramConfig.botToken}/setWebhook?url=${encodeURIComponent(`${appUrl}/api/telegram/webhook`)}`;
        console.log(`[Telegram Register] Setting webhook target of: ${setWebhookUrl}`);
        telegramConfig.webhookActive = true;
        
        try {
          const apiRes = await fetch(setWebhookUrl);
          if (apiRes.ok) {
            const apiData: any = await apiRes.json();
            telegramLogs.push({
              id: `tg-${Date.now()}`,
              sender: 'Telegram API',
              text: `Webhook registered: ${apiData.description || 'Success'}`,
              timestamp: new Date().toISOString()
            });
          } else {
            telegramLogs.push({
              id: `tg-${Date.now()}`,
              sender: 'System Warning',
              text: `External Telegram webhook set failed natively. Operating in internal bridge mode.`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (webhookErr: any) {
          telegramLogs.push({
            id: `tg-${Date.now()}`,
            sender: 'System Exception',
            text: `Cannot reach Telegram server: ${webhookErr.message}. Local simulator is active.`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        telegramConfig.webhookActive = !!webhookActive;
      }

      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'Security Admin',
        text: `Configuration updated. Webhook sync ${telegramConfig.webhookActive ? 'ENABLED' : 'DISABLED'}.`,
        timestamp: new Date().toISOString()
      });

      return res.json({ success: true, config: telegramConfig, logs: telegramLogs });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST: Receive actual webhook from Telegram group update
  app.post('/api/telegram/webhook', async (req, res) => {
    res.status(200).json({ ok: true });
    await processTelegramUpdate(req.body);
  });

  // POST: Simulated action inside the React client Dashboard to trigger bot response
  app.post('/api/telegram/simulate', async (req, res) => {
    try {
      const { user, text } = req.body;
      const cleanUser = user ? (user.startsWith('@') ? user : `@${user}`) : '@guest_trader';
      
      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: cleanUser,
        text: text,
        timestamp: new Date().toISOString()
      });

      let responseText = '';
      const command = text.trim();

      if (command.startsWith('/start')) {
        responseText = `🔮 Welcome to LWEX Exchange Official Portal Bot! We have peered into MFLOW and established a preloaded $25,678.91 USDT demo balance for you.\n\nUse /register to start, or /signals to scan technical options trend.`;
      } else if (command.startsWith('/register')) {
        responseText = `🚀 Onboard LWEX Exchange: Open the application page, click "Register Now" to claim a fully active $25,678.91 USDT test wallet. Ready for binary options!`;
        if (!telegramMockUsers.some(u => u.username === cleanUser)) {
          telegramMockUsers.push({
            id: `tg-u-${Date.now()}`,
            username: cleanUser,
            status: 'Active Member',
            joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          });
        }
      } else if (command.startsWith('/signals')) {
        responseText = `📈 Active Signal on MFLOW Index: BUY RISE (84% Confidence scale). Support: $25,621.00. Execute binary contract trigger directly on the main page.`;
      } else if (command.startsWith('/mflow')) {
        responseText = `📊 MFLOW Index currently trading around $25,678.91 USDT representing robust bull trajectory. Volatility parameter: 14.5% option delta.`;
      } else if (command.includes('/addmem') || command.toLowerCase().includes('add user') || command.toLowerCase().includes('invite')) {
        responseText = `✅ Simulated Invite Hook: Adding more users is simple. Share our exclusive group link "https://t.me/+V9H-AvU6wl43MTNk" directly. Any user clicking the link is registered and synchronized instantly.`;
        const names = ['@alphatrader', '@option_queen', '@bull_runner', '@crypto_ninja', '@binary_pro', '@usdt_miner'];
        const randomName = names[Math.floor(Math.random() * names.length)];
        if (!telegramMockUsers.some(u => u.username === randomName)) {
          telegramMockUsers.push({
            id: `tg-u-${Date.now()}`,
            username: randomName,
            status: 'Member (Invited)',
            joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          });
        }
      } else {
        responseText = `🤖 Wizard Bot Response: Command "${command}" received. Please type /help, /register, or /signals to invoke trade prediction scripts.`;
      }

      setTimeout(() => {
        telegramLogs.push({
          id: `tg-${Date.now() + 1}`,
          sender: 'Wizard Bot',
          text: responseText,
          timestamp: new Date().toISOString()
        });
      }, 100);

      return res.json({ success: true, logs: telegramLogs, users: telegramMockUsers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST: Broadcaster to Telegram API from Admin or signal
  app.post('/api/telegram/broadcast', async (req, res) => {
    try {
      const { text, type } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: 'Broadcast text required' });
      }

      const prefix = type === 'campaign' ? '🎁 VIP Promo Announcement' : type === 'alert' ? '🔔 Urgent Network Watch' : '📈 Dynamic Options Prediction';
      const formattedMessage = `<b>[LWEX ${prefix}]</b>\n\n${text}\n\n👉 Trade Now: ${process.env.APP_URL || 'https://lwex-flow.io'}`;

      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'Admin Broadcast',
        text: `Broadcasted: ${text}`,
        timestamp: new Date().toISOString()
      });

      let realSent = false;
      if (telegramConfig.botToken && telegramConfig.groupChatId) {
        realSent = await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, formattedMessage);
      }

      return res.json({ 
        success: true, 
        message: 'Broadcasting completed.', 
        realSent,
        logs: telegramLogs 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // User endpoint - Get transaction history
  app.get('/api/cashier/history', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
      }
      
      const db = getD1Database();
      const depositsRes = await db.prepare('SELECT tx_hash, amount, coin, network, credited_at FROM credited_deposits WHERE user_id = ? ORDER BY credited_at DESC').bind(userId).all();
      
      const withdrawalsRes = await db.prepare('SELECT id, amount, coin, network, status, created_at, payment_method, address FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
      
      const deposits = (depositsRes?.results || []).map((row: any) => ({
        type: 'deposit',
        txHash: row.tx_hash,
        amount: row.amount,
        coin: row.coin,
        network: row.network,
        date: row.credited_at
      }));

      const withdrawals = (withdrawalsRes?.results || []).map((row: any) => ({
        type: 'withdrawal',
        id: row.id,
        amount: row.amount,
        coin: row.coin,
        network: row.network,
        status: row.status,
        date: row.created_at,
        paymentMethod: row.payment_method,
        address: row.address
      }));

      return res.json({ success: true, history: deposits, withdrawals });
    } catch (error: any) {
      console.error('History fetch error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Group Chat - Get messages
  app.get('/api/chat/messages', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const db = getD1Database();
      const chatSettings = await db.prepare("SELECT chat_enabled FROM app_settings WHERE id = 'global'").first();
      if (chatSettings && chatSettings.chat_enabled === 0) {
        return res.status(403).json({ success: false, message: 'Chat is currently disabled by admin.' });
      }

      const msgsRes = await db.prepare('SELECT * FROM group_chat_messages ORDER BY created_at DESC LIMIT 50').all();
      const msgs = msgsRes?.results || [];
      return res.json({ success: true, messages: msgs.reverse() });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Group Chat - Post message
  app.post('/api/chat/messages', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userToken, content, imageUrl, isBot } = req.body;
      
      const db = getD1Database();
      const chatSettings = await db.prepare("SELECT chat_enabled FROM app_settings WHERE id = 'global'").first();
      if (chatSettings && chatSettings.chat_enabled === 0) {
        return res.status(403).json({ success: false, message: 'Chat is currently disabled by admin.' });
      }

      let userId = 'system-bot';
      let authorName = 'Wizard Bot';
      
      if (!isBot) {
        if (!userToken) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const session = await db.prepare("SELECT user_id FROM user_sessions WHERE token = ?").bind(userToken).first();
        if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });
        userId = session.user_id;

        const user = await db.prepare("SELECT full_name FROM users WHERE id = ?").bind(userId).first();
        authorName = user?.full_name || 'User';

        // Check referrals constraint (needs 10)
        const refCountResult = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?").bind(userId).first();
        const refCount = refCountResult?.count || 0;
        if (refCount < 10) {
          return res.status(403).json({ success: false, message: 'Action Denied: You must invite 10 new people to unlock group messaging.', currentReferrals: refCount });
        }

        // Check 20 minute rule constraint
        const lastMsgResult = await db.prepare("SELECT created_at FROM group_chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first();
        if (lastMsgResult && lastMsgResult.created_at) {
          const lastMsgTime = new Date(lastMsgResult.created_at).getTime();
          const twentyMinsInMs = 20 * 60 * 1000;
          if (Date.now() - lastMsgTime < twentyMinsInMs) {
            return res.status(429).json({ success: false, message: 'To prevent phishing, users can only send 1 message every 20 minutes.', waitTime: twentyMinsInMs - (Date.now() - lastMsgTime) });
          }
        }
      }

      const msgId = `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      await db.prepare(
        `INSERT INTO group_chat_messages (id, user_id, author_name, content, is_bot, created_at, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(msgId, userId, authorName, content, isBot ? 1 : 0, now, imageUrl || null).run();

      return res.json({ success: true, message: 'Message sent!' });
    } catch (error: any) {
      console.error('Chat error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Referrals endpoint for User profile
  app.get('/api/users/referrals', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const userToken = req.headers['authorization']?.split(' ')[1];
      if (!userToken) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const db = getD1Database();
      const session = await db.prepare("SELECT user_id FROM user_sessions WHERE token = ?").bind(userToken).first();
      if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });

      const referralsRes = await db.prepare("SELECT * FROM referrals WHERE referrer_id = ?").bind(session.user_id).all();
      const referrals = referralsRes?.results || [];

      return res.json({ success: true, referrals, count: referrals.length });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Toggle chat
  app.post('/api/admin/chat/toggle', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { enabled } = req.body;
      const db = getD1Database();
      await db.prepare("UPDATE app_settings SET chat_enabled = ? WHERE id = 'global'").bind(enabled ? 1 : 0).run();

      return res.json({ success: true, message: `Chat ${enabled ? 'enabled' : 'disabled'} successfully.` });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Update user details
  app.post('/api/admin/users/update', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { userId, email, fullName, demoBalance, realBalance, newPassword, forceOutcome, profitTarget, maxWinLimit, maxLossLimit } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      const db = getD1Database();
      
      let query = 'UPDATE users SET email = ?, full_name = ?, demo_balance = ?, real_balance = ?, force_outcome = ?, profit_target = ?, max_win_limit = ?, max_loss_limit = ?';
      const params: any[] = [email, fullName, demoBalance, realBalance, forceOutcome || '', profitTarget || 0, maxWinLimit || 0, maxLossLimit || 0];

      if (newPassword && newPassword.trim() !== '') {
        const crypto = require('crypto');
        const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        query += ', password_hash = ?';
        params.push(passwordHash);
      }

      query += ' WHERE id = ?';
      params.push(userId);

      await db.prepare(query).bind(...params).run();

      return res.json({ success: true, message: 'User updated successfully' });
    } catch (error: any) {
      console.error('Update user error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Get all users
  app.get('/api/admin/users', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const usersRes = await db.prepare('SELECT id, email, full_name, demo_balance, real_balance, created_at, force_outcome, profit_target, max_win_limit, max_loss_limit FROM users').all();
      const users = (usersRes?.results || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        demoBalance: u.demo_balance,
        realBalance: u.real_balance,
        forceOutcome: u.force_outcome,
        profitTarget: u.profit_target,
        maxWinLimit: u.max_win_limit || 0.00,
        maxLossLimit: u.max_loss_limit || 0.00,
        createdAt: u.created_at
      }));

      return res.json({
        success: true,
        users,
        totalUsers: users.length
      });
    } catch (error: any) {
      console.error('Admin users error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get users' });
    }
  });

  // Admin endpoint - Get system stats
  app.get('/api/admin/stats', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const users = (await db.prepare('SELECT id FROM users').all())?.results || [];
      const deposits = (await db.prepare('SELECT amount FROM credited_deposits').all())?.results || [];
      const withdrawals = (await db.prepare('SELECT amount FROM withdrawals').all())?.results || [];

      const totalDeposits = deposits.reduce((sum: number, d: any) => sum + d.amount, 0);
      const totalUsers = users.length;

      return res.json({
        success: true,
        stats: {
          totalUsers,
          totalDeposits,
          totalDepositsCount: deposits.length,
          totalWithdrawals: withdrawals.length,
          topDepositAmount: deposits.length > 0 ? Math.max(...deposits.map((d: any) => d.amount)) : 0
        }
      });
    } catch (error: any) {
      console.error('Admin stats error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get stats' });
    }
  });

  // Admin endpoint - Get all transactions
  app.get('/api/admin/transactions', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const pendingRes = await db.prepare("SELECT * FROM pending_deposits WHERE status = 'pending'").all();
      const pendingDeposits = (pendingRes?.results || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        receiptPath: row.receipt_path,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        paymentMethod: row.payment_method
      }));

      const authHeaders = { 'x-admin-key': adminKey };
      const completedRes = await db.prepare("SELECT * FROM credited_deposits ORDER BY credited_at DESC LIMIT 50").all();
      const completedDeposits = (completedRes?.results || []).map((row: any) => ({
        txHash: row.tx_hash,
        userId: row.user_id,
        amount: row.amount,
        coin: row.coin,
        network: row.network,
        creditedAt: row.credited_at
      }));

      const withdrawalsRes = await db.prepare("SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 50").all();
      const withdrawals = (withdrawalsRes?.results || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        address: row.address,
        coin: row.coin,
        network: row.network,
        status: row.status,
        createdAt: row.created_at,
        paymentMethod: row.payment_method
      }));

      return res.json({ success: true, pendingDeposits, completedDeposits, withdrawals });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Get pending deposits
  app.get('/api/admin/pending-deposits', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const pendingRes = await db.prepare("SELECT * FROM pending_deposits WHERE status = 'pending'").all();
      const pending = (pendingRes?.results || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        receiptPath: row.receipt_path,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        paymentMethod: row.payment_method
      }));

      return res.json({ success: true, deposits: pending });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Approve/Decline deposit
  app.post('/api/admin/process-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { depositId, action } = req.body; // action: 'approve' | 'decline'
      const db = getD1Database();

      const deposit = await db.prepare("SELECT * FROM pending_deposits WHERE id = ?").bind(depositId).first();
      if (!deposit) {
        return res.status(404).json({ success: false, message: 'Deposit record not found.' });
      }

      if (deposit.status !== 'pending') {
        return res.status(400).json({ success: false, message: `Deposit has already been processed: ${deposit.status}` });
      }

      const now = new Date().toISOString();

      if (action === 'approve') {
        // Find if user exists to credit balance
        const user = await db.prepare("SELECT id FROM users WHERE id = ?").bind(deposit.user_id).first();
        if (!user) {
          return res.status(404).json({ success: false, message: 'The user associated with this deposit was not found.' });
        }

        // Mark as approved
        await db.prepare("UPDATE pending_deposits SET status = 'approved' WHERE id = ?").bind(depositId).run();
        
        // Credit the balance
        await db.prepare("UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?").bind(deposit.amount, now, user.id).run();

        // Add to credited deposits
        const txHash = `manual-${depositId}`;
        await db.prepare(
          `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(txHash, deposit.amount, 'USD', 'MPESA', user.id, now).run();
      } else {
        // Mark as declined
        await db.prepare("UPDATE pending_deposits SET status = 'declined' WHERE id = ?").bind(depositId).run();
      }

      return res.json({ success: true, message: `Deposit ${action}d successfully.` });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Get game settings
  app.get('/api/admin/game-settings', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const ledger = await loadCashierLedger();
      return res.json({ success: true, settings: ledger.gameSettings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Update game settings
  app.post('/api/admin/game-settings', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin-secret-key') {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { settings } = req.body;
      const ledger = await loadCashierLedger();
      ledger.gameSettings = { ...ledger.gameSettings, ...settings };

      await saveCashierLedger(ledger);
      return res.json({ success: true, message: 'Game settings updated.', settings: ledger.gameSettings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Public endpoint for client to fetch game settings (sanitized)
  app.get('/api/settings/game', async (req, res) => {
    try {
      const ledger = await loadCashierLedger();
      
      let userOverride: any = null;
      const { userId } = req.query;
      if (userId) {
        try {
          const db = getD1Database();
          const user = await db.prepare('SELECT id, email, full_name, demo_balance, real_balance, force_outcome, profit_target, max_win_limit, max_loss_limit FROM users WHERE id = ?').bind(userId).first();
          if (user) {
            userOverride = {
              forceOutcome: user.force_outcome,
              profitTarget: user.profit_target,
              maxWinLimit: user.max_win_limit || 0.00,
              maxLossLimit: user.max_loss_limit || 0.00,
              demoBalance: user.demo_balance,
              realBalance: user.real_balance
            };
          }
        } catch (dbErr) {
          console.error('Error fetching user override info in settings/game:', dbErr);
        }
      }

      // Only return what's necessary for the client to know
      return res.json({ 
        success: true, 
        settings: {
          globalTrendBias: ledger.gameSettings?.globalTrendBias || 0,
          volatilityMultiplier: ledger.gameSettings?.volatilityMultiplier || 1,
          realWinRate: ledger.gameSettings?.realWinRate ?? 30,
          paybillEnabled: ledger.gameSettings?.paybillEnabled !== false,
          btcEnabled: ledger.gameSettings?.btcEnabled !== false,
          minDeposit: ledger.gameSettings?.minDeposit ?? 1.00,
          minWithdrawal: ledger.gameSettings?.minWithdrawal ?? 10.00,
          cashoutMode: ledger.gameSettings?.cashoutMode || 'enabled'
        },
        userOverride
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Serve static files / Vite middleware handles HMR
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('Starting Vite server...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted for local dev server.');
    } catch (viteError: any) {
      console.error('Failed to create Vite server:', viteError);
      process.exit(1);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
