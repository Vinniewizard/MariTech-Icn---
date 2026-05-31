export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  BINANCE_API_KEY?: string;
  BINANCE_SECRET?: string;
  BINANCE_BASE_URL?: string;
  BINANCE_DEPOSIT_COIN?: string;
  BINANCE_DEPOSIT_NETWORK?: string;
  BINANCE_WITHDRAWALS_ENABLED?: string;
  DB?: D1Database;
  ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export type PagesFunction<Environment = Env> = (context: {
  request: Request;
  env: Environment;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}) => Response | Promise<Response>;
