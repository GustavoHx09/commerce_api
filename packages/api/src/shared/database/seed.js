import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import users from "../../modules/user/userModel.js";
import tenants from "../../modules/tenant/tenantModel.js";
import products from "../../modules/product/productModel.js";

// Carrega as variáveis de ambiente antes de conectar ao banco.
dotenv.config();

// Popula o banco com dados iniciais para desenvolvimento e testes.
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado ao banco");

    // Limpa as coleções antes de inserir os dados iniciais.
    await users.deleteMany();
    await tenants.deleteMany();
    await products.deleteMany();

    // Cria o tenant de exemplo com dados comerciais completos.
    const tenant = await tenants.create({
      name: "Loja Exemplo",
      slug: "loja-exemplo",
      document: "04079412772007",
      documentType: "cnpj",
      phone: "1133334444",
      email: "contato@lojaexemplo.com",
      address: {
        street: "Rua do Comércio",
        number: "100",
        complement: "Sala 10",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01000000",
      },
      plan: "basic",
      isActive: true,
    });

    // Senhas padrão que podem ser sobrescritas por variáveis de ambiente.
    const masterPassword = process.env.MASTER_PASSWORD || "master123";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const userPassword = process.env.USER_PASSWORD || "user123";

    // Usuários iniciais com diferentes papéis para testar a aplicação.
    const usersData = [
      {
        name: "Master Admin",
        email: process.env.MASTER_EMAIL || "master@admin.com",
        cpf: "52998224725",
        phone: "11999999999",
        address: {
          street: "Rua Master",
          number: "1",
          city: "São Paulo",
          state: "SP",
          zipCode: "01000000",
        },
        password: await bcrypt.hash(masterPassword, 10),
        role: "master",
        tenantId: null,
        isActive: true,
      },
      {
        name: "Admin Exemplo",
        email: process.env.ADMIN_EMAIL || "admin@lojaexemplo.com",
        cpf: "13651813169",
        phone: "11988888888",
        address: {
          street: "Rua Admin",
          number: "2",
          city: "São Paulo",
          state: "SP",
          zipCode: "02000000",
        },
        password: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        tenantId: tenant._id,
        isActive: true,
      },
      {
        name: "Usuário Exemplo",
        email: process.env.USER_EMAIL || "user@lojaexemplo.com",
        cpf: "95396167866",
        phone: "11977777777",
        address: {
          street: "Rua Usuário",
          number: "3",
          city: "São Paulo",
          state: "SP",
          zipCode: "03000000",
        },
        password: await bcrypt.hash(userPassword, 10),
        role: "user",
        tenantId: tenant._id,
        isActive: true,
      },
    ];

    const createdUsers = await users.insertMany(usersData);

    // Produtos iniciais de exemplo vinculados ao tenant.
    const productsData = [
      {
        tenantId: tenant._id,
        name: "Notebook",
        description: "Notebook gamer",
        price: 5000,
        costPrice: 3500,
        quantityInStock: 10,
        category: "eletronico",
      },
    ];

    await products.insertMany(productsData);

    console.log("Banco populado com sucesso");
    console.log("Usuários criados:", createdUsers.map((u) => ({ email: u.email, role: u.role })));

    process.exit();
  } catch (error) {
    console.error("Erro ao popular banco:", error);
    process.exit(1);
  }
}

seed();
