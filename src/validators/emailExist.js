import User from "../models/usersModel.js";

export async function emailExists(email) {
  const user = await User.findOne({ email });

  if (user) {
    throw {
      statusCode: 400,
      message: "Email já cadastrado"
    };
  }
}