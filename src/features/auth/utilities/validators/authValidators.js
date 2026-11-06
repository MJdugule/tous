import Joi from 'joi';

const OTP_PATTERN = /^\d{6}$/;
const OTP_ERROR = 'OTP must be a valid 6-digit numeric code.';

const emailRule = Joi.string()
  .trim()
  .email({ tlds: { allow: false } })
  .required()
  .messages({
    'string.email': 'Please provide a valid email address.',
    'string.empty': 'Email is required.',
    'any.required': 'Email is required.'
  });

const signupSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Full name is required.',
      'string.min': 'Full name must be at least 3 characters long.',
      'string.max': 'Full name must be at most 100 characters long.',
      'any.required': 'Full name is required.'
    }),
  email: emailRule,
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required.',
      'string.min': 'Password must be at least 6 characters long.',
      'string.max': 'Password must be at most 128 characters long.',
      'any.required': 'Password is required.'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match.',
      'string.empty': 'Confirm password is required.',
      'any.required': 'Confirm password is required.'
    })
});

const verifyEmailSchema = Joi.object({
  email: emailRule,
  otp: Joi.alternatives()
    .try(Joi.string().pattern(OTP_PATTERN), Joi.number().integer().min(100000).max(999999))
    .required()
    .custom((value) => String(value))
    .messages({
      'alternatives.match': OTP_ERROR,
      'alternatives.types': OTP_ERROR,
      'number.base': OTP_ERROR,
      'number.min': OTP_ERROR,
      'number.max': OTP_ERROR,
      'number.integer': OTP_ERROR,
      'string.pattern.base': OTP_ERROR,
      'string.empty': 'OTP is required.',
      'any.required': 'OTP is required.'
    })
});

const validate = (schema) => (req, res, next) => {
  const { value, error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((detail) => detail.message).join(' ')
    });
  }

  req.body = value;
  next();
};

export const validateSignupBody = validate(signupSchema);
export const validateVerifyEmailBody = validate(verifyEmailSchema);
