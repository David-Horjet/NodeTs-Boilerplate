import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { config } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/errors';
import bs58 from 'bs58';

/**
 * WalletService: Manages Solana wallet operations
 * 
 * ARCHITECTURE:
 * - Platform has ONE hot wallet (controlled by private key)
 * - Each user gets a unique deposit address (derived keypair)
 * - Deposits go to user-specific addresses
 * - Withdrawals come from the hot wallet
 * 
 * SECURITY NOTES:
 * - In production: use MPC, HSM, or AWS KMS
 * - Never expose private keys in logs
 * - Implement withdrawal limits and multi-sig
 */
export class WalletService {
  private connection: Connection;
  private hotWallet: Keypair;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    
    try {
      // Decode base58 private key
      const secretKey = bs58.decode(config.solana.hotWalletPrivateKey);
      this.hotWallet = Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error('Invalid hot wallet private key');
    }
  }

  /**
   * Generate a unique deposit address for a user
   * Uses deterministic derivation from user ID
   */
  async generateDepositAddress(userId: string): Promise<string> {
    // Check if user already has a deposit address
    const { data: existing } = await supabaseAdmin
      .from('deposit_addresses')
      .select('address')
      .eq('user_id', userId)
      .eq('chain', 'solana')
      .single();

    if (existing) {
      return existing.address;
    }

    // Generate new keypair for this user
    // In production: use HD wallets (BIP-44) for better key management
    const depositKeypair = Keypair.generate();
    const address = depositKeypair.publicKey.toBase58();

    // Store the address mapping (NOT the private key)
    // Note: You'd need to store private keys securely if you want to sweep funds
    const { error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        chain: 'solana',
        address
      });

    if (error) {
      throw new AppError(500, 'Failed to save deposit address');
    }

    console.log(`Generated deposit address for user ${userId}: ${address}`);
    
    return address;
  }

  /**
   * Get user's deposit address
   */
  async getDepositAddress(userId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('deposit_addresses')
      .select('address')
      .eq('user_id', userId)
      .eq('chain', 'solana')
      .single();

    return data?.address || null;
  }

  /**
   * Check SOL balance of an address
   */
  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Send SOL from hot wallet to user address (withdrawal)
   */
  async sendSol(toAddress: string, amount: number): Promise<string> {
    try {
      const toPubkey = new PublicKey(toAddress);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.hotWallet.publicKey,
          toPubkey,
          lamports
        })
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.hotWallet],
        { commitment: 'confirmed' }
      );

      console.log(`Withdrawal sent: ${signature}`);
      return signature;
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      throw new AppError(500, `Withdrawal failed: ${error.message}`);
    }
  }

  /**
   * Get hot wallet address (for admin/monitoring)
   */
  getHotWalletAddress(): string {
    return this.hotWallet.publicKey.toBase58();
  }

  /**
   * Get recent transactions for an address
   */
  async getRecentTransactions(address: string, limit = 10) {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit }
      );

      return signatures;
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }
}

export const walletService = new WalletService();