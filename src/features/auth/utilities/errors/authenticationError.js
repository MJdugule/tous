export class AuthenticationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}