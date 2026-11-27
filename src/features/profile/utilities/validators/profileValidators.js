import Joi from 'joi';

const ALLOWED_INTERESTS = [
  // Creative
  'Music',
  'Art',
  'Photography',
  'Writing',
  'Fashion',
  'Film & TV',
  // Activities
  'Travel',
  'Fitness',
  'Cooking',
  'Dancing',
  'Gaming',
  'Reading',
  // Lifestyle
  'Food',
  'Night Life',
  'Nature',
  'Pets',
  'Adventure',
  'Personal Growth',
  // Ideas & work
  'Technology',
  'Business',
  'Design',
  'Science',
  'Entrepreneurship',
];

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false });

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

export const validateUpdateProfileSchema = validate(
  Joi.object({
  // Screen 1
  fullName: Joi.string().min(2).max(100).trim(),
  age: Joi.number().integer().min(18).max(100),
  gender: Joi.string().valid('male', 'female').lowercase(),
  location: Joi.string().min(2).max(100).trim(),
  aboutYou: Joi.string().min(10).max(500).trim(),

  // Screen 2
  interests: Joi.array()
    .items(Joi.string().valid(...ALLOWED_INTERESTS))
    .min(1)
    .unique(),

  // Screen 3
  relationshipGoal: Joi.string().valid(
    'A long-term relationship',
    'Something casual',
    "Let's see where it goes",
    'Meeting new people'
  ),

  // Screen 4
  interestedIn: Joi.array().items(Joi.string().valid('Men', 'Women')).min(1).unique(),
  preferredAgeRange: Joi.array()
    .items(Joi.string().valid('18-25', '26-35', '36-45', '56-65', '66-75'))
    .min(1)
    .unique(),

  // Screen 5
  languages: Joi.array()
    .items(Joi.string().valid('English', 'German', 'French', 'Spanish', 'others'))
    .min(1)
    .unique(),
  drinking: Joi.string().valid('Never', 'Sometimes', 'Often', 'Prefer not to say'),
  smoking: Joi.string().valid('Never', 'Sometimes', 'Often', 'Prefer not to say'),
  pets: Joi.string().valid('Have pets', 'Love pets', 'No pets', 'Prefer not to say'),

  // Screen 6 ("4 of 4 photos added — 4 required")
  photos: Joi.array().items(Joi.string().uri()).length(4),
})
  .min(1)
  .unknown(false) // Strictly rejects email, role, isVerified, passwordHash, etc.
  .messages({
    'object.unknown': 'Field "{{#label}}" cannot be updated.',
    'object.min': 'Provide at least one profile field to update.',
  })
);

export const validateSocketJoinRoomSchema = validate(
  Joi.object({
    // poolId: objectId.required(),
  selfieUrl: Joi.string().uri().optional(),
  })
);

export const validateGender = validate(
  Joi.object({
    gender: Joi.string().lowercase().valid('male', 'female').required()
  })
);

export const validatePoolStatusQuery = (req, res, next) => {
  const { error, value } = Joi.object({
    status: Joi.string().valid('upcoming', 'active').optional()
  }).validate(req.query, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid pool filter.',
      errors: error.details.map(({ message }) => message)
    });
  }

  req.query = value;
  return next();
};

export const validatePaymentWebhook = (req, res, next) => {
  const { error, value } = Joi.object({
    reference: Joi.string().required(),
    transactionId: Joi.string().trim().min(1).max(200).required(),
    amountMinorUnits: Joi.number().integer().min(1).required(),
    currency: Joi.string().uppercase().length(3).required(),
    status: Joi.string().valid('succeeded', 'failed').required()
  }).validate(req.body ?? {}, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment webhook.',
      errors: error.details.map(({ message }) => message)
    });
  }

  req.body = value;
  return next();
};
