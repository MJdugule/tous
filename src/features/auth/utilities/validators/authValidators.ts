import type { Request, Response, NextFunction } from 'express';

export const validateSignupBody = (req: Request, res: Response, next: NextFunction): any => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields: username, email, and password are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  next();
};

export const validateVerifyEmailBody = (req: Request, res: Response, next: NextFunction): any => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Missing fields: email and otp are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ success: false, message: 'OTP must be a valid 6-digit numeric code.' });
  }

  next();
};