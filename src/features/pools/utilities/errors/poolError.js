export class PoolError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PoolError';
    this.statusCode = statusCode;
  }
}
