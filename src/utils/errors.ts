export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(asset: string) {
    super(400, `Insufficient ${asset} balance`);
  }
}

export class InvalidAmountError extends AppError {
  constructor() {
    super(400, 'Amount must be greater than 0');
  }
}