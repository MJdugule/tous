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
| POST   | `/api/auth/signup`       | `{ username, email, password }`     |
| POST   | `/api/auth/verify-email` | `{ email, otp }`                    |

Signup stores a pending verification (OTP, 10 min expiry) in MongoDB and emails the
code via SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in `.env`); without
SMTP config the OTP is printed to the server log. A successful verify-email moves the
record into the `users` collection with `isVerified: true`.