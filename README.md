# tous

Express API written in plain JavaScript (ES Modules) with MongoDB via mongoose.

## Requirements

- Node.js 18+
- MongoDB (connection string in `.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/my_database
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