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
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the refresh token and issue a new access token',
        requestBody: jsonRequest('RefreshTokenDTO'),
        responses: {
          200: jsonResponse('Tokens refreshed successfully.', 'RefreshSuccessResponseDTO'),
          400: jsonResponse('The request body is invalid.', 'ErrorResponseDTO'),
          401: jsonResponse('The refresh token is invalid, expired, or already used.', 'ErrorResponseDTO'),
          500: jsonResponse('An unexpected token refresh error occurred.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/auth/signout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the supplied refresh token',
        requestBody: jsonRequest('RefreshTokenDTO'),
        responses: {
          200: jsonResponse('Signed out successfully.', 'SignOutSuccessResponseDTO'),
          400: jsonResponse('The request body is invalid.', 'ErrorResponseDTO'),
          500: jsonResponse('An unexpected sign-out error occurred.', 'ErrorResponseDTO')
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
      AuthTokensDTO: {
        type: 'object',
        required: ['accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', enum: ['Bearer'] },
          expiresIn: { type: 'integer', description: 'Access-token lifetime in seconds.', example: 900 }
        }
      },
      SignInDTO: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', minLength: 1, maxLength: 128 }
        }
      },
      SignInResponseDTO: {
        type: 'object',
        required: ['id', 'fullName', 'email', 'accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
        properties: {
          id: { type: 'string', example: '66510a1ef6a1a2e392e11481' },
          fullName: { type: 'string', example: 'Taylor Example' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', enum: ['Bearer'] },
          expiresIn: { type: 'integer', description: 'Access-token lifetime in seconds.', example: 900 }
        }
      },
      SignInSuccessResponseDTO: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Signin successful' },
          data: { $ref: '#/components/schemas/SignInResponseDTO' }
        }
      },
      RefreshTokenDTO: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      RefreshSuccessResponseDTO: successResponse('AuthTokensDTO'),
      SignOutSuccessResponseDTO: {
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Signed out successfully.' }
        }
      },
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
      SignupSuccessResponseDTO: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OTP has been sent to your email address.' },
          data: {
            type: 'object',
            required: ['email'],
            properties: { email: { type: 'string', format: 'email' } }
          }
        }
      },
      VerifyEmailDTO: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' }
        }
      },
      VerifiedEmailDTO: {
        type: 'object',
        required: ['email', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' }
        }
      },
      VerifyEmailSuccessResponseDTO: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Email has been verified successfully.' },
          data: { $ref: '#/components/schemas/VerifiedEmailDTO' }
        }
      },
      ErrorResponseDTO: errorResponse
    }
  }
};
