import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ledgerService } from '../services/LedgerService';
import { priceService } from '../services/PriceService';
import { AppError, InvalidAmountError } from '../utils/errors';

const router = Router();

/**
 * Buy crypto with fiat (off-chain)
 * Example: Buy SOL with NGN
 */
router.post('/buy', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { cryptoAsset, fiatAmount } = req.body;
    const userId = req.userId!;

    // Validate inputs
    if (!['SOL', 'USDC'].includes(cryptoAsset)) {
      throw new AppError(400, 'Invalid crypto asset. Supported: SOL, USDC');
    }

    if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
      throw new InvalidAmountError();
    }

    // Get current price
    const price = await priceService.getPrice(cryptoAsset, 'NGN');
    const cryptoAmount = parseFloat(fiatAmount) / price;

    // Debit NGN balance
    await ledgerService.debit(
      userId,
      'NGN',
      parseFloat(fiatAmount).toFixed(2),
      'buy',
      undefined,
      { 
        crypto_asset: cryptoAsset,
        crypto_amount: cryptoAmount.toFixed(8),
        price,
        rate: price
      }
    );

    // Credit crypto balance
    const transaction = await ledgerService.credit(
      userId,
      cryptoAsset,
      cryptoAmount.toFixed(8),
      'buy',
      undefined,
      { 
        fiat_amount: fiatAmount,
        price,
        rate: price
      }
    );

    res.json({
      message: `Bought ${cryptoAmount.toFixed(8)} ${cryptoAsset}`,
      transaction,
      details: {
        cryptoAsset,
        cryptoAmount: cryptoAmount.toFixed(8),
        fiatAmount,
        price,
        timestamp: new Date().toISOString()
      },
      balances: {
        NGN: await ledgerService.getBalance(userId, 'NGN'),
        [cryptoAsset]: await ledgerService.getBalance(userId, cryptoAsset)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Sell crypto for fiat (off-chain)
 * Example: Sell SOL for NGN
 */
router.post('/sell', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { cryptoAsset, cryptoAmount } = req.body;
    const userId = req.userId!;

    // Validate inputs
    if (!['SOL', 'USDC'].includes(cryptoAsset)) {
      throw new AppError(400, 'Invalid crypto asset. Supported: SOL, USDC');
    }

    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      throw new InvalidAmountError();
    }

    // Get current price
    const price = await priceService.getPrice(cryptoAsset, 'NGN');
    const fiatAmount = parseFloat(cryptoAmount) * price;

    // Debit crypto balance
    await ledgerService.debit(
      userId,
      cryptoAsset,
      parseFloat(cryptoAmount).toFixed(8),
      'sell',
      undefined,
      { 
        fiat_amount: fiatAmount.toFixed(2),
        price,
        rate: price
      }
    );

    // Credit NGN balance
    const transaction = await ledgerService.credit(
      userId,
      'NGN',
      fiatAmount.toFixed(2),
      'sell',
      undefined,
      { 
        crypto_asset: cryptoAsset,
        crypto_amount: cryptoAmount,
        price,
        rate: price
      }
    );

    res.json({
      message: `Sold ${cryptoAmount} ${cryptoAsset}`,
      transaction,
      details: {
        cryptoAsset,
        cryptoAmount,
        fiatAmount: fiatAmount.toFixed(2),
        price,
        timestamp: new Date().toISOString()
      },
      balances: {
        NGN: await ledgerService.getBalance(userId, 'NGN'),
        [cryptoAsset]: await ledgerService.getBalance(userId, cryptoAsset)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get current prices
 */
router.get('/prices', async (req, res, next) => {
  try {
    const [solPrice, usdcPrice] = await Promise.all([
      priceService.getPrice('SOL', 'NGN'),
      priceService.getPrice('USDC', 'NGN')
    ]);

    res.json({
      prices: {
        SOL: solPrice,
        USDC: usdcPrice
      },
      currency: 'NGN',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;