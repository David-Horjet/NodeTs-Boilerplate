export type AssetType = 'NGN' | 'SOL' | 'USDC';
export type TransactionType = 'fiat_deposit' | 'crypto_deposit' | 'buy' | 'sell' | 'withdraw';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Balance {
  id: string;
  user_id: string;
  asset: AssetType;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  asset: AssetType;
  amount: string;
  status: TransactionStatus;
  reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DepositAddress {
  id: string;
  user_id: string;
  chain: 'solana';
  address: string;
  created_at: string;
}