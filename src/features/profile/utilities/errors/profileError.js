export class ProfileError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ProfileError';
    this.statusCode = statusCode;
  }
}
