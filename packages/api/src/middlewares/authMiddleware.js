import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Acesso não autorizado."
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token inválido",
      error: error.message
    });
  }
};

export const isMaster = (req, res, next) => {
  if (req.user.role !== "master") {
    return res.status(403).json({
      message: "Acesso negado. Apenas master."
    });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  const allowedRoles = ["master", "admin"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Acesso negado"
    });
  }
  next();
};

export const tenantMiddleware = (req, res, next) => {
  if (req.user.role === "master") {
    return next();
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      message: "Usuário sem tenant associado"
    });
  }

  req.tenantId = req.user.tenantId;
  next();
};
