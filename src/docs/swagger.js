const successResponse = (dataSchema) => ({
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    data: { $ref: `#/components/schemas/${dataSchema}` }
  }
});

const errorResponse = {
  type: 'object',
  required: ['success', 'message'],
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    errors: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const jsonRequest = (schema) => ({
  required: true,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` }
    }
  }
});

const jsonResponse = (description, schema) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` }
    }
  }
});

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Tous API',
    version: '1.0.0',
    description: 'API documentation for account registration and authentication.'
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
  tags: [{ name: 'Auth', description: 'Account authentication and verification' }],
  paths: {
    '/api/auth/signin': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in to a verified account',
        requestBody: jsonRequest('SignInDTO'),
        responses: {
          200: jsonResponse('Signed in successfully.', 'SignInSuccessResponseDTO'),
          400: jsonResponse('The request body is invalid.', 'ErrorResponseDTO'),
          401: jsonResponse('The email or password is incorrect.', 'ErrorResponseDTO'),
          403: jsonResponse('The account email has not been verified.', 'ErrorResponseDTO'),
          500: jsonResponse('An unexpected sign-in error occurred.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a pending account and dispatch a verification code',
        requestBody: jsonRequest('SignupDTO'),
        responses: {
          200: jsonResponse('Signup accepted.', 'SignupSuccessResponseDTO'),
          400: jsonResponse('Signup could not be completed.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify an account email using its one-time code',
        requestBody: jsonRequest('VerifyEmailDTO'),
        responses: {
          200: jsonResponse('Email verified successfully.', 'VerifyEmailSuccessResponseDTO'),
          400: jsonResponse('The verification request could not be completed.', 'ErrorResponseDTO')
        }
      }
    }
  },
  components: {
    schemas: {
      SignInDTO: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', minLength: 1, maxLength: 128 }
        }
      },
      SignedInUserDTO: {
        type: 'object',
        required: ['id', 'fullName', 'email'],
        properties: {
          id: { type: 'string', example: '66510a1ef6a1a2e392e11481' },
          fullName: { type: 'string', example: 'Taylor Example' },
          email: { type: 'string', format: 'email', example: 'user@example.com' }
        }
      },
      SignInSuccessResponseDTO: successResponse('SignedInUserDTO'),
      SignupDTO: {
        type: 'object',
        required: ['fullName', 'email', 'password', 'confirmPassword'],
        properties: {
          fullName: { type: 'string', minLength: 3, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          confirmPassword: { type: 'string', minLength: 8, maxLength: 128 }
        }
      },
      SignupResponseDTO: {
        type: 'object',
        required: ['email', 'message'],
        properties: {
          email: { type: 'string', format: 'email' },
          message: { type: 'string' }
        }
      },
      SignupSuccessResponseDTO: successResponse('SignupResponseDTO'),
      VerifyEmailDTO: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', pattern: '^\\d{8}$', example: '12345678' }
        }
      },
      VerifiedEmailDTO: {
        type: 'object',
        required: ['email', 'fullName', 'message'],
        properties: {
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          message: { type: 'string' }
        }
      },
      VerifyEmailSuccessResponseDTO: successResponse('VerifiedEmailDTO'),
      ErrorResponseDTO: errorResponse
    }
  }
};
