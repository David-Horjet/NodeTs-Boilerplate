/**
 * Standalone deposit monitor script
 * Run separately from API server: npm run monitor
 */

import { blockchainService } from '../services/BlockchainService';
import '../config/env'; // Load environment

console.log('Starting standalone deposit monitor...');
console.log('Monitoring Solana devnet for deposits');

blockchainService.startMonitoring(10000); // Check every 10 seconds

// Keep process alive
process.on('SIGINT', () => {
  console.log('\nShutting down deposit monitor...');
  process.exit(0);
});