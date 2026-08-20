import { describe, it, expect } from 'vitest';
import { isValidPhone, isValidCPF, emailIsValid, cepIsValid } from '../userValidations.js';

describe('userValidations', () => {
    describe('isValidPhone', () => {
        it('returns true for valid mobile phone', () => {
            expect(isValidPhone('11999999999')).toBe(true);
        });

        it('returns true for formatted mobile phone', () => {
            expect(isValidPhone('(11) 99999-9999')).toBe(true);
        });

        it('returns true for valid landline', () => {
            expect(isValidPhone('1133334444')).toBe(true);
        });

        it('returns false for invalid phone', () => {
            expect(isValidPhone('123')).toBe(false);
        });
    });

    describe('isValidCPF', () => {
        it('returns true for valid formatted CPF', () => {
            expect(isValidCPF('529.982.247-25')).toBe(true);
        });

        it('returns true for valid unformatted CPF', () => {
            expect(isValidCPF('52998224725')).toBe(true);
        });

        it('returns false for repeated digits', () => {
            expect(isValidCPF('11111111111')).toBe(false);
        });

        it('returns false for invalid CPF', () => {
            expect(isValidCPF('12345678901')).toBe(false);
        });
    });

    describe('emailIsValid', () => {
        it('returns true for valid email', () => {
            expect(emailIsValid('user@example.com')).toBe(true);
        });

        it('returns false for invalid email', () => {
            expect(emailIsValid('invalid-email')).toBe(false);
        });
    });

    describe('cepIsValid', () => {
        it('returns true for formatted CEP', () => {
            expect(cepIsValid('01000-000')).toBe(true);
        });

        it('returns true for unformatted CEP', () => {
            expect(cepIsValid('01000000')).toBe(true);
        });

        it('returns false for invalid CEP', () => {
            expect(cepIsValid('123')).toBe(false);
        });
    });
});
