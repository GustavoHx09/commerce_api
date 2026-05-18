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

// verifica se o usuario tem permissao para acessar a rota ou nao
export const permissions = (req, res, next) => {

  const currentUser = req.user.profile;

  if (currentUser === "adminmaster") {
    next();
  } else if (currentUser === "admin") {
    next();
  } else {
    return res.status(403).json({
      message: "Acesso negado"
    });
  }
}