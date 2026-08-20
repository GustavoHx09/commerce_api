import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // se nao enviar o token
  if (!authHeader) {
    return res.status(401).json({
      message: "Acesso não autorizado."
    });
  }

  // remove o bearer do token e pega a somente o token
  const token = authHeader.split(" ")[1];

  try {

    // verifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // salva dados do usuário na requisição
    req.user = decoded;

    return next(); // segue pra próxima etapa

  } catch (error) {
    return res.status(401).json({
      message: "Token inválido"
    });
  }
};

export const isAdmin = (req, res, next) => {

  if (req.user.profile !== "admin") {
    return res.status(403).json({
      message: "Acesso negado"
    });
  }
  next();
}