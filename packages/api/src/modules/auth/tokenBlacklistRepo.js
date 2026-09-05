import tokenBlacklist from "./tokenBlacklistModel.js";

// Adiciona o hash de um token revogado à blacklist.
export const addToBlacklistRepo = (tokenHash, expiresAt) =>
    tokenBlacklist.create({ tokenHash, expiresAt });

// Verifica se o hash de um token está na blacklist.
export const isTokenBlacklistedRepo = (tokenHash) =>
    tokenBlacklist.findOne({ tokenHash });
