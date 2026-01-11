import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ledgerService } from '../services/LedgerService';
import { InvalidAmountError } from '../utils/errors';

const router = Router();

/**
 * Simulate fiat deposit (NGN)
 * In production: integrate with Paystack, Flutterwave, etc.
 */
router.post('/deposit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.userId!;

    if (!amount || parseFloat(amount) <= 0) {
      throw new InvalidAmountError();
    }

    // Generate fake payment reference
    const reference = `NGN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Credit NGN balance
    const transaction = await ledgerService.credit(
      userId,
      'NGN',
      parseFloat(amount).toFixed(2),
      'fiat_deposit',
      reference,
      { method: 'simulated', note: 'Demo deposit - no real payment processed' }
    );

    res.json({
      message: 'Fiat deposit successful',
      transaction,
      balance: await ledgerService.getBalance(userId, 'NGN')
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get fiat balance
 */
router.get('/balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const balance = await ledgerService.getBalance(userId, 'NGN');

    res.json({
      asset: 'NGN',
      balance
    });
  } catch (error) {
    next(error);
  }
});

export default router;