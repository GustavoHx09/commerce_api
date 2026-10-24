import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveLogoFile } from '../upload/storageService.js';

const mockSend = vi.fn();
const mockWriteFileSync = vi.fn();
const mockBuildLocalLogoPath = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(function () { return { send: (...args) => mockSend(...args) }; }),
    PutObjectCommand: vi.fn(function (input) { return input; }),
}));

vi.mock('fs', () => ({
    default: { writeFileSync: (...args) => mockWriteFileSync(...args) },
}));

vi.mock('../upload/multerConfig.js', () => ({
    buildLocalLogoPath: (...args) => mockBuildLocalLogoPath(...args),
}));

describe('storageService.saveLogoFile', () => {
    const env = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...env };
        mockBuildLocalLogoPath.mockReturnValue({
            dir: './uploads/tenants/t1',
            filename: 'logo.png',
            relativePath: 'uploads/tenants/t1/logo.png',
        });
    });

    it('grava no disco local quando o S3 não está configurado', async () => {
        delete process.env.S3_BUCKET;
        delete process.env.S3_ACCESS_KEY_ID;
        delete process.env.S3_SECRET_ACCESS_KEY;

        const result = await saveLogoFile('t1', Buffer.from('img'), 'image/png');

        expect(mockWriteFileSync).toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
        expect(result).toEqual({ key: 'uploads/tenants/t1/logo.png', publicUrl: null });
    });

    it('envia para o bucket e retorna a URL pública quando o S3 está configurado', async () => {
        process.env.S3_BUCKET = 'meu-bucket';
        process.env.S3_ACCESS_KEY_ID = 'key';
        process.env.S3_SECRET_ACCESS_KEY = 'secret';
        process.env.S3_ENDPOINT = 'https://conta.r2.cloudflarestorage.com';
        process.env.S3_PUBLIC_URL = 'https://pub-abc.r2.dev';
        mockSend.mockResolvedValue({});

        const result = await saveLogoFile('t1', Buffer.from('img'), 'image/webp');

        expect(mockSend).toHaveBeenCalledWith(
            expect.objectContaining({
                Bucket: 'meu-bucket',
                Key: 'tenants/t1/logo.webp',
                ContentType: 'image/webp',
            })
        );
        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(result).toEqual({
            key: 'tenants/t1/logo.webp',
            publicUrl: 'https://pub-abc.r2.dev/tenants/t1/logo.webp',
        });
    });
});
