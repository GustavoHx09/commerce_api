import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import users from "../../modules/user/userModel.js";
import tenants from "../../modules/tenant/tenantModel.js";
import categories from "../../modules/category/categoryModel.js";
import products from "../../modules/product/productModel.js";

// Carrega as variáveis de ambiente antes de conectar ao banco.
dotenv.config();

// Senhas do seed devem vir obrigatoriamente do .env; nunca ficam no código.
const getSeedPassword = (varName) => {
    const value = process.env[varName];
    if (!value) {
        throw new Error(`Variável de ambiente ${varName} é obrigatória para o seed`);
    }
    return value;
};

const getSeedEmail = (varName, defaultValue) => process.env[varName] || defaultValue;

// Popula o banco com dados iniciais para desenvolvimento e testes.
async function seed() {
  try {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI não definida no .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conectado ao banco");

    // Limpa as coleções antes de inserir os dados iniciais.
    await users.deleteMany();
    await tenants.deleteMany();
    await categories.deleteMany();
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

    // Senhas do seed lidas obrigatoriamente do .env.
    const masterPassword = getSeedPassword("MASTER_PASSWORD");
    const adminPassword = getSeedPassword("ADMIN_PASSWORD");
    const userPassword = getSeedPassword("USER_PASSWORD");

    // Usuários iniciais com diferentes papéis para testar a aplicação.
    const usersData = [
      {
        name: "Master Admin",
        email: getSeedEmail("MASTER_EMAIL", "master@admin.com"),
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
        email: getSeedEmail("ADMIN_EMAIL", "admin@lojaexemplo.com"),
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
        email: getSeedEmail("USER_EMAIL", "user@lojaexemplo.com"),
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

    // Categoria de exemplo para vincular aos produtos.
    const category = await categories.create({
      tenantId: tenant._id,
      name: "Eletrônicos",
      isActive: true,
    });

    // Produtos iniciais de exemplo vinculados ao tenant.
    const productsData = [
      {
        tenantId: tenant._id,
        name: "Notebook",
        description: "Notebook gamer",
        sku: "NB-001",
        unit: "un",
        price: 5000,
        costPrice: 3500,
        quantityInStock: 10,
        minStock: 2,
        categoryId: category._id,
        isActive: true,
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
