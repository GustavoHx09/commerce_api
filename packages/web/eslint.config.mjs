// Configuração do ESLint 9 (flat config) para o frontend Next.js.
// Substitui o antigo .eslintrc.json, que não é mais lido pelo ESLint 9.
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  // Regras recomendadas do Next.js (core web vitals)
  ...nextVitals,
  // Desativa regras de formatação que conflitam com o Prettier
  prettier,
];

export default eslintConfig;
