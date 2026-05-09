import User from "../models/usersModel.js";

export async function cpfExists(cpf) {
  const user = await User.findOne({ cpf });

  if (user) {
    throw {
      statusCode: 400,
      message: "CPF já cadastrado"
    };
  }
}