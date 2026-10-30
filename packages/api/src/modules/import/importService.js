// Serviço de importação em massa por arquivo (CSV ou JSON).
// Estratégia: parse das linhas → montagem do payload por recurso →
// orquestração chamando os services de criação existentes, que já fazem as
// validações de negócio e a auditoria (regra 10). Linhas inválidas não
// interrompem a importação: voltam no relatório de erros por linha.
import { createProductService } from "../product/productService.js";
import { createCategoryService } from "../category/categoryService.js";
import { createCustomerService } from "../customer/customerService.js";
import { createSupplierService } from "../supplier/supplierService.js";
import { createStockMovementService } from "../stock/stockMovementService.js";
import { getCategoriesRepo } from "../category/categoryRepo.js";
import { baseQuery } from "../../shared/utils/repositoryHelpers.js";
import { hasPermission } from "../../shared/utils/permissionHelpers.js";
import { isEmpty } from "../../shared/utils/fieldsValidations.js";
import { throwValidationError } from "../../shared/utils/serviceHelpers.js";

const VALID_RESOURCES = ["products", "categories", "customers", "suppliers"];

// Campos de endereço achatados nos arquivos (mesmo formato da exportação).
const ADDRESS_KEYS = ["street", "number", "complement", "neighborhood", "city", "state", "zipCode"];

// Parser CSV: aspas com "" como escape, quebra de linha dentro de aspas e
// separador vírgula. Retorna cada linha como array de células.
const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (inQuotes) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    field += '"';
                    index++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[index + 1] === "\n") index++;
            row.push(field);
            field = "";
            // Ignora linhas totalmente vazias.
            if (row.some((cell) => cell.trim() !== "")) rows.push(row);
            row = [];
        } else {
            field += char;
        }
    }
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    return rows;
};

// Lê o buffer do upload e devolve as linhas como objetos com chaves em
// minúsculas — no CSV o cabeçalho vira chave; no JSON cada objeto é uma
// linha (mesmo formato emitido pela exportação, então exporta→importa).
const parseRows = (buffer, filename) => {
    const content = buffer.toString("utf8").replace(/^\uFEFF/, "");
    if (String(filename || "").toLowerCase().endsWith(".json")) {
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch {
            throwValidationError("JSON inválido. Verifique o arquivo enviado.");
        }
        if (!Array.isArray(parsed)) {
            throwValidationError("O JSON de importação deve ser uma lista de objetos.");
        }
        return parsed.map((row) =>
            Object.fromEntries(
                Object.entries(row || {}).map(([key, value]) => [key.toLowerCase(), value])
            )
        );
    }
    const table = parseCSV(content);
    if (table.length < 2) throwValidationError("Arquivo CSV sem linhas de dados.");
    const headers = table[0].map((header) => header.trim().toLowerCase());
    return table.slice(1).map((cells) =>
        Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
    );
};

// Conversores dos valores textuais do arquivo para os tipos do modelo.
const parseBoolean = (value) =>
    ["true", "1", "sim", "yes"].includes(String(value ?? "").trim().toLowerCase());

const parseNumber = (value) => {
    const number = Number(String(value ?? "").trim().replace(",", "."));
    return Number.isFinite(number) ? number : undefined;
};

const text = (value) => (isEmpty(value) ? undefined : String(value).trim());

// isActive opcional: coluna vazia/ausente deixa o default do service valer.
const parseActive = (row) =>
    isEmpty(row.isactive) ? undefined : parseBoolean(row.isactive);

// Reconstrói o objeto de endereço a partir das colunas achatadas.
const buildAddress = (row) => {
    const address = {};
    for (const key of ADDRESS_KEYS) {
        const value = text(row[`address.${key}`]);
        if (value) address[key] = value;
    }
    return Object.keys(address).length ? address : undefined;
};

