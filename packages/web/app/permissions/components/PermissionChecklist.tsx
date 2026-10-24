'use client';

import { ACTION_LABELS, groupPermissionsByResource } from '@/lib/permissions';

interface PermissionChecklistProps {
  // Catálogo completo de permissões válidas retornado pela API.
  catalog: string[];
  // Conjunto de permissões efetivas marcadas.
  checked: Set<string>;
  // Retorna o selo de origem da permissão, se houver ('extra' | 'revogada' | null).
  getOrigin?: (permission: string) => 'extra' | 'revogada' | null;
  // Alterna a permissão. `next` indica o estado desejado (marcada/desmarcada).
  onToggle: (permission: string, next: boolean) => void;
  disabled?: boolean;
}

// Grade de checkboxes de permissões agrupadas por recurso, usada tanto no
// formulário de presets quanto no editor de permissões por usuário.
export default function PermissionChecklist({
  catalog,
  checked,
  getOrigin,
  onToggle,
  disabled = false,
}: PermissionChecklistProps) {
  const groups = groupPermissionsByResource(catalog);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((group) => (
        <fieldset
          key={group.resource}
          className="rounded-lg border border-gray-200 p-4"
        >
          <legend className="px-1 text-sm font-semibold text-gray-800">
            {group.label}
          </legend>
          <div className="space-y-2">
            {group.permissions.map((permission) => {
              const action = permission.split(':')[1];
              const origin = getOrigin?.(permission) ?? null;
              const isChecked = checked.has(permission);

              return (
                <label
                  key={permission}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={(e) => onToggle(permission, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{ACTION_LABELS[action] || action}</span>
                  {origin === 'extra' && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                      extra
                    </span>
                  )}
                  {origin === 'revogada' && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      revogada
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
