import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente de teste, se existirem.
dotenv.config({ path: '.env.test' });

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        globalSetup: './vitest.global-setup.js',
        setupFiles: ['./vitest.setup.js'],
        include: ['src/__tests__/integration/**/*.test.js'],
        // Executa arquivos de teste em sequência para evitar conflitos no mesmo banco em memória.
        fileParallelism: false,
        testTimeout: 30000,
        hookTimeout: 30000,
    },
});