// Monta o payload de cada recurso a partir da linha do arquivo. Campos
// faltantes viram undefined e caem na validação do service correspondente.
const RESOURCE_BUILDERS = {
    categories: (row) => ({
        name: text(row.name),
        description: text(row.description),
        isActive: parseActive(row),
    }),
    customers: (row) => ({
        name: text(row.name),
        document: text(row.document),
        documentType: text(row.documenttype),
        phone: text(row.phone),
        email: text(row.email),
        address: buildAddress(row),
        isActive: parseActive(row),
    }),
    suppliers: (row) => ({
        name: text(row.name),
        document: text(row.document),
        documentType: text(row.documenttype),
        phone: text(row.phone),
        email: text(row.email),
        contactName: text(row.contactname),
        address: buildAddress(row),
        isActive: parseActive(row),
    }),
};

// Services de criação reutilizados pela importação — cada um já valida as
// regras do recurso e grava a auditoria do registro criado.
const CREATE_SERVICES = {
    categories: createCategoryService,
    customers: createCustomerService,
    suppliers: createSupplierService,
};

// Importa o arquivo do recurso: cria linha a linha e retorna o resumo com
// os erros por número da linha do arquivo (linha 1 é o cabeçalho).
export const importResourceService = async (resource, buffer, filename, tenantId, actor) => {
    if (!VALID_RESOURCES.includes(resource)) {
        throwValidationError("Recurso inválido para importação.");
    }
    const rows = parseRows(buffer, filename);
    if (!rows.length) throwValidationError("Arquivo sem linhas de dados.");

    // Estoque inicial gera movimentação de entrada, que exige a permissão
    // de suprimento — validada antes de começar para não importar cadastros
    // e falhar só nas linhas com saldo.
    const wantsInitialStock =
        resource === "products" &&
        rows.some((row) => (parseNumber(row.quantityinstock) || 0) > 0);
    if (wantsInitialStock && !hasPermission(actor, "stock", "supply")) {
        throwValidationError(
            "Importar estoque inicial exige a permissão de suprimento de estoque (stock:supply)."
        );
    }

    // A categoria do produto chega pelo nome: resolve no mapa nome→id e
    // auto-cria (auditada) as que ainda não existirem no tenant.
    let categoryByName = new Map();
    const resolveCategory = async (name) => {
        const key = String(name || "").trim().toLowerCase();
        if (!key) throwValidationError("Categoria é obrigatória.");
        if (categoryByName.has(key)) return categoryByName.get(key);
        const created = await createCategoryService({ name: String(name).trim() }, tenantId, actor.id);
        categoryByName.set(key, created._id);
        return created._id;
    };
    if (resource === "products") {
        const existing = await getCategoriesRepo(baseQuery(tenantId, false), 0, 5000, { name: 1 });
        categoryByName = new Map(
            existing.map((category) => [String(category.name).toLowerCase(), category._id])
        );
    }

    const errors = [];
    let created = 0;
    for (const [index, row] of rows.entries()) {
        const line = index + 2;
        try {
            if (resource === "products") {
                const categoryId = await resolveCategory(row.category);
                const initialStock = parseNumber(row.quantityinstock);
                const product = await createProductService(
                    {
                        name: text(row.name),
                        sku: text(row.sku),
                        description: text(row.description),
                        unit: text(row.unit),
                        price: parseNumber(row.price),
                        costPrice: parseNumber(row.costprice),
                        minStock: parseNumber(row.minstock),
                        categoryId,
                        isActive: parseActive(row),
                    },
                    tenantId,
                    actor.id
                );
                // Estoque inicial vira movimentação auditada — nunca gravado
                // direto no cadastro do produto (regra 10.1).
                if (initialStock > 0) {
                    await createStockMovementService(
                        {
                            productId: product._id,
                            type: "in",
                            quantity: initialStock,
                            reason: "Importação de produtos",
                            reference: product.sku,
                        },
                        tenantId,
                        actor
                    );
                }
            } else {
                await CREATE_SERVICES[resource](RESOURCE_BUILDERS[resource](row), tenantId, actor.id);
            }
            created++;
        } catch (error) {
            errors.push({ line, message: error.message || "Erro ao importar linha." });
        }
    }

    return { total: rows.length, created, errors };
};
