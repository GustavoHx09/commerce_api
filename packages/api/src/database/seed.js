import mongoose from "mongoose";
import dotenv from "dotenv";
import users from "../models/usersModel.js";
// import products from "../models/productsModel.js";
import bcrypt from "bcrypt";

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Conectado ao banco");

    // limpa os dados existentes
    // await users.deleteMany();
    // await products.deleteMany();

    // inserindo usuários
    const usersData = [
      {
        name: "Admin",
        email: "admin@gmail.com",
        password: await bcrypt.hash("123456", 10),
        profile: "admin"
      }
    ];

    // 📦 produtos
    // const productsData = [
    //   {
    //     name: "Notebook",
    //     description: "Notebook gamer",
    //     price: 5000,
    //     quantityInStock: 10,
    //     category: "eletronico"
    //   }
    // ];

    await users.insertMany(usersData);
    // await products.insertMany(productsData);

    console.log("Banco populado com sucesso");

    process.exit();

  } catch (error) {
    console.error("Erro ao popular banco:", error);
    process.exit(1);
  }
}

seed();