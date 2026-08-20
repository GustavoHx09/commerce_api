export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-blue-600">
        Commerce API - Frontend
      </h1>
      <p className="mt-4 text-lg">
        Frontend em Next.js + React + TypeScript + Tailwind configurado no monorepo.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Proxy para a API em <code className="rounded bg-gray-200 px-1 py-0.5">/api/v1</code> na porta 3001.
      </p>
    </main>
  );
}
