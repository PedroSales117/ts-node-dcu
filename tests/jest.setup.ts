import 'reflect-metadata';

// Configuração do ambiente para testes
process.env.NODE_ENV = 'test';
process.env.AUTH_APP_URL = 'http://auth-api'

// Mock das variáveis de ambiente do banco de dados
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USERNAME = 'test';
process.env.DATABASE_PASSWORD = 'test';
process.env.DATABASE_NAME = 'test_db';
process.env.JWT_SECRET = 'test_secret';

jest.mock('../src/ormconfig', () => ({
    AppDataSource: {
        initialize: jest.fn().mockResolvedValue(undefined),
        getRepository: jest.fn()
    }
}));