import { LedgerTransaction, Balance } from '../types';
import { priceService } from '../services/PriceService';

export function mapTransactionForAPI(tx: LedgerTransaction) {
  // Normalize type
  const type = tx.type === 'crypto_deposit' || tx.type === 'fiat_deposit' ? 'deposit' : tx.type;

  const rawAmount = parseFloat(tx.amount || '0');
  const amount = Math.abs(rawAmount);

  const price = tx.metadata?.price ? Number(tx.metadata.price) : null;
  const total = price && (type === 'buy' || type === 'sell') ? Number((price * amount).toFixed(2)) : price && type === 'deposit' ? Number((price * amount).toFixed(2)) : null;

  const txHash = tx.metadata?.tx_hash || tx.metadata?.signature || tx.reference || null;

  return {
    id: tx.id,
    type,
    asset: tx.asset,
    amount,
    price: price ?? 0,
    total: total ?? 0,
    status: tx.status,
    timestamp: new Date(tx.created_at).getTime(),
    txHash,
    raw: tx // keep original for debugging if needed
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
    const amt = parseFloat(b.amount || '0');
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
