import Company from "../models/companyModel.js";

export async function cnpjExists(cnpj) {
  const company = await Company.findOne({ cnpj });

  if (company) {
    throw {
      statusCode: 400,
      message: "Cnpj já cadastrado"
    };
  }
}