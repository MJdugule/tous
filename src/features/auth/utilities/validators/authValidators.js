const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateSignupBody = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields: username, email, and password are required.' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  next();
};

export const validateVerifyEmailBody = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Missing fields: email and otp are required.' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!/^\d{6}$/.test(String(otp))) {
    return res.status(400).json({ success: false, message: 'OTP must be a valid 6-digit numeric code.' });
  }

  next();
};
