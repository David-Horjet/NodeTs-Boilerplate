import { LedgerTransaction, Balance } from '../types';
import { priceService } from '../services/PriceService';

export function mapTransactionForAPI(tx: LedgerTransaction) {
  // Normalize type
  const type = tx.type === 'crypto_deposit' || tx.type === 'fiat_deposit' ? 'deposit' : tx.type;

  const price = tx.metadata?.price ? Number(tx.metadata.price) : null;

  // Default asset and numeric amount from stored tx.amount
  let asset = tx.asset;
  let amount = Math.abs(Number(tx.amount || '0'));
  let total: number | null = null;

  if (type === 'buy' || type === 'sell') {
    // Prefer an explicit crypto amount from metadata when available
    let cryptoAmount: number | null = null;
    if (tx.metadata?.crypto_amount) {
      cryptoAmount = Number(tx.metadata.crypto_amount);
    } else if (['SOL', 'USDC', 'ETH', 'BTC', 'USDT'].includes(tx.asset)) {
      // Transaction already on crypto asset (e.g., buy credit)
      cryptoAmount = Math.abs(Number(tx.amount || '0'));
    } else if (price) {
      // If tx.amount is fiat and price is known, derive crypto amount
      cryptoAmount = Math.abs(Number(tx.amount || '0')) / price;
    } else {
      cryptoAmount = Math.abs(Number(tx.amount || '0'));
    }

    amount = cryptoAmount;

    // For sells, prefer crypto asset from metadata (since tx.asset may be NGN)
    if (tx.metadata?.crypto_asset) {
      asset = tx.metadata.crypto_asset;
    }

    // Prefer explicit fiat total in metadata if present, otherwise compute from price
    if (tx.metadata?.fiat_amount) {
      total = Number(tx.metadata.fiat_amount);
    } else if (price != null && cryptoAmount != null) {
      total = price * cryptoAmount;
    }
  } else {
    // deposit/other: use stored amount and compute total if price present
    amount = Math.abs(Number(tx.amount || '0'));
    if (price != null) {
      total = price * amount;
    }
  }

  const txHash = tx.metadata?.tx_hash || tx.metadata?.signature || tx.reference || null;

  return {
    id: tx.id,
    type,
    asset,
    amount,
    price: price ?? 0,
    total: total ?? 0,
    status: tx.status,
    timestamp: new Date(tx.created_at).getTime(),
    txHash,
    raw: tx
  };
}

export async function formatBalancesForAPI(balances: Balance[]) {
  const result = {
    fiat: {
      NGN: 0
    },
    crypto: [] as Array<{ asset: string; amount: number; usdValue: number }> ,
    timestamp: new Date().toISOString()
  };

  // Map balances to numeric values
  for (const b of balances) {
    const amt = Number(b.amount || '0');
    if (b.asset === 'NGN') {
      result.fiat.NGN = amt;
    } else {
      // compute USD/NGN value using priceService (NGN price)
      const price = await priceService.getPrice(b.asset as 'SOL' | 'USDC', 'NGN');
      result.crypto.push({ asset: b.asset, amount: amt, usdValue: Number((amt * price).toFixed(2)) });
    }
  }

  return result;
}
