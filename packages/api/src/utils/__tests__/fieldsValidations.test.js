import { describe, it, expect } from 'vitest';
import { isEmpty, isValid, numberFormatReplace, generateSlug } from '../fieldsValidations.js';

describe('fieldsValidations', () => {
    describe('isEmpty', () => {
        it('returns true for undefined', () => {
            expect(isEmpty(undefined)).toBe(true);
        });

        it('returns true for null', () => {
            expect(isEmpty(null)).toBe(true);
        });

        it('returns true for empty string', () => {
            expect(isEmpty('')).toBe(true);
        });

        it('returns true for whitespace string', () => {
            expect(isEmpty('   ')).toBe(true);
        });

        it('returns false for non-empty string', () => {
            expect(isEmpty('value')).toBe(false);
        });

        it('returns false for number zero', () => {
            expect(isEmpty(0)).toBe(false);
        });
    });

    describe('isValid', () => {
        it('returns true for undefined', () => {
            expect(isValid(undefined, 'old')).toBe(true);
        });

        it('returns true for empty string', () => {
            expect(isValid('', 'old')).toBe(true);
        });

        it('returns true when value equals current value', () => {
            expect(isValid('same', 'same')).toBe(true);
        });

        it('returns false for new valid value', () => {
            expect(isValid('new', 'old')).toBe(false);
        });
    });

    describe('numberFormatReplace', () => {
        it('removes non-numeric characters', () => {
            expect(numberFormatReplace('123.456-789')).toBe('123456789');
        });

        it('keeps only numbers from formatted phone', () => {
            expect(numberFormatReplace('(11) 99999-9999')).toBe('11999999999');
        });
    });

    describe('generateSlug', () => {
        it('converts name to slug', () => {
            expect(generateSlug('Loja do Zé')).toBe('loja-do-ze');
        });

        it('removes special characters', () => {
            expect(generateSlug('Loja @#$% Teste')).toBe('loja-teste');
        });

        it('trims and lowercases', () => {
            expect(generateSlug('  LOJA Grande  ')).toBe('loja-grande');
        });
    });
});
