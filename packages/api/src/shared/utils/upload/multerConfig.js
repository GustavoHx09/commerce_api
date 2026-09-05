import multer from "multer";
import fs from "fs";

// Tipos MIME permitidos para logo de tenant.
const allowedImageTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
    "image/webp",
]);

// Tamanho máximo do arquivo: 2 MB.
const maxFileSize = 2 * 1024 * 1024;

// Garante que o diretório de destino exista.
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

// Configuração do multer para armazenamento temporário em memória.
const storage = multer.memoryStorage();

// Filtro que rejeita arquivos que não sejam imagens.
const fileFilter = (_req, file, cb) => {
    if (allowedImageTypes.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Arquivo inválido. Envie apenas imagens PNG, JPG, SVG ou WebP."), false);
    }
};

// Middleware de upload de logo. Armazena em memória para validação e persistência controlada.
export const uploadLogo = multer({
    storage,
    limits: { fileSize: maxFileSize },
    fileFilter,
}).single("logo");

// Gera o caminho de destino de uma logo no disco.
export const buildLocalLogoPath = (tenantId, extension) => {
    const dir = ensureDir(`./uploads/tenants/${tenantId}`);
    const filename = `logo${extension}`;
    return { dir, filename, relativePath: `uploads/tenants/${tenantId}/${filename}` };
};
