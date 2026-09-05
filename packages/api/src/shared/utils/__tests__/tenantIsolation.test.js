import { describe, it, expect } from 'vitest';
import { baseQuery } from '../repositoryHelpers.js';
import { hasPermission, canAccessTenant } from '../permissionHelpers.js';

// Converte objectId de exemplo para string.
const tenantA = '64aaaaaaaaaaaaaaaaaaaaaa';
const tenantB = '64bbbbbbbbbbbbbbbbbbbbbb';

const adminA = { _id: 'u1', role: 'admin', tenantId: { toString: () => tenantA } };
const userB = { _id: 'u2', role: 'user', tenantId: { toString: () => tenantB } };
const master = { _id: 'u3', role: 'master', tenantId: null };

describe('tenant isolation', () => {
    describe('baseQuery', () => {
        it('includes tenantId in the filter when provided', () => {
            const query = baseQuery(tenantA, false);
            expect(query.tenantId).toBe(tenantA);
            expect(query.deletedAt).toBeNull();
        });

        it('does not include tenantId for master context', () => {
            const query = baseQuery(null, false);
            expect(query.tenantId).toBeUndefined();
            expect(query.deletedAt).toBeNull();
        });

        it('can include deleted records for admins/masters', () => {
            const query = baseQuery(tenantA, true);
            expect(query.tenantId).toBe(tenantA);
            expect(query.deletedAt).toBeUndefined();
        });
    });

    describe('canAccessTenant', () => {
        it('allows master to access any tenant', () => {
            expect(canAccessTenant(master, tenantA)).toBe(true);
            expect(canAccessTenant(master, tenantB)).toBe(true);
            expect(canAccessTenant(master, null)).toBe(true);
        });

        it('allows user to access only their own tenant', () => {
            expect(canAccessTenant(adminA, tenantA)).toBe(true);
            expect(canAccessTenant(adminA, tenantB)).toBe(false);
        });

        it('blocks a user from accessing another tenant', () => {
            expect(canAccessTenant(userB, tenantA)).toBe(false);
            expect(canAccessTenant(userB, tenantB)).toBe(true);
        });
    });

    describe('hasPermission', () => {
        it('allows master to perform any action', () => {
            expect(hasPermission(master, 'products', 'delete')).toBe(true);
            expect(hasPermission(master, 'users', 'write')).toBe(true);
        });

        it('allows admin to manage products and users of their tenant', () => {
            expect(hasPermission(adminA, 'products', 'read')).toBe(true);
            expect(hasPermission(adminA, 'products', 'write')).toBe(true);
            expect(hasPermission(adminA, 'users', 'write')).toBe(true);
        });

        it('blocks user from deleting users or products', () => {
            expect(hasPermission(userB, 'products', 'delete')).toBe(false);
            expect(hasPermission(userB, 'users', 'write')).toBe(false);
        });

        it('allows user to read own tenant', () => {
            expect(hasPermission(userB, 'tenant', 'read')).toBe(true);
            expect(hasPermission(userB, 'tenant', 'write')).toBe(false);
        });
    });
});
