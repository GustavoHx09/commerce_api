import { describe, it, expect, vi } from 'vitest';
import { getPermissions, hasPermission } from '../permissionHelpers.js';

vi.mock('../../../modules/permissionPreset/permissionPresetModel.js', () => ({
    default: {
        findOne: vi.fn(),
    },
}));

describe('permissionHelpers', () => {
    describe('getPermissions', () => {
        it('returns role defaults when no preset and no permissions', () => {
            const user = { role: 'user', permissions: [], revokedPermissions: [], preset: null };
            const perms = getPermissions(user);

            expect(perms).toContain('products:read');
            expect(perms).toContain('orders:write');
            expect(perms).not.toContain('users:delete');
        });

        it('uses preset as base', () => {
            const user = {
                role: 'user',
                permissionPresetId: 'p1',
                permissions: [],
                revokedPermissions: [],
                preset: { permissions: ['products:read', 'stock:read'] },
            };

            const perms = getPermissions(user);

            expect(perms).toContain('products:read');
            expect(perms).toContain('stock:read');
            expect(perms).not.toContain('orders:write');
        });

        it('adds extra permissions from user.permissions when preset exists', () => {
            const user = {
                role: 'user',
                permissionPresetId: 'p1',
                permissions: ['reports:read'],
                revokedPermissions: [],
                preset: { permissions: ['products:read'] },
            };

            const perms = getPermissions(user);

            expect(perms).toContain('products:read');
            expect(perms).toContain('reports:read');
        });

        it('applies revokedPermissions even with preset', () => {
            const user = {
                role: 'user',
                permissionPresetId: 'p1',
                permissions: [],
                revokedPermissions: ['products:write'],
                preset: { permissions: ['products:read', 'products:write'] },
            };

            const perms = getPermissions(user);

            expect(perms).toContain('products:read');
            expect(perms).not.toContain('products:write');
        });

        it('falls back to user.permissions as full list when no preset (legacy)', () => {
            const user = {
                role: 'user',
                permissionPresetId: null,
                permissions: ['users:read', 'users:write'],
                revokedPermissions: [],
                preset: null,
            };

            const perms = getPermissions(user);

            expect(perms).toContain('users:read');
            expect(perms).toContain('users:write');
            expect(perms).not.toContain('products:read');
        });

        it('applies revokedPermissions to role defaults when no preset', () => {
            const user = {
                role: 'admin',
                permissionPresetId: null,
                permissions: [],
                revokedPermissions: ['products:delete'],
                preset: null,
            };

            const perms = getPermissions(user);

            expect(perms).toContain('products:read');
            expect(perms).not.toContain('products:delete');
        });

        it('gives master wildcard access', () => {
            const user = { role: 'master', permissions: [], revokedPermissions: [], preset: null };

            expect(getPermissions(user)).toContain('*');
        });
    });

    describe('hasPermission', () => {
        it('allows master any action', () => {
            const user = { role: 'master', permissions: [], revokedPermissions: [], preset: null };

            expect(hasPermission(user, 'anything', 'write')).toBe(true);
        });

        it('matches exact permission', () => {
            const user = { role: 'user', permissionPresetId: 'p1', permissions: [], revokedPermissions: [], preset: { permissions: ['products:read'] } };

            expect(hasPermission(user, 'products', 'read')).toBe(true);
            expect(hasPermission(user, 'products', 'write')).toBe(false);
        });

        it('supports resource wildcard', () => {
            const user = { role: 'user', permissionPresetId: 'p1', permissions: [], revokedPermissions: [], preset: { permissions: ['products:*'] } };

            expect(hasPermission(user, 'products', 'read')).toBe(true);
            expect(hasPermission(user, 'products', 'delete')).toBe(true);
            expect(hasPermission(user, 'orders', 'read')).toBe(false);
        });

        it('respects revoked permission even with wildcard', () => {
            const user = {
                role: 'user',
                permissionPresetId: 'p1',
                permissions: [],
                revokedPermissions: ['products:delete'],
                preset: { permissions: ['products:*'] },
            };

            expect(hasPermission(user, 'products', 'read')).toBe(true);
            expect(hasPermission(user, 'products', 'delete')).toBe(false);
        });
    });
});
