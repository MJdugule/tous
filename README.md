# tous

Express API written in plain JavaScript (ES Modules) with MongoDB via mongoose.

## Requirements

- Node.js 18+
- MongoDB (connection string in `.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/my_database
JWT_ACCESS_SECRET=replace-with-a-random-secret-at-least-32-bytes
PAYMENT_WEBHOOK_SECRET=replace-with-the-provider-webhook-secret
```

If you don't have MongoDB installed locally, run it with Docker:

```bash
docker run -d --name tous-mongo -p 27017:27017 mongo:7
```

## Run

```bash
npm install
npm run dev   # nodemon, auto-restarts on changes
npm start     # plain node
```

## API

| Method | Route                    | Body                                |
| ------ | ------------------------ | ----------------------------------- |
| POST   | `/api/auth/signin`       | `{ email, password }`               |
| POST   | `/api/auth/refresh`      | `{ refreshToken }`                  |
| POST   | `/api/auth/signout`      | `{ refreshToken }`                  |
| POST   | `/api/auth/signup`       | `{ fullName, email, password, confirmPassword }` |
| POST   | `/api/auth/verify-email` | `{ email, otp }`                    |
| POST   | `/api/pools` | Create a pool (Bearer token required) |
| GET    | `/api/pools` | List pools (optional `status=upcoming|active`) |
| GET    | `/api/pools/mine/rooms` | List your rooms |
| PATCH  | `/api/pools/me/gender` | Set your gender before joining a room |
| GET    | `/api/pools/:poolId/rooms` | View your room and rooms you can join |
| POST   | `/api/pools/:poolId/join` | Join an available room |
| POST   | `/api/pools/:poolId/payment-intents` | Get a payment reference for a paid pool |
| POST   | `/api/pools/payments/webhook` | Confirm payments from the provider |

Swagger documentation is served at `/api-docs` and opens in your default browser
when the server starts.

Sign-in requires a verified account and returns an access token (15-minute default)
and a rotating refresh token (7-day default), along with the user's `id`, `fullName`,
and `email`. Set `JWT_ACCESS_SECRET` to a random secret of at least 32 bytes.
`ACCESS_TOKEN_TTL_SECONDS` and `REFRESH_TOKEN_TTL_SECONDS` optionally override the
token lifetimes. Refresh tokens are stored hashed in MongoDB and invalidated when
rotated or signed out. A signed-out access token remains valid until its short
expiration because access tokens are stateless.

Signup stores a pending verification (OTP, 10 min expiry) in MongoDB and emails the
code via SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `.env`); without
SMTP config the OTP is printed to the server log. A successful verify-email moves the
record into the `users` collection with `isVerified: true`.

Pools assign each room exactly five male and five female participants. Room numbers
advance only after the current room is full. Pool status is derived from its start
time (`upcoming` before the start, `active` at and after it); joining closes when a
pool starts. Free pools can be joined directly. For paid pools, create a payment
reference, complete checkout with the chosen provider, and configure
`PAYMENT_WEBHOOK_SECRET`; the provider must POST `{ reference, transactionId,
amountMinorUnits, currency, status }` to `/api/pools/payments/webhook` with an
`x-payment-signature` HMAC-SHA256 hex signature of the exact request body. Only a
confirmed webhook permits joining. Paid pool prices use the provider currency's
minor units (for example, 1500 is 15.00 where that currency has two decimal places).
New accounts must set `gender` to `male` or `female` during signup. Existing users
without a gender can set it at `/api/pools/me/gender` before joining any room.