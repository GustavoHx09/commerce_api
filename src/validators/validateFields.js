// Utilizado para verificar se o campo veio preenchido
export const isEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
};

// Mesma coisa do de cima mas com um adicional de verificação na hora de atualizar um dado!
export const isValid = (value, userValue) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (value === userValue) return true;
  return false;
};