import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { ledgerService } from './LedgerService';
import { walletService } from './WalletService';

/**
 * BlockchainService: Monitors blockchain for deposits
 * 
 * FLOW:
 * 1. User gets a deposit address
 * 2. User sends SOL to that address
 * 3. This service detects the transaction
 * 4. Credits user's ledger balance
 * 5. (Optional) Sweeps funds to hot wallet
 * 
 * PRODUCTION CONSIDERATIONS:
 * - Run as separate process (not in API server)
 * - Use WebSocket subscriptions instead of polling
 * - Implement retry logic and dead letter queue
 * - Track confirmations (wait for finalized)
 */
export class BlockchainService {
  private connection: Connection;
  private isMonitoring = false;
  private processedSignatures = new Set<string>();

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
  }

  /**
   * Start monitoring all deposit addresses
   */
  async startMonitoring(intervalMs = 10000) {
    if (this.isMonitoring) {
      console.log('Already monitoring deposits');
      return;
    }

    this.isMonitoring = true;
    console.log('Starting deposit monitor...');

    // Poll for new deposits
    setInterval(() => this.checkDeposits(), intervalMs);
    
    // Initial check
    await this.checkDeposits();
  }

  /**
   * Check all deposit addresses for new transactions
   */
  private async checkDeposits() {
    try {
      // Get all deposit addresses
      const { data: addresses, error } = await supabaseAdmin
        .from('deposit_addresses')
        .select('user_id, address')
        .eq('chain', 'solana');

      if (error || !addresses) {
        console.error('Failed to fetch deposit addresses:', error);
        return;
      }

      console.log(`Checking ${addresses.length} deposit addresses...`);

      for (const { user_id, address } of addresses) {
        await this.checkAddressDeposits(user_id, address);
      }
    } catch (error) {
      console.error('Deposit check error:', error);
    }
  }

  /**
   * Check specific address for new deposits
   */
  private async checkAddressDeposits(userId: string, address: string) {
    try {
      const publicKey = new PublicKey(address);
      
      // Get recent transactions
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 5 }
      );

      for (const sigInfo of signatures) {
        // Skip already processed
        if (this.processedSignatures.has(sigInfo.signature)) {
          continue;
        }

        // Skip failed transactions
        if (sigInfo.err) {
          this.processedSignatures.add(sigInfo.signature);
          continue;
        }

        // Get full transaction details
        const tx = await this.connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        });

        if (!tx) continue;

        // Parse transaction to find transfers to this address
        const amount = this.parseDepositAmount(tx, address);
        
        if (amount > 0) {
          await this.processDeposit(userId, amount, sigInfo.signature);
          this.processedSignatures.add(sigInfo.signature);
        }
      }
    } catch (error) {
      console.error(`Error checking address ${address}:`, error);
    }
  }

  /**
   * Parse transaction to extract deposit amount
   */
  private parseDepositAmount(tx: any, toAddress: string): number {
    try {
      const { meta, transaction } = tx;
      
      if (!meta || !transaction) return 0;

      // Get account keys
      const accountKeys = transaction.message.getAccountKeys().staticAccountKeys;
      const toIndex = accountKeys.findIndex(
        key => key.toBase58() === toAddress
      );

      if (toIndex === -1) return 0;

      // Check balance change
      const preBalance = meta.preBalances[toIndex];
      const postBalance = meta.postBalances[toIndex];
      const lamports = postBalance - preBalance;

      if (lamports <= 0) return 0;

      return lamports / 1e9; // Convert to SOL
    } catch (error) {
      console.error('Failed to parse deposit amount:', error);
      return 0;
    }
  }

  /**
   * Process a detected deposit
   */
  private async processDeposit(userId: string, amount: number, txHash: string) {
    try {
      console.log(`Processing deposit: ${amount} SOL for user ${userId}`);
      console.log(`Transaction: ${txHash}`);

      // Check if already processed (by signature)
      const { data: existing } = await supabaseAdmin
        .from('ledger_transactions')
        .select('id')
        .eq('reference', txHash)
        .single();

      if (existing) {
        console.log('Deposit already processed');
        return;
      }

      // Credit user balance
      await ledgerService.credit(
        userId,
        'SOL',
        amount.toFixed(8),
        'crypto_deposit',
        txHash,
        { chain: 'solana' }
      );

      console.log(`✓ Credited ${amount} SOL to user ${userId}`);
    } catch (error) {
      console.error('Failed to process deposit:', error);
    }
  }

  /**
   * Process a withdrawal
   */
  async processWithdrawal(
    userId: string,
    toAddress: string,
    amount: number
  ): Promise<string> {
    // Debit user balance first (this validates they have enough)
    await ledgerService.debit(
      userId,
      'SOL',
      amount.toFixed(8),
      'withdraw',
      undefined,
      { to_address: toAddress, status: 'pending' }
    );

    try {
      // Send transaction
      const signature = await walletService.sendSol(toAddress, amount);

      // Update ledger with signature
      const { error } = await supabaseAdmin
        .from('ledger_transactions')
        .update({ reference: signature })
        .eq('user_id', userId)
        .eq('type', 'withdraw')
        .is('reference', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to update withdrawal reference:', error);
      }

      return signature;
    } catch (error) {
      // If blockchain tx fails, refund the balance
      await ledgerService.credit(
        userId,
        'SOL',
        amount.toFixed(8),
        'crypto_deposit',
        undefined,
        { type: 'withdrawal_refund' }
      );
      throw error;
    }
  }
}

export const blockchainService = new BlockchainService();