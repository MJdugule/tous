import Joi from 'joi';

const email = Joi.string().trim().email({ tlds: { allow: false } }).required();

const validate = (schema, normalize = (body) => body) => (req, res, next) => {
  const { error, value } = schema.validate(normalize(req.body ?? {}), {
	abortEarly: false
  });

  if (error) {
	return res.status(400).json({
	  success: false,
	  message: 'Invalid request.',
	  errors: error.details.map(({ message }) => message)
	});
  }

  req.body = value;
  return next();
};

export const validateUserSignUp = validate(
  Joi.object({
	fullName: Joi.string().trim().min(3).max(100).regex(/[A-Za-z]/).required(),
	email,
	password: Joi.string().min(8).max(128).required(),
	confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),
  (body) => ({
	...body,
	email: typeof body.email === 'string' ? body.email.toLowerCase() : body.email
  })
);

export const validateUserSignIn = validate(
  Joi.object({
	email,
	password: Joi.string().min(1).max(128).required()
  }),
  (body) => ({
	...body,
	email: typeof body.email === 'string' ? body.email.toLowerCase() : body.email
  })
);

export const validateUserVerifyEmail = validate(
  Joi.object({
	email,
	otp: Joi.string().pattern(/^\d{6}$/).required()
  }),
  (body) => ({
	...body,
	email: typeof body.email === 'string' ? body.email.toLowerCase() : body.email,
	otp: body.otp !== undefined && body.otp !== null ? String(body.otp) : body.otp
  })
);

export const validateRefreshToken = validate(
  Joi.object({
	refreshToken: Joi.string().trim().min(1).max(256).required()
  })
);
