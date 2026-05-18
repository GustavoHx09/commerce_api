import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import users from "../models/usersModel.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // busca o usuário no banco pelo email
    const user = await users
      .findOne({ email })
      .select("+password");

    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Credenciais inválidas"
      });
    }

    // gerar token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        profile: user.profile,
        companyId: user.company
      },
      process.env.JWT_SECRET,
      process.env.JWT_EXPIRES_IN ? { expiresIn: process.env.JWT_EXPIRES_IN } : undefined
    );

    return res.json({ token });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};