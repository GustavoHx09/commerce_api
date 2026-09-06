import { exportResourceService } from "./exportService.js";

// Exporta um recurso do tenant em CSV ou JSON, com paginação.
export const exportResource = async (req, res) => {
    const { content, contentType, filename, total } = await exportResourceService(
        req.params.resource,
        req.query,
        req.tenantId
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Total-Count", total);
    return res.send(content);
};
