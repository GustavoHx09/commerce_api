import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPasswordReset, resetPassword } from '../passwordResetService.js';

const mockFindOne = vi.fn();
const mockFindById = vi.fn();
const mockCreateTokenRepo = vi.fn();
const mockFindValidTokenRepo = vi.fn();
const mockInvalidateTokensRepo = vi.fn();
const mockMarkTokenUsedRepo = vi.fn();
const mockSendEmail = vi.fn();
const mockAuditAction = vi.fn();

vi.mock('../../user/userModel.js', () => ({
    default: {
        findOne: (...args) => mockFindOne(...args),
        findById: (...args) => mockFindById(...args),
    },
}));

vi.mock('../passwordResetRepo.js', () => ({
    createPasswordResetTokenRepo: (...args) => mockCreateTokenRepo(...args),
    findValidPasswordResetTokenRepo: (...args) => mockFindValidTokenRepo(...args),
    invalidateUserResetTokensRepo: (...args) => mockInvalidateTokensRepo(...args),
    markResetTokenUsedRepo: (...args) => mockMarkTokenUsedRepo(...args),
}));

vi.mock('../../../shared/utils/email/emailService.js', () => ({
    sendEmail: (...args) => mockSendEmail(...args),
}));

vi.mock('../../audit/auditHelpers.js', () => ({
    auditAction: (...args) => mockAuditAction(...args),
    toPlain: (doc) => (doc?.toObject ? doc.toObject() : doc),
}));

describe('passwordResetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requestPasswordReset', () => {
        it('exige o email', async () => {
            await expect(requestPasswordReset('')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('não revela quando o email não existe e não envia email', async () => {
            mockFindOne.mockResolvedValue(null);

            const result = await requestPasswordReset('naoexiste@teste.com');

            expect(result).toEqual({ emailSent: false });
            expect(mockCreateTokenRepo).not.toHaveBeenCalled();
            expect(mockSendEmail).not.toHaveBeenCalled();
        });

        it('gera token, invalida anteriores e envia email para usuário ativo', async () => {
            const user = { _id: 'u1', email: 'user@teste.com', tenantId: 't1', isActive: true };
            mockFindOne.mockResolvedValue(user);
            mockSendEmail.mockResolvedValue({ sent: true });

            const result = await requestPasswordReset('USER@teste.com');

            expect(mockInvalidateTokensRepo).toHaveBeenCalledWith('u1');
            expect(mockCreateTokenRepo).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'u1',
                    tenantId: 't1',
                    tokenHash: expect.any(String),
                    expiresAt: expect.any(Date),
                })
            );
            expect(mockSendEmail).toHaveBeenCalledWith(
                expect.objectContaining({ to: 'user@teste.com' })
            );
            expect(result).toEqual({ emailSent: true });
        });

        it('persiste apenas o hash do token, nunca o token em texto claro', async () => {
            const user = { _id: 'u1', email: 'user@teste.com', tenantId: null, isActive: true };
            mockFindOne.mockResolvedValue(user);
            mockSendEmail.mockResolvedValue({ sent: true });

            await requestPasswordReset('user@teste.com');

            const saved = mockCreateTokenRepo.mock.calls[0][0];
            const emailHtml = mockSendEmail.mock.calls[0][0].html;
            // O link do email carrega o token em texto claro; o banco guarda só o hash SHA-256.
            const tokenInUrl = /token=([a-f0-9]{64})/.exec(emailHtml)?.[1];
            expect(tokenInUrl).toBeTruthy();
            expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);
            expect(saved.tokenHash).not.toBe(tokenInUrl);
        });

        it('retorna emailSent=false quando o Resend não está configurado', async () => {
            const user = { _id: 'u1', email: 'user@teste.com', tenantId: null, isActive: true };
            mockFindOne.mockResolvedValue(user);
            mockSendEmail.mockResolvedValue({ sent: false, reason: 'resend_not_configured' });

            const result = await requestPasswordReset('user@teste.com');

            expect(result).toEqual({ emailSent: false });
        });
    });

    describe('resetPassword', () => {
        it('exige token e nova senha', async () => {
            await expect(resetPassword('', 'senha123')).rejects.toMatchObject({ statusCode: 400 });
            await expect(resetPassword('token', '')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejeita senha com menos de 6 caracteres', async () => {
            await expect(resetPassword('token', '123')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejeita token inválido, expirado ou já utilizado', async () => {
            mockFindValidTokenRepo.mockResolvedValue(null);

            await expect(resetPassword('token', 'senha123')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('rejeita quando o usuário do token está inativo ou removido', async () => {
            mockFindValidTokenRepo.mockResolvedValue({ _id: 'rt1', userId: 'u1' });
            mockFindById.mockResolvedValue({ _id: 'u1', isActive: false, deletedAt: null });

            await expect(resetPassword('token', 'senha123')).rejects.toMatchObject({ statusCode: 400 });
        });

        it('redefine a senha, marca passwordChangedAt, consome o token e audita', async () => {
            const save = vi.fn();
            const user = {
                _id: 'u1',
                email: 'user@teste.com',
                isActive: true,
                deletedAt: null,
                save,
                toObject() { return { _id: this._id, email: this.email }; },
            };
            mockFindValidTokenRepo.mockResolvedValue({ _id: 'rt1', userId: 'u1' });
            mockFindById.mockResolvedValue(user);

            await resetPassword('token', 'novaSenha123');

            expect(user.password).not.toBe('novaSenha123');
            expect(user.password).toMatch(/^\$2/); // hash bcrypt
            expect(user.passwordChangedAt).toBeInstanceOf(Date);
            expect(save).toHaveBeenCalled();
            expect(mockMarkTokenUsedRepo).toHaveBeenCalledWith('rt1');
            expect(mockAuditAction).toHaveBeenCalledWith('user', 'update', expect.anything(), user, 'u1');
        });
    });
});
