import User from "../models/usersModel.js";
import Company from "../models/companyModel.js";

export async function emailExists(email) {
  const user = await User.findOne({ email });
  const company = await Company.findOne({ email });

  if (user || company) {
    throw {
      statusCode: 400,
      message: "Email já cadastrado"
    };
  }
}

