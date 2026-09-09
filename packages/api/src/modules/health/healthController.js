import mongoose from "mongoose";

// Endpoint de health check usado por load balancers, monitoramento e deploy.
// Retorna 200 se a conexão com o MongoDB está ativa e 503 em caso de falha.
export const getHealth = async (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
        return res.status(503).json({
            status: "unavailable",
            database: "disconnected",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    }

    res.status(200).json({
        status: "ok",
        database: "connected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
};
