import nodemailer from 'nodemailer';

const parseBoolean = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  return value.toLowerCase() === 'true';
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = parseBoolean(process.env.SMTP_SECURE);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'no-reply@example.com';

const isSmtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })
  : null;

export const sendSignupOtpEmail = async (email: string, otp: string): Promise<void> => {
  if (!transporter) {
    console.warn('[Email Service]: SMTP config missing. OTP dispatch skipped.');
    console.log(`📨 [Email Service]: OTP for ${email} is ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject: 'Verify your email address',
    text: `Your verification code is: ${otp}. This code expires in 10 minutes.`
  });
};
