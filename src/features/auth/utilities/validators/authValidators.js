import Joi from 'joi';

export const validateUserSignUp = async (req, res, next) => {
	try {
		const schema = Joi.object().keys({
			fullName: Joi.string().trim().min(3).max(100).regex(/[A-Za-z]/).required(),
			email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
			password: Joi.string().min(8).max(128).required(),
			confirmPassword: Joi.string().valid(Joi.ref('password')).required()
		})

		const data = {
			fullName: req.body.fullName,
			email: req.body.email?.toLowerCase?.(),
			password: req.body.password,
			confirmPassword: req.body.confirmPassword
		}

		// const { error, value } = schema.validate(data)

		// if (error) throw { status: 403, errorcode: 'V403VUSU', message: 'Please crosscheck the information provided', details: error.details.map((detail) => detail.message) }

		req.body = parseBody(schema, data)
		next()
	} catch (error) {
		handleValidationError(error, res);
	}
}

export const validateUserVerifyEmail = async (req, res, next) => {
	try {
		const schema = Joi.object().keys({
			email: Joi.string().trim().email({ tlds: { allow: false } }).required(),
			otp: Joi.string().pattern(/^\d{8}$/).required()
		})

		const data = {
			email: req.body.email?.toLowerCase?.(),
			otp: req.body.otp !== undefined && req.body.otp !== null ? String(req.body.otp) : req.body.otp
		}

		// const { error, value } = schema.validate(data)

		// if (error) throw { status: 403, errorcode: 'V403VUSU', message: 'Please crosscheck the information provided', details: error.details.map((detail) => detail.message) }

		req.body = parseBody(schema, data)
		next()
	} catch (error) {
    handleValidationError(error, res);
		// return res.status(error.status || 500).json({
		// 	success: false,
		// 	status: error.status || 500,
		// 	errorcode: error.errorcode || 'V500VUSU',
		// 	message: error.message || 'An unexpected validation error occurred.',
		// 	details: error.details
		// })
	}
}

const handleValidationError = (error, res) => {
    if (error instanceof ValidationError) {
        res.status(400).json({success: false, status: 'error', message: error.message || 'An unexpected validation error occurred.', errors: error.errors });
        return;
    }
    res.status(500).json({ success: false, status: 'error', message: 'Unexpected validation error' });
};

const parseBody = (schema, data)=> {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new 
            result.error.details.map((detail) => detail.message)
        
    }
    return result.data;
};
