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
    description: 'API documentation for authentication, profiles, pools, and room Socket.IO events.'
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
  tags: [
    { name: 'Auth', description: 'Account authentication and verification' },
    { name: 'Profile', description: 'Authenticated user profile retrieval and updates' },
    { name: 'Pools', description: 'Pool discovery, creation, and registration' }
  ],
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
    },
    '/api/profile': {
      get: {
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        summary: 'Get the authenticated user profile',
        responses: {
          200: jsonResponse('Profile retrieved successfully.', 'ProfileResponseDTO'),
          400: jsonResponse('The authenticated user profile was not found.', 'ErrorResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to retrieve the profile.', 'ErrorResponseDTO')
        }
      },
      patch: {
        tags: ['Profile'],
        security: [{ bearerAuth: [] }],
        summary: 'Update the authenticated user profile',
        description: 'Send one or more profile fields. Account and security fields such as email, role, verification state, and password are not accepted.',
        requestBody: jsonRequest('UpdateProfileDTO'),
        responses: {
          200: jsonResponse('Profile updated successfully.', 'UpdateProfileResponseDTO'),
          400: jsonResponse('The update is invalid or the profile was not found.', 'ErrorResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to update the profile.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/available': {
      get: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'List pools available to the authenticated user',
        description: 'Each result includes a pool, the first open room (if any), the active room-member count, and whether this user has a registration/verification record.',
        responses: {
          200: jsonResponse('Available pools and current room details.', 'AvailablePoolsResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to load available pools.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools': {
      post: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'Create a pool',
        description: 'Pool pricing uses a boolean isPaid field and a numeric price. A free pool may omit price or set it to zero. A paid pool requires price greater than zero.',
        requestBody: jsonRequest('CreatePoolDTO'),
        responses: {
          201: jsonResponse('Pool created.', 'PoolResponseDTO'),
          400: jsonResponse('Pool details are invalid.', 'ErrorResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to create pool.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/{poolId}/register': {
      post: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'Register the authenticated user for a pool',
        description: 'Free pools are registered immediately. Paid pools return a payment reference for checkout. The selfie URL is optional at registration.',
        parameters: [{
          name: 'poolId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterPoolDTO' }
            }
          }
        },
        responses: {
          200: jsonResponse('Registration created or returned.', 'RegisterPoolResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          400: jsonResponse('The pool does not exist or has ended.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to register for the pool.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/registered': {
      get: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'List pools registered by the authenticated user',
        description: 'Returns registered pools whose current status is upcoming or active. Includes payment status, registration time, selfie state, waiting-room eligibility, pool details, and current room when present.',
        responses: {
          200: jsonResponse('Registered pools.', 'RegisteredPoolsResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to load registered pools.', 'ErrorResponseDTO')
        }
      }
    }
  },
  'x-socketio': {
    description: 'Socket.IO server is served on the same origin as the HTTP API. The current Socket.IO middleware expects a JWT in auth.token or an Authorization: Bearer header and verifies it using JWT_SECRET.',
    events: {
      'room:join': {
        direction: 'client-to-server',
        payload: {
          type: 'object',
          required: ['poolId'],
          properties: {
            poolId: { type: 'string', description: 'Pool to join.' },
            selfieUrl: { type: 'string', format: 'uri', description: 'Required the first time a user verifies for a pool.' }
          }
        },
        emits: ['room:error', 'room:waiting_update', 'room:started']
      },
      'room:leave': {
        direction: 'client-to-server',
        payload: { type: 'object', additionalProperties: false },
        description: 'Leave the current waiting room. The same cleanup also runs on socket disconnect.',
        emits: ['room:waiting_update']
      },
      'room:waiting_update': {
        direction: 'server-to-client',
        payload: {
          type: 'object',
          required: ['roomId', 'roomNumber', 'status', 'maleCount', 'femaleCount', 'totalUsers'],
          properties: {
            roomId: { type: 'string' },
            roomNumber: { type: 'integer' },
            status: { type: 'string', enum: ['open', 'started'] },
            maleCount: { type: 'integer', minimum: 0, maximum: 5 },
            femaleCount: { type: 'integer', minimum: 0, maximum: 5 },
            totalUsers: { type: 'integer', minimum: 0, maximum: 10 }
          }
        }
      },
      'room:started': {
        direction: 'server-to-client',
        payload: {
          type: 'object',
          required: ['roomId', 'roomNumber'],
          properties: {
            roomId: { type: 'string' },
            roomNumber: { type: 'integer' },
            message: { type: 'string' }
          }
        },
        description: 'Emitted when the room reaches five male and five female participants, or when an existing started room is rejoined.'
      },
      'room:error': {
        direction: 'server-to-client',
        payload: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string' } }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
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
        required: ['fullName', 'email', 'password', 'confirmPassword', 'gender'],
        properties: {
          fullName: { type: 'string', minLength: 3, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 },
          confirmPassword: { type: 'string', minLength: 8, maxLength: 128 },
          gender: { type: 'string', enum: ['male', 'female'] }
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
        required: ['email', 'otp', 'type'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
          type: { type: 'string', example: 'REGISTRATION' }
        }
      },
      VerifiedEmailDTO: {
        type: 'object',
        required: ['id', 'fullName', 'email', 'accessToken', 'refreshToken'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', enum: ['Bearer'] },
          expiresIn: { type: 'integer', description: 'Access-token lifetime in seconds.' }
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
      ErrorResponseDTO: errorResponse,
      UpdateProfileDTO: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        description: 'All fields are optional, but at least one must be provided. Interests are validated against the server-configured allowed values.',
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 100 },
          age: { type: 'integer', minimum: 18, maximum: 100 },
          gender: { type: 'string', enum: ['male', 'female'] },
          location: { type: 'string', minLength: 2, maxLength: 100 },
          aboutYou: { type: 'string', minLength: 10, maxLength: 500 },
          interests: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string' }
          },
          relationshipGoal: {
            type: 'string',
            enum: [
              'A long-term relationship',
              'Something casual',
              "Let's see where it goes",
              'Meeting new people'
            ]
          },
          interestedIn: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', enum: ['Men', 'Women'] }
          },
          preferredAgeRange: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', enum: ['18-25', '26-35', '36-45', '56-65', '66-75'] }
          },
          languages: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', enum: ['English', 'German', 'French', 'Spanish', 'others'] }
          },
          drinking: {
            type: 'string',
            enum: ['Never', 'Sometimes', 'Often', 'Prefer not to say']
          },
          smoking: {
            type: 'string',
            enum: ['Never', 'Sometimes', 'Often', 'Prefer not to say']
          },
          pets: {
            type: 'string',
            enum: ['Have pets', 'Love pets', 'No pets', 'Prefer not to say']
          },
          photos: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: { type: 'string', format: 'uri' }
          }
        }
      },
      UserProfileDTO: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          gender: { type: 'string', enum: ['male', 'female'], nullable: true },
          age: { type: 'integer', minimum: 18, maximum: 100, nullable: true },
          location: { type: 'string', nullable: true },
          aboutYou: { type: 'string', nullable: true },
          interests: { type: 'array', items: { type: 'string' } },
          relationshipGoal: { type: 'string', nullable: true },
          interestedIn: { type: 'array', items: { type: 'string', enum: ['Men', 'Women'] } },
          preferredAgeRange: { type: 'array', items: { type: 'string' } },
          languages: { type: 'array', items: { type: 'string' } },
          drinking: { type: 'string', nullable: true },
          smoking: { type: 'string', nullable: true },
          pets: { type: 'string', nullable: true },
          photos: { type: 'array', items: { type: 'string', format: 'uri' } },
          isVerified: { type: 'boolean' },
          isProfileComplete: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      ProfileResponseDTO: successResponse('UserProfileDTO'),
      UpdateProfileResponseDTO: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Profile updated successfully' },
          data: { $ref: '#/components/schemas/UserProfileDTO' }
        }
      },
      CreatePoolDTO: {
        type: 'object',
        required: ['title', 'description', 'imageUrl', 'startsAt', 'isPaid'],
        description: 'A paid pool requires price greater than zero. A free pool may omit price or set it to zero.',
        properties: {
          title: { type: 'string', maxLength: 120 },
          description: { type: 'string', maxLength: 5000 },
          imageUrl: { type: 'string', format: 'uri' },
          startsAt: { type: 'string', format: 'date-time' },
          isPaid: { type: 'boolean' },
          price: { type: 'number', minimum: 0, description: 'Required and greater than zero when isPaid is true.' }
        }
      },
      PoolDTO: {
        type: 'object',
        description: 'Pool model returned by pool endpoints. Available-pool results populate ownerId with name/avatarUrl; the registered-pool response uses its own pool summary.',
        required: ['_id', 'title', 'description', 'imageUrl', 'startsAt', 'isPaid', 'price', 'status', 'ownerId'],
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: 'string', format: 'uri' },
          startsAt: { type: 'string', format: 'date-time' },
          isPaid: { type: 'boolean' },
          price: { type: 'number', minimum: 0 },
          currency: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['upcoming', 'active', 'completed'] },
          ownerId: {
            oneOf: [
              { type: 'string', description: 'Unpopulated owner ObjectId.' },
              { $ref: '#/components/schemas/PoolOwnerDTO' }
            ]
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      PoolOwnerDTO: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          fullName: { type: 'string' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', format: 'uri' }
        }
      },
      PoolResponseDTO: successResponse('PoolDTO'),
      AvailablePoolItemDTO: {
        type: 'object',
        required: ['pool', 'openRoom', 'totalUsersInPool', 'hasVerifiedSelfie'],
        properties: {
          pool: { $ref: '#/components/schemas/PoolDTO' },
          openRoom: {
            allOf: [{ $ref: '#/components/schemas/RoomDTO' }],
            nullable: true,
            description: 'The first open room for the pool, or null if no open room is found.'
          },
          totalUsersInPool: { type: 'integer', minimum: 0 },
          hasVerifiedSelfie: { type: 'boolean' }
        }
      },
      AvailablePoolsResponseDTO: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/AvailablePoolItemDTO' } }
        }
      },
      RegisterPoolDTO: {
        type: 'object',
        additionalProperties: false,
        properties: {
          selfieUrl: {
            type: 'string',
            format: 'uri',
            description: 'Optional selfie URL. A selfie may also be submitted later.'
          }
        }
      },
      PoolVerificationDTO: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          poolId: { type: 'string' },
          userId: { type: 'string' },
          selfieUrl: { type: 'string', format: 'uri', nullable: true },
          paymentStatus: { type: 'string', enum: ['free', 'pending', 'paid'] },
          paymentReference: { type: 'string', nullable: true },
          amountPaid: { type: 'number', minimum: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      RegisterPoolResultDTO: {
        type: 'object',
        required: ['requiresPayment', 'verification'],
        properties: {
          requiresPayment: { type: 'boolean' },
          paymentReference: { type: 'string', description: 'Present for paid pool registrations.' },
          amount: { type: 'number', description: 'Pool price, present for paid pool registrations.' },
          currency: { type: 'string', description: 'Pool currency, defaults to NGN when not configured.' },
          verification: { $ref: '#/components/schemas/PoolVerificationDTO' }
        }
      },
      RegisterPoolResponseDTO: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Successfully registered for pool' },
          data: { $ref: '#/components/schemas/RegisterPoolResultDTO' }
        }
      },
      RegisteredPoolItemDTO: {
        type: 'object',
        required: [
          'verificationId',
          'paymentStatus',
          'registeredAt',
          'hasVerifiedSelfie',
          'canEnterWaitingRoom',
          'pool',
          'currentRoom'
        ],
        properties: {
          verificationId: { type: 'string' },
          paymentStatus: { type: 'string', enum: ['free', 'paid'] },
          registeredAt: { type: 'string', format: 'date-time' },
          hasVerifiedSelfie: { type: 'boolean' },
          canEnterWaitingRoom: { type: 'boolean' },
          pool: {
            type: 'object',
            required: [
              'id', 'title', 'description', 'imageUrl', 'startsAt', 'status',
              'isPaid', 'price', 'currency', 'totalRegisteredUsers', 'owner'
            ],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              imageUrl: { type: 'string', format: 'uri' },
              startsAt: { type: 'string', format: 'date-time' },
              status: { type: 'string', enum: ['upcoming', 'active'] },
              isPaid: { type: 'boolean' },
              price: { type: 'number', minimum: 0 },
              currency: { type: 'string' },
              totalRegisteredUsers: { type: 'integer', minimum: 0 },
              owner: { $ref: '#/components/schemas/PoolOwnerDTO' }
            }
          },
          currentRoom: {
            allOf: [{ $ref: '#/components/schemas/RegisteredCurrentRoomDTO' }],
            nullable: true
          }
        }
      },
      RegisteredCurrentRoomDTO: {
        type: 'object',
        required: ['roomId', 'roomNumber', 'status', 'maleCount', 'femaleCount'],
        properties: {
          roomId: { type: 'string' },
          roomNumber: { type: 'integer' },
          status: { type: 'string', enum: ['open', 'started'] },
          maleCount: { type: 'integer', minimum: 0, maximum: 5 },
          femaleCount: { type: 'integer', minimum: 0, maximum: 5 }
        }
      },
      RegisteredPoolsResponseDTO: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/RegisteredPoolItemDTO' } }
        }
      },
      RoomDTO: {
        type: 'object',
        description: 'Room model. Memberships are stored separately and room counts are capped at five per gender.',
        required: ['_id', 'poolId', 'roomNumber', 'maleCount', 'femaleCount', 'status'],
        properties: {
          _id: { type: 'string' },
          poolId: { type: 'string' },
          roomNumber: { type: 'integer' },
          maleCount: { type: 'integer', minimum: 0, maximum: 5 },
          femaleCount: { type: 'integer', minimum: 0, maximum: 5 },
          status: { type: 'string', enum: ['open', 'started'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};
