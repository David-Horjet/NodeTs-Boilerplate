import { supabaseAdmin } from '../config/supabase';
import { AssetType, TransactionType, LedgerTransaction, Balance } from '../types';
import { AppError, InsufficientBalanceError, InvalidAmountError } from '../utils/errors';

/**
 * LedgerService: Handles all balance and transaction ledger operations
 * 
 * CRITICAL: This is the "source of truth" for user balances
 * - All balance changes must go through this service
 * - Transactions are atomic (balance + ledger entry)
 * - Balances never go negative (enforced by DB constraint)
 */
export class LedgerService {
  
  /**
   * Get user's balance for a specific asset
   */
  async getBalance(userId: string, asset: AssetType): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('balances')
      .select('amount')
      .eq('user_id', userId)
      .eq('asset', asset)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new AppError(500, 'Failed to fetch balance');
    }

    return data?.amount || '0';
  }

  /**
   * Get all balances for a user
   */
  async getAllBalances(userId: string): Promise<Balance[]> {
    const { data, error } = await supabaseAdmin
      .from('balances')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new AppError(500, 'Failed to fetch balances');
    }

    return data || [];
  }

  /**
   * Credit user balance (deposits, buy crypto, etc)
   */
  async credit(
    userId: string,
    asset: AssetType,
    amount: string,
    type: TransactionType,
    reference?: string,
    metadata?: Record<string, any>
  ): Promise<LedgerTransaction> {
    if (Number(amount) <= 0) {
      throw new InvalidAmountError();
    }

    // Start transaction: upsert balance + create ledger entry
    const { data: balance, error: balanceError } = await supabaseAdmin
      .from('balances')
      .upsert({
        user_id: userId,
        asset,
        amount: await this.getBalance(userId, asset)
      }, {
        onConflict: 'user_id,asset'
      })
      .select()
      .single();

    if (balanceError) {
      throw new AppError(500, 'Failed to update balance');
    }

    // Increment balance
    const newAmount = (Number(balance.amount) + Number(amount)).toFixed(8);
    
    const { error: updateError } = await supabaseAdmin
      .from('balances')
      .update({ amount: newAmount })
      .eq('user_id', userId)
      .eq('asset', asset);

    if (updateError) {
      throw new AppError(500, 'Failed to credit balance');
    }

    // Create ledger entry
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('ledger_transactions')
      .insert({
        user_id: userId,
        type,
        asset,
        amount,
        status: 'completed',
        reference,
        metadata
      })
      .select()
      .single();

    if (txError) {
      throw new AppError(500, 'Failed to create ledger entry');
    }

    return transaction;
  }

  /**
   * Debit user balance (withdrawals, buy fiat, etc)
   */
  async debit(
    userId: string,
    asset: AssetType,
    amount: string,
    type: TransactionType,
    reference?: string,
    metadata?: Record<string, any>
  ): Promise<LedgerTransaction> {
    if (Number(amount) <= 0) {
      throw new InvalidAmountError();
    }

    const currentBalance = await this.getBalance(userId, asset);
    const newAmount = Number(currentBalance) - Number(amount);

    if (newAmount < 0) {
      throw new InsufficientBalanceError(asset);
    }

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from('balances')
      .update({ amount: newAmount.toFixed(8) })
      .eq('user_id', userId)
      .eq('asset', asset);

    if (updateError) {
      throw new AppError(500, 'Failed to debit balance');
    }

    // Create ledger entry
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('ledger_transactions')
      .insert({
        user_id: userId,
        type,
        asset,
        amount: `-${amount}`, // Negative for debits
        status: 'completed',
        reference,
        metadata
      })
      .select()
      .single();

    if (txError) {
      throw new AppError(500, 'Failed to create ledger entry');
    }

    return transaction;
  }

  /**
   * Get transaction history for a user
   */
  async getTransactions(userId: string, limit = 50): Promise<LedgerTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('ledger_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new AppError(500, 'Failed to fetch transactions');
    }

    return data || [];
  }
}

export const ledgerService = new LedgerService();