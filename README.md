# tous

## Email Verification Setup

Install dependencies:

```bash
npm install
```

Add SMTP configuration in your environment:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=no-reply@yourdomain.com
```

If SMTP values are missing, OTP codes are logged to the terminal for local development.

## Endpoints

### Signup (sends OTP email)

`POST /api/auth/signup`

```json
{
	"username": "testuser",
	"email": "test@example.com",
	"password": "secret123"
}
```

### Verify email

`POST /api/auth/verify-email`

```json
{
	"email": "test@example.com",
	"otp": "123456"
}
```