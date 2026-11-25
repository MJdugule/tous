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
    description: 'API documentation for authentication, pools, rooms, and room Socket.IO events.'
  },
  servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
  tags: [
    { name: 'Auth', description: 'Account authentication and verification' },
    { name: 'Pools', description: 'Pool, room, and payment operations' }
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
    '/api/pools/available': {
      get: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'List available pools excluding the user’s current pool',
        description: 'Returns each available pool together with its first open room, active room-member count, and whether the user has a saved selfie verification for that pool.',
        responses: {
          200: jsonResponse('Available pools and current room details.', 'AvailablePoolsResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to load available pools.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools': {
      get: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'List pools',
        description: 'Optionally filters by status. The current validator accepts upcoming or active.',
        parameters: [{
          name: 'status',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['upcoming', 'active'] }
        }],
        responses: {
          200: jsonResponse('Pool list.', 'PoolListResponseDTO'),
          400: jsonResponse('The status filter is invalid.', 'ErrorResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to load pools.', 'ErrorResponseDTO')
        }
      },
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
    '/api/pools/{poolId}/rooms': {
      get: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'View the authenticated user’s room and rooms with available places for their gender',
        parameters: [{
          name: 'poolId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        responses: {
          200: jsonResponse('Pool, current room, and available rooms.', 'PoolRoomsResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          404: jsonResponse('Pool not found.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to load pool rooms.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/mine/rooms': {
      get: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'List the authenticated user’s rooms',
        responses: {
          200: jsonResponse('Rooms the user has joined.', 'MyRoomsResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to load your rooms.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/{poolId}/join': {
      post: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        description: 'The current controller reads poolId from the JSON body (not the URL parameter). Assigns the user to a waiting room subject to available gender slots and profile/payment checks.',
        summary: 'Join the next available room',
        parameters: [{
          name: 'poolId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        requestBody: jsonRequest('JoinPoolDTO'),
        responses: {
          200: jsonResponse('Joined a room.', 'JoinRoomResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          402: jsonResponse('Paid pools require a confirmed payment.', 'ErrorResponseDTO'),
          404: jsonResponse('Pool not found.', 'ErrorResponseDTO'),
          409: jsonResponse('The user is already in a room or the current room has no place for this gender.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to join pool.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/{poolId}/payment-intents': {
      post: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'Create or retrieve a payment reference for a paid pool',
        parameters: [{
          name: 'poolId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        responses: {
          201: jsonResponse('Payment reference ready for provider checkout.', 'PaymentIntentResponseDTO'),
          400: jsonResponse('The pool is free and does not require payment.', 'ErrorResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          404: jsonResponse('Pool not found.', 'ErrorResponseDTO'),
          409: jsonResponse('The pool has started or the user already joined.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to create payment intent.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/me/gender': {
      patch: {
        tags: ['Pools'],
        security: [{ bearerAuth: [] }],
        summary: 'Set or update account gender before joining a room',
        requestBody: jsonRequest('UpdateGenderDTO'),
        responses: {
          200: jsonResponse('Gender updated.', 'GenderResponseDTO'),
          400: jsonResponse('Gender must be male or female.', 'ErrorResponseDTO'),
          401: jsonResponse('A valid access token is required.', 'ErrorResponseDTO'),
          404: jsonResponse('User not found.', 'ErrorResponseDTO'),
          409: jsonResponse('Gender cannot change after joining any room.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to update gender.', 'ErrorResponseDTO')
        }
      }
    },
    '/api/pools/payments/webhook': {
      post: {
        tags: ['Pools'],
        summary: 'Confirm or fail a payment from the payment provider',
        description: 'Send an HMAC-SHA256 hex signature of the exact raw JSON body in `x-payment-signature`. Configure the matching secret as PAYMENT_WEBHOOK_SECRET. The payment reference, amount, and currency are matched against the stored intent. Repeating the same successful transaction is idempotent.',
        security: [],
        parameters: [{
          name: 'x-payment-signature',
          in: 'header',
          required: true,
          schema: { type: 'string' }
        }],
        requestBody: jsonRequest('PaymentWebhookDTO'),
        responses: {
          200: jsonResponse('Webhook processed.', 'PaymentWebhookResponseDTO'),
          400: jsonResponse('The payload or payment amount/currency is invalid.', 'ErrorResponseDTO'),
          401: jsonResponse('Webhook signature is invalid.', 'ErrorResponseDTO'),
          404: jsonResponse('Payment reference not found.', 'ErrorResponseDTO'),
          409: jsonResponse('The payment reference or provider transaction has already been processed.', 'ErrorResponseDTO'),
          503: jsonResponse('Payment webhook is not configured.', 'ErrorResponseDTO'),
          500: jsonResponse('Unable to process payment webhook.', 'ErrorResponseDTO')
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
        description: 'Pool model returned by pool endpoints. Owner fields may be populated depending on the operation.',
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
      PoolListResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/PoolDTO' } }
        }
      },
      AvailablePoolItemDTO: {
        type: 'object',
        required: ['pool', 'openRoom', 'totalUsersInPool', 'hasVerifiedSelfie'],
        properties: {
          pool: { $ref: '#/components/schemas/PoolDTO' },
          openRoom: { allOf: [{ $ref: '#/components/schemas/RoomDTO' }], nullable: true },
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
      },
      RoomViewDTO: {
        type: 'object',
        description: 'Room data returned by pool room views.',
        required: ['id', 'poolId', 'roomNumber', 'status', 'totalUsers', 'availableSlots', 'members'],
        properties: {
          id: { type: 'string' },
          poolId: { type: 'string' },
          roomNumber: { type: 'integer' },
          status: { type: 'string', enum: ['open', 'started'] },
          totalUsers: { type: 'integer', minimum: 0, maximum: 10 },
          availableSlots: {
            type: 'object',
            properties: {
              male: { type: 'integer', minimum: 0, maximum: 5 },
              female: { type: 'integer', minimum: 0, maximum: 5 }
            }
          },
          members: { type: 'array', items: { $ref: '#/components/schemas/RoomMemberDTO' } }
        }
      },
      RoomMemberDTO: {
        type: 'object',
        required: ['user', 'joinedAt'],
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fullName: { type: 'string' },
              gender: { type: 'string', enum: ['male', 'female'] }
            }
          },
          joinedAt: { type: 'string', format: 'date-time' }
        }
      },
      PoolRoomsResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              pool: { $ref: '#/components/schemas/PoolDTO' },
              myRoom: { allOf: [{ $ref: '#/components/schemas/RoomViewDTO' }], nullable: true },
              availableRooms: { type: 'array', items: { $ref: '#/components/schemas/RoomViewDTO' } }
            }
          }
        }
      },
      MyRoomsResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/components/schemas/RoomViewDTO' },
                {
                  type: 'object',
                  properties: { pool: { $ref: '#/components/schemas/PoolDTO', nullable: true } }
                }
              ]
            }
          }
        }
      },
      JoinRoomResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              room: { $ref: '#/components/schemas/RoomViewDTO' },
              poolTotalUsers: { type: 'integer' }
            }
          }
        }
      },
      JoinPoolDTO: {
        type: 'object',
        required: ['poolId'],
        description: 'The current HTTP controller reads poolId from the JSON body, although the route also contains a poolId path parameter.',
        properties: {
          poolId: { type: 'string' },
          selfieUrl: { type: 'string', format: 'uri' }
        }
      },
      PaymentIntentResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              reference: { type: 'string' },
              amountMinorUnits: { type: 'integer' },
              currency: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'confirmed'] }
            }
          }
        }
      },
      UpdateGenderDTO: {
        type: 'object',
        required: ['gender'],
        properties: { gender: { type: 'string', enum: ['male', 'female'] } }
      },
      GenderResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', properties: { gender: { type: 'string', enum: ['male', 'female'] } } }
        }
      },
      PaymentWebhookDTO: {
        type: 'object',
        required: ['reference', 'transactionId', 'amountMinorUnits', 'currency', 'status'],
        properties: {
          reference: { type: 'string' },
          transactionId: { type: 'string' },
          amountMinorUnits: { type: 'integer' },
          currency: { type: 'string', minLength: 3, maxLength: 3 },
          status: { type: 'string', enum: ['succeeded', 'failed'] }
        }
      },
      PaymentWebhookResponseDTO: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              received: { type: 'boolean' },
              status: { type: 'string', enum: ['confirmed', 'failed'] }
            }
          }
        }
      }
    }
  }
};
