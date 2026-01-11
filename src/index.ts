import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { AppError } from './utils/errors';
import { blockchainService } from './services/BlockchainService';

// Routes
import authRoutes from './routes/auth';
import fiatRoutes from './routes/fiat';
import tradingRoutes from './routes/trading';
import cryptoRoutes from './routes/crypto';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.env
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/fiat', fiatRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/crypto', cryptoRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    ...(config.server.env === 'development' && { details: err.message })
  });
});

// Start server
const PORT = config.server.port;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Crypto Exchange Backend (Devnet)        ║
╚═══════════════════════════════════════════╝

Server running on port ${PORT}
Environment: ${config.server.env}

API Endpoints:
- POST   /api/auth/signup
- POST   /api/auth/login
- POST   /api/fiat/deposit
- GET    /api/fiat/balance
- POST   /api/trading/buy
- POST   /api/trading/sell
- GET    /api/trading/prices
- GET    /api/crypto/deposit/address
- POST   /api/crypto/withdraw
- GET    /api/crypto/balances
- GET    /api/crypto/transactions

Starting deposit monitor...
  `);

  // Start monitoring blockchain deposits
  blockchainService.startMonitoring(15000); // Check every 15 seconds
});
