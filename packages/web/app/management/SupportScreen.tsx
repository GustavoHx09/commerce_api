'use client';

import { useState } from 'react';
import { DataTable, Notice, PageHeading } from './ui';
import type { Row } from './config';

// Tela de suporte da plataforma: shell da central de chamados que os
// clientes abrirão — a API de tickets ainda não existe, então a listagem
// nasce vazia com aviso de implementação futura.
export default function SupportScreen() {
  const [tickets] = useState<Row[]>([]);
  const [status, setStatus] = useState('open');

  return (
    <main className="mx-auto max-w-screen-2xl space-y-5 p-4 sm:p-8">
      <PageHeading
        title="Suporte"
        description="Chamados abertos pelos clientes da plataforma — atendimento, prioridades e acompanhamento."
      />
      <Notice message="A API de chamados será implementada em breve — esta é a estrutura da central de suporte." />
      <section className="admin-panel flex flex-wrap items-end gap-3">
        <label className="admin-label">
          Situação
          <select
            className="admin-input mt-1"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="open">Abertos</option>
            <option value="in_progress">Em atendimento</option>
            <option value="resolved">Resolvidos</option>
            <option value="">Todos</option>
          </select>
        </label>
        <label className="admin-label flex-1">
          Empresa
          <input
            className="admin-input mt-1"
            placeholder="Filtrar por empresa"
            disabled
          />
        </label>
      </section>
      <section className="admin-panel">
        <DataTable
          rows={tickets}
          columns={[
            ['subject', 'Assunto'],
            ['company', 'Empresa'],
            ['priority', 'Prioridade'],
            ['status', 'Situação'],
            ['openedBy', 'Aberto por'],
            ['createdAt@date', 'Aberto em'],
          ]}
        />
      </section>
    </main>
  );
}
