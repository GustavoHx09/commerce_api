import { importResourceService } from "./importService.js";
import { throwValidationError } from "../../shared/utils/serviceHelpers.js";

// Recebe o upload do arquivo (campo 'file') e dispara a importação do
// recurso da URL — o service devolve o resumo com erros por linha.
export const importResource = async (req, res) => {
    if (!req.file) throwValidationError("Envie o arquivo no campo 'file'.");
    const result = await importResourceService(
        req.params.resource,
        req.file.buffer,
        req.file.originalname,
        req.tenantId,
        req.user
    );
    return res.json({ data: result });
};
