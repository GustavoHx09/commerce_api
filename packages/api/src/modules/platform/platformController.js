// Entrada/saída HTTP do painel da plataforma — sem regra de negócio.
import { getPlatformMetricsService } from "./platformService.js";

export const getPlatformMetrics = async (req, res) => {
    const data = await getPlatformMetricsService();
    res.json({ success: true, data });
};
