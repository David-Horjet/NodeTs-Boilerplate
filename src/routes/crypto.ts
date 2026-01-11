import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { walletService } from '../services/WalletService';
import { blockchainService } from '../services/BlockchainService';
import { ledgerService } from '../services/LedgerService';
import { AppError, InvalidAmountError } from '../utils/errors';
import { mapTransactionForAPI, formatBalancesForAPI } from '../utils/serializers';

const router = Router();

/**
 * Get user's deposit address
 */
router.get('/deposit/address', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    
    let address = await walletService.getDepositAddress(userId);
    
    if (!address) {
      address = await walletService.generateDepositAddress(userId);
    }

    res.json({
      chain: 'solana',
      network: 'devnet',
      address,
      instructions: 'Send SOL to this address. Deposits are automatically credited to your account.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get deposit history
 */
router.get('/deposits', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const transactions = await ledgerService.getTransactions(userId);
    
    const deposits = transactions.filter(tx => tx.type === 'crypto_deposit');
    // Map to API transaction shape
    const mapped = deposits.map(mapTransactionForAPI);

    res.json({
      deposits: mapped,
      count: mapped.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Withdraw crypto to external address
 */
router.post('/withdraw', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { toAddress, amount } = req.body;
    const userId = req.userId!;

    // Validate inputs
    if (!toAddress || !amount) {
      throw new AppError(400, 'Missing required fields: toAddress, amount');
    }

    if (parseFloat(amount) <= 0) {
      throw new InvalidAmountError();
    }

    // Minimum withdrawal amount (to cover fees)
    const MIN_WITHDRAWAL = 0.01;
    if (parseFloat(amount) < MIN_WITHDRAWAL) {
      throw new AppError(400, `Minimum withdrawal amount is ${MIN_WITHDRAWAL} SOL`);
    }

    // Process withdrawal (debits balance and sends on-chain)
    const signature = await blockchainService.processWithdrawal(
      userId,
      toAddress,
      parseFloat(amount)
    );

    const newBalanceStr = await ledgerService.getBalance(userId, 'SOL');
    const newBalance = parseFloat(newBalanceStr);

    // Create a minimal transaction object for API consumers
    const apiTx = {
      id: signature,
      type: 'withdraw',
      asset: 'SOL',
      amount: parseFloat(amount),
      status: 'pending',
      timestamp: Date.now(),
      txHash: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    };

    res.json({
      message: 'Withdrawal successful',
      transaction: apiTx,
      txHash: signature,
      newBalance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get crypto balance
 */
router.get('/balance/:asset', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { asset } = req.params;
    const userId = req.userId!;

    if (!['SOL', 'USDC'].includes(asset.toUpperCase())) {
      throw new AppError(400, 'Invalid asset. Supported: SOL, USDC');
    }

    const balanceStr = await ledgerService.getBalance(userId, asset.toUpperCase() as any);
    const balance = parseFloat(balanceStr);

    res.json({
      asset: asset.toUpperCase(),
      balance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all balances
 */
router.get('/balances', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const balances = await ledgerService.getAllBalances(userId);
    const formatted = await formatBalancesForAPI(balances);

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

/**
 * Get transaction history
 */
router.get('/transactions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const transactions = await ledgerService.getTransactions(userId, limit);
    const mapped = transactions.map(mapTransactionForAPI);

    res.json({
      transactions: mapped,
      count: mapped.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
