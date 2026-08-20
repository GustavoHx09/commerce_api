import swaggerJSDoc from 'swagger-jsdoc';

// Configuração da documentação OpenAPI/Swagger da API.
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Commerce API',
            version: '1.0.0',
            description: 'API multitenant com controle de acesso por roles, soft delete e autenticação via JWT',
        },
        servers: [
            {
                url: 'http://localhost:3001/api/v1',
                description: 'Servidor local',
            },
        ],
        components: {
            // Esquema de segurança Bearer JWT usado nas rotas protegidas.
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            // Schemas reutilizáveis para documentação de requests e responses.
            schemas: {
                // Representação de um usuário retornado pela API.
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        cpf: { type: 'string' },
                        phone: { type: 'string' },
                        role: { type: 'string', enum: ['master', 'admin', 'user'] },
                        tenantId: { type: 'string', nullable: true },
                        isActive: { type: 'boolean' },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string' },
                                number: { type: 'string' },
                                complement: { type: 'string' },
                                neighborhood: { type: 'string' },
                                city: { type: 'string' },
                                state: { type: 'string' },
                                zipCode: { type: 'string' },
                            },
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Payload esperado para criação de um usuário.
                CreateUserInput: {
                    type: 'object',
                    required: ['name', 'email', 'cpf', 'phone', 'password'],
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        cpf: { type: 'string' },
                        phone: { type: 'string' },
                        password: { type: 'string', minLength: 6 },
                        role: { type: 'string', enum: ['master', 'admin', 'user'] },
                        tenantId: { type: 'string' },
                        isActive: { type: 'boolean' },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string' },
                                number: { type: 'string' },
                                complement: { type: 'string' },
                                neighborhood: { type: 'string' },
                                city: { type: 'string' },
                                state: { type: 'string' },
                                zipCode: { type: 'string' },
                            },
                        },
                    },
                },
                // Payload esperado para atualização de um usuário.
                // Inclui password para permitir alteração de senha pela documentação.
                UpdateUserInput: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        cpf: { type: 'string' },
                        phone: { type: 'string' },
                        password: { type: 'string', minLength: 6 },
                        role: { type: 'string', enum: ['master', 'admin', 'user'] },
                        tenantId: { type: 'string' },
                        isActive: { type: 'boolean' },
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string' },
                                number: { type: 'string' },
                                complement: { type: 'string' },
                                neighborhood: { type: 'string' },
                                city: { type: 'string' },
                                state: { type: 'string' },
                                zipCode: { type: 'string' },
                            },
                        },
                    },
                },
                // Representação de um produto retornado pela API.
                Product: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        costPrice: { type: 'number' },
                        quantityInStock: { type: 'number' },
                        category: { type: 'string' },
                        tenantId: { type: 'string' },
                        deletedAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Representação de um tenant retornado pela API.
                Tenant: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Metadados de paginação retornados nas listas.
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                    },
                },
                // Formato padrão de resposta de erro.
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
            },
        },
        // Aplica a segurança Bearer por padrão em todas as rotas documentadas.
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Arquivos onde o swagger-jsdoc deve procurar por anotações JSDoc.
    apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
