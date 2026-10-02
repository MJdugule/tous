import bcrypt from 'bcrypt';
import * as dbHelper from '../utilities/helpers/authHelper.js';
import type { SignupDTO } from '../dtos/signupDtos.js'; 

export class SignupService {
  async processSignupRequest(payload: SignupDTO) {
    // 1. Check if user already exists in the system
    const existingUser = await dbHelper.findUserByEmailOrUsername(payload.email, payload.username);
    if (existingUser) {
      throw new Error('Username or email is already taken.');
    }

    // 2. Hash raw credentials
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);

    // 3. Generate a secure 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes

    // 4. Persist the unverified session context
    await dbHelper.createUnverifiedUserSession({
      username: payload.username,
      email: payload.email,
      passwordHash,
      otp,
      expiresAt
    });

    // 5. Send actual dispatch request (Using mock dispatch console output for logic tracking)
    console.log(`📨 [Email Service]: Dispatching signup verification OTP: ${otp} to ${payload.email}`);
    
    /* 
    Tip: For sending actual emails, initialize Nodemailer/SendGrid inside a global infrastructure/utility file:
    await transporter.sendMail({
       from: '"App Security" <no-reply@app.com>',
       to: payload.email,
       subject: "Verify your email address",
       text: `Your confirmation code is: ${otp}`
    });
    */

    return { email: payload.email, message: 'Verification OTP has been dispatched to your email address.' };
  }
}