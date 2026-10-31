// Teste de carga da API com autocannon (ferramenta gratuita, Node puro).
// Faz login uma vez e dispara leituras autenticadas nos endpoints mais
// usados do sistema, medindo latência e vazão por cenário.
//
// Uso:  node scripts/load-test.js
// Envs: LOAD_BASE_URL, LOAD_EMAIL, LOAD_PASSWORD, LOAD_DURATION (s),
//       LOAD_CONNECTIONS — permitem apontar outro ambiente/perfil.
import autocannon from 'autocannon';

const BASE = process.env.LOAD_BASE_URL || 'http://localhost:3001/api/v1';
const EMAIL = process.env.LOAD_EMAIL || 'admin@lojaexemplo.com';
const PASSWORD = process.env.LOAD_PASSWORD || 'gustavohx02';
const DURATION = Number(process.env.LOAD_DURATION || 10);
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS || 20);

// Autentica e extrai o cookie HttpOnly + tenantId para as consultas.
const loginResponse = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
if (!loginResponse.ok) {
  console.error(`Login falhou (${loginResponse.status}) — confira LOAD_EMAIL/LOAD_PASSWORD.`);
  process.exit(1);
}
const cookie = (loginResponse.headers.get('set-cookie') || '').split(';')[0];
const { data } = await loginResponse.json();
const tenantId = data.user.tenantId;
console.log(`Logado como ${data.user.name} (${data.user.role}) — ${CONNECTIONS} conexões × ${DURATION}s por cenário.\n`);

// Cenários = os endpoints quentes do dia a dia (listagens e consultas).
const scenarios = [
  ['Listagem de produtos', `/products?tenantId=${tenantId}&limit=15&page=1`],
  ['Dashboard', `/dashboard?tenantId=${tenantId}`],
  ['Relatório de estoque', `/reports/inventory?tenantId=${tenantId}&groupBy=day&page=1&limit=20`],
  ['Listagem de vendas', `/orders?tenantId=${tenantId}&limit=15&page=1`],
  ['Auditoria', `/audit?tenantId=${tenantId}&limit=15&page=1`],
];

const headers = { Cookie: cookie };
const fmt = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

for (const [name, path] of scenarios) {
  const result = await autocannon({
    url: `${BASE}${path}`,
    connections: CONNECTIONS,
    duration: DURATION,
    headers,
  });

  // non2xx separa rate-limit (429) e erros reais para não distorcer a leitura.
  const non2xx = result.non2xx || 0;
  const statuses = result.statusCodeStats || {};
  const codes = Object.entries(statuses)
    .map(([code, info]) => `${code}:${info.count}`)
    .join(' | ');

  console.log(`■ ${name}`);
  console.log(
    `   ${fmt(result.requests.average)} req/s · latência avg ${fmt(result.latency.average)}ms ` +
      `p99 ${fmt(result.latency.p99)}ms · ${fmt(result.requests.total)} reqs` +
      (result.errors ? ` · ${result.errors} erros de conexão` : '')
  );
  console.log(`   Status: ${codes}${non2xx ? `  (⚠ ${non2xx} respostas não-2xx — possível rate limit atuando)` : ''}\n`);
}
