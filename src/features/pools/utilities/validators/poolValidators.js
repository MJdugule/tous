import Joi from 'joi';

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

export const validateCreatePool = validate(
  Joi.object({
    title: Joi.string().trim().min(1).max(120).required(),
    description: Joi.string().trim().min(1).max(5000).required(),
    imageUrl: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    startsAt: Joi.date().iso().greater('now').required(),
    isPaid: Joi.boolean().required(),
     price: Joi.when('isPaid', {
      is: true,
      then: Joi.number().greater(0).required(),
      otherwise: Joi.number().valid(0).default(0),
    }),
    // currency: Joi.when('type', {
    //   is: 'paid',
    //   then: Joi.string().uppercase().length(3).required(),
    //   otherwise: Joi.forbidden()
    // })
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
