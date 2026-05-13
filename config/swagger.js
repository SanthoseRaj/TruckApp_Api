const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Truck Tracking Backend API',
      version: '1.0.0',
      description:
        'API documentation for Truck Tracking and Destination Management App. Login first, copy the token, click Authorize, and paste it as: Bearer <token>.',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your JWT token here. You may paste only the token; Swagger will send it as Bearer <token>.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Owner' },
            username: { type: 'string', example: 'owner' },
            mobileNumber: { type: 'string', example: '+971500000000' },
            role: {
              type: 'string',
              enum: ['owner', 'admin', 'yard', 'gate', 'port', 'clearence', 'dubai'],
            },
            entryTeam: {
              $ref: '#/components/schemas/EntryTeam',
            },
          },
        },
        EntryTeam: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: ['yard', 'gate', 'port', 'clearence', 'dubai'], example: 'yard' },
            name: { type: 'string', example: 'Yard Entry Team' },
            stop: {
              type: 'string',
              enum: ['Yard', 'Gate', 'Port Loading', 'Custom Clearence', 'Dubai / Free Zone'],
              example: 'Yard',
            },
            role: { type: 'string', enum: ['yard', 'gate', 'port', 'clearence', 'dubai'], example: 'yard' },
            order: { type: 'number', example: 1 },
            lat: { type: 'number', example: 25.2048 },
            lng: { type: 'number', example: 55.2708 },
          },
        },
        CreateAdminInput: {
          type: 'object',
          required: ['name', 'mobileNumber', 'username', 'password'],
          properties: {
            name: { type: 'string', example: 'Site Admin' },
            mobileNumber: { type: 'string', example: '+971500000001' },
            username: { type: 'string', example: 'siteadmin' },
            password: { type: 'string', minLength: 6, example: '123456' },
          },
        },
        CreateMemberInput: {
          type: 'object',
          required: ['entryTeamId', 'name', 'mobileNumber', 'username', 'password'],
          properties: {
            entryTeamId: { type: 'string', enum: ['yard', 'gate', 'port', 'clearence', 'dubai'], example: 'yard' },
            entryTeamName: { type: 'string', example: 'Yard Entry Team' },
            entryTeamStop: {
              type: 'string',
              enum: ['Yard', 'Gate', 'Port Loading', 'Custom Clearence', 'Dubai / Free Zone'],
              example: 'Yard',
            },
            name: { type: 'string', example: 'Yard Member' },
            mobileNumber: { type: 'string', example: '+971500000002' },
            username: { type: 'string', example: 'yardmember1' },
            password: { type: 'string', minLength: 6, example: '123456' },
          },
        },
        Truck: {
          type: 'object',
          properties: {
            truckNumber: { type: 'string', example: 'TRK001' },
            supplierName: { type: 'string', example: 'ABC Logistics' },
            tripNumber: { type: 'string', example: 'TRIP-1001' },
            driverName: { type: 'string', example: 'Mohammed Ali' },
            driverMobile: { type: 'string', example: '+971500000000' },
            idCard: { type: 'string', example: 'ID123456' },
            truckModel: { type: 'string', enum: ['3 axis', '6 axis'] },
            tripCount: { type: 'number', example: 1 },
            currentStop: {
              type: 'string',
              enum: ['Yard', 'Gate', 'Port Loading', 'Custom Clearence', 'Dubai / Free Zone'],
            },
            status: {
              type: 'string',
              enum: ['waiting', 'entered', 'exited', 'in_transit', 'completed'],
            },
            isActive: { type: 'boolean' },
          },
        },
        TruckInput: {
          type: 'object',
          required: ['truckNumber', 'supplierName', 'tripNumber', 'driverName', 'driverMobile', 'idCard', 'truckModel'],
          properties: {
            truckNumber: { type: 'string', example: 'TRK001' },
            supplierName: { type: 'string', example: 'ABC Logistics' },
            tripNumber: { type: 'string', example: 'TRIP-1001' },
            driverName: { type: 'string', example: 'Mohammed Ali' },
            driverMobile: { type: 'string', example: '+971500000000' },
            idCard: { type: 'string', example: 'ID123456' },
            truckModel: { type: 'string', enum: ['3 axis', '6 axis'], example: '3 axis' },
          },
        },
        TruckUpdateInput: {
          type: 'object',
          properties: {
            supplierName: { type: 'string' },
            tripNumber: { type: 'string' },
            driverName: { type: 'string' },
            driverMobile: { type: 'string' },
            idCard: { type: 'string' },
            truckModel: { type: 'string', enum: ['3 axis', '6 axis'] },
            currentStop: {
              type: 'string',
              enum: ['Yard', 'Gate', 'Port Loading', 'Custom Clearence', 'Dubai / Free Zone'],
            },
            status: {
              type: 'string',
              enum: ['waiting', 'entered', 'exited', 'in_transit', 'completed'],
            },
          },
        },
        Trip: {
          type: 'object',
          properties: {
            truck: { type: 'string' },
            routeStops: {
              type: 'array',
              items: { type: 'string' },
            },
            currentStop: { type: 'string' },
            nextStop: { type: 'string' },
            status: {
              type: 'string',
              enum: ['waiting', 'entered', 'exited', 'in_transit', 'completed'],
            },
            entryTime: { type: 'string', format: 'date-time' },
            exitTime: { type: 'string', format: 'date-time' },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            remarks: { type: 'string' },
          },
        },
        RemarksInput: {
          type: 'object',
          properties: {
            remarks: { type: 'string', example: 'Checked and approved' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(swaggerOptions);
