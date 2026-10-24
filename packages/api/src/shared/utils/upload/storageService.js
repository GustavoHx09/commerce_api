import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { appConfig } from "../../config/appConfig.js";
import { buildLocalLogoPath } from "./multerConfig.js";

const mimeToExtension = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
};

// Indica se o object storage remoto está configurado. Quando não está,
// o provedor cai para o disco local (desenvolvimento/testes).
export const isS3StorageEnabled = () =>
    !!(appConfig.s3Bucket && appConfig.s3AccessKeyId && appConfig.s3SecretAccessKey);

// Cliente S3 compatível: funciona com AWS S3, Cloudflare R2 e MinIO,
// bastando ajustar endpoint, região e credenciais nas variáveis de ambiente.
const getS3Client = () => {
    return new S3Client({
        region: appConfig.s3Region,
        endpoint: appConfig.s3Endpoint,
        forcePathStyle: !!appConfig.s3Endpoint, // Necessário para R2/MinIO; S3 real aceita virtual-hosted.
        credentials: {
            accessKeyId: appConfig.s3AccessKeyId,
            secretAccessKey: appConfig.s3SecretAccessKey,
        },
    });
};

// Envia a logo para o bucket e retorna a URL pública do objeto.
const saveLogoToS3 = async (tenantId, buffer, mimetype) => {
    const extension = mimeToExtension[mimetype] || ".png";
    const key = `tenants/${tenantId}/logo${extension}`;

    await getS3Client().send(new PutObjectCommand({
        Bucket: appConfig.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
    }));

    return { key, publicUrl: `${appConfig.s3PublicUrl}/${key}` };
};

// Provedor local: grava em ./uploads e a URL pública é montada pelo chamador
// com a base da própria API (rota estática /uploads).
const saveLogoToDisk = (tenantId, buffer, mimetype) => {
    const extension = mimeToExtension[mimetype] || ".png";
    const { dir, filename, relativePath } = buildLocalLogoPath(tenantId, extension);
    const fullPath = path.join(dir, filename);

    fs.writeFileSync(fullPath, buffer);

    return { key: relativePath, publicUrl: null };
};

// Salva a logo do tenant no provedor configurado (S3/R2/MinIO ou disco local).
// Retorna { key, publicUrl }; publicUrl é null no modo local.
export const saveLogoFile = async (tenantId, buffer, mimetype) => {
    if (isS3StorageEnabled()) {
        return await saveLogoToS3(tenantId, buffer, mimetype);
    }

    return saveLogoToDisk(tenantId, buffer, mimetype);
};
