export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'syndicate' | 'forex' | 'crypto';
  price: number;
  change: number; // percentage
  volatility: number; // multiplier for random walks
  trendBias: number; // typical trend direction bias
  decimals: number;
  description: string;
}

export type ContractType = 'rise-fall' | 'higher-lower' | 'touch-no-touch' | 'digit-over-under';

export interface Tick {
  time: number;
  price: number;
}

export interface Contract {
  id: string;
  assetId: string;
  assetName: string;
  assetSymbol: string;
  type: ContractType;
  direction: 'rise' | 'fall' | 'higher' | 'lower' | 'touch' | 'no-touch' | 'over' | 'under';
  stake: number;
  payout: number;
  basis: 'stake' | 'payout';
  barrier?: number; // visual or actual trigger level
  barrierOffset?: number; // e.g. +0.50
  targetDigit?: number; // For digit-over-under (0-9)
  entryPrice: number;
  entryTime: number;
  duration: number; // count
  durationUnit: 'ticks' | 'seconds' | 'minutes';
  expiryTime: number;
  status: 'active' | 'won' | 'lost' | 'sold';
  currentPrice: number;
  currentProfit: number;
  sellPrice?: number;
  ticksPassed: number;
  ticksHistory: { time: number; price: number }[];
  exitPrice?: number;
  exitTime?: number;
}

export interface TradeHistoryItem {
  id: string;
  assetName: string;
  assetSymbol: string;
  type: ContractType;
  direction: 'rise' | 'fall' | 'higher' | 'lower' | 'touch' | 'no-touch' | 'over' | 'under';
  stake: number;
  payout: number;
  profit: number;
  status: 'won' | 'lost' | 'sold';
  entryPrice: number;
  exitPrice: number;
  purchaseTime: number;
  targetDigit?: number;
}

export interface Account {
  mode: 'demo' | 'real';
  balance: number;
  currency: string;
  id: string;
}

export interface IndicatorConfig {
  sma: { enabled: boolean; period: number };
  ema: { enabled: boolean; period: number };
  rsi: { enabled: boolean; period: number };
}

export interface CopilotMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export interface PriceAlert {
  id: string;
  assetId: string;
  assetSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isTriggered: boolean;
  createdAt: number;
}

