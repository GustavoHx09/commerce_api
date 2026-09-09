import fs from "fs";
import path from "path";
import { buildLocalLogoPath } from "./multerConfig.js";

const mimeToExtension = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
};

// Provedor de armazenamento local. Pode ser substituído por S3/R2/MinIO em produção.
// Sempre armazena logos em uma pasta própria do tenant.
export const saveLogoFile = (tenantId, buffer, mimetype) => {
    const extension = mimeToExtension[mimetype] || ".png";
    const { dir, filename, relativePath } = buildLocalLogoPath(tenantId, extension);
    const fullPath = path.join(dir, filename);

    fs.writeFileSync(fullPath, buffer);

    return { relativePath, fullPath };
};
