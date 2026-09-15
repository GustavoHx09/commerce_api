import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getHealth } from "../healthController.js";

// Cria uma resposta HTTP simulada para validar status e payload do health check.
const createResponse = () => {
    const res = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
};

describe("getHealth", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("retorna status mínimo e 200 quando o banco está conectado", async () => {
        vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1);
        const res = createResponse();

        await getHealth({}, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            status: "ok",
            timestamp: expect.any(String),
        });
    });

    it("retorna status mínimo e 503 quando o banco está desconectado", async () => {
        vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(0);
        const res = createResponse();

        await getHealth({}, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({
            status: "unavailable",
            timestamp: expect.any(String),
        });
    });
});
