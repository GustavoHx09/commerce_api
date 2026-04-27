import users from "../models/usersModel.js";
import products from "../models/productsModel.js";

export const countUsers = () => {
  return users.countDocuments();
};

export const countProducts = () => {
  return products.countDocuments();
};