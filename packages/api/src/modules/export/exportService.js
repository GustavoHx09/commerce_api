import { getExportData, countExportData } from "./exportRepo.js";
import { getSort } from "../../shared/utils/paginationHelpers.js";
import { throwValidationError } from "../../shared/utils/serviceHelpers.js";

const VALID_RESOURCES = ["categories", "products", "customers", "suppliers", "orders"];
const VALID_FORMATS = ["csv", "json"];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

// Valida e retorna o recurso solicitado.
const getResource = (value) => {
    if (!VALID_RESOURCES.includes(value)) {
        throwValidationError("Recurso inválido. Valores aceitos: " + VALID_RESOURCES.join(", "));
    }
    return value;
};

// Valida e retorna o formato solicitado.
const getFormat = (value) => {
    const format = String(value || "csv").toLowerCase();
    if (!VALID_FORMATS.includes(format)) {
        throwValidationError("Formato inválido. Valores aceitos: csv, json");
    }
    return format;
};

// Extrai e limita os parâmetros de paginação da exportação.
const getExportPagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(parseInt(query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

// Converte um valor para uma célula CSV segura.
const csvValue = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
};

// Converte um array de objetos planos em CSV com cabeçalho.
const toCSV = (rows, columns) => {
    if (rows.length === 0) {
        return columns.join(",") + "\n";
    }
    const header = columns.map(csvValue).join(",") + "\n";
    const body = rows
        .map((row) => columns.map((col) => csvValue(row[col] ?? "")).join(","))
        .join("\n");
    return header + body + (body ? "\n" : "");
};

// Converte um array de objetos em JSON formatado.
const toJSON = (rows) => JSON.stringify(rows, null, 2);

// Aplana um endereço em campos com prefixo.
const flattenAddress = (address, prefix) => {
    const result = {};
    if (!address) return result;
    for (const key of ["street", "number", "complement", "neighborhood", "city", "state", "zipCode"]) {
        result[`${prefix}.${key}`] = address[key] ?? "";
    }
    return result;
};

// Normaliza categorias para exportação.
const normalizeCategories = (rows) =>
    rows.map((row) => ({
        name: row.name,
        description: row.description || "",
        isActive: row.isActive,
        createdAt: row.createdAt,
    }));

const CATEGORIES_COLUMNS = ["name", "description", "isActive", "createdAt"];

// Normaliza produtos para exportação.
const normalizeProducts = (rows) =>
    rows.map((row) => ({
        name: row.name,
        sku: row.sku,
        unit: row.unit,
        price: row.price,
        costPrice: row.costPrice ?? "",
        quantityInStock: row.quantityInStock,
        minStock: row.minStock,
        category: row.categoryId?.name || "",
        isActive: row.isActive,
        createdAt: row.createdAt,
    }));

const PRODUCTS_COLUMNS = ["name", "sku", "unit", "price", "costPrice", "quantityInStock", "minStock", "category", "isActive", "createdAt"];

// Normaliza clientes para exportação.
const normalizeCustomers = (rows) =>
    rows.map((row) => ({
        name: row.name,
        document: row.document,
        documentType: row.documentType,
        phone: row.phone || "",
        email: row.email || "",
        ...flattenAddress(row.address, "address"),
        isActive: row.isActive,
        createdAt: row.createdAt,
    }));

// Build columns explicitly for customer address.
const buildAddressColumns = (prefix) => ["street", "number", "complement", "neighborhood", "city", "state", "zipCode"].map((key) => `${prefix}.${key}`);
const CUSTOMER_COLUMNS = ["name", "document", "documentType", "phone", "email", ...buildAddressColumns("address"), "isActive", "createdAt"];

// Normaliza fornecedores para exportação.
const normalizeSuppliers = (rows) =>
    rows.map((row) => ({
        name: row.name,
        document: row.document,
        documentType: row.documentType,
        phone: row.phone || "",
        email: row.email || "",
        contactName: row.contactName || "",
        ...flattenAddress(row.address, "address"),
        isActive: row.isActive,
        createdAt: row.createdAt,
    }));

const SUPPLIER_COLUMNS = ["name", "document", "documentType", "phone", "email", "contactName", ...buildAddressColumns("address"), "isActive", "createdAt"];

// Normaliza pedidos em CSV (uma linha por item).
const normalizeOrdersCSV = (rows) => {
    const result = [];
    for (const order of rows) {
        const customerName = order.customerId?.name || "";
        const cashierId = order.cashierId?._id || "";
        const paymentMethod = order.paymentIds?.[0]?.method || "";
        const orderTotal = order.total;

        for (const item of order.items || []) {
            result.push({
                orderId: order._id,
                createdAt: order.createdAt,
                customerName,
                cashierId,
                status: order.status,
                paymentMethod,
                orderTotal,
                productId: item.productId,
                productName: item.name,
                sku: item.sku,
                unit: item.unit,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                itemTotal: item.total,
            });
        }

        if ((order.items || []).length === 0) {
            result.push({
                orderId: order._id,
                createdAt: order.createdAt,
                customerName,
                cashierId,
                status: order.status,
                paymentMethod,
                orderTotal,
                productId: "",
                productName: "",
                sku: "",
                unit: "",
                quantity: "",
                unitPrice: "",
                discount: "",
                itemTotal: "",
            });
        }
    }
    return result;
};

const ORDERS_CSV_COLUMNS = [
    "orderId",
    "createdAt",
    "customerName",
    "cashierId",
    "status",
    "paymentMethod",
    "orderTotal",
    "productId",
    "productName",
    "sku",
    "unit",
    "quantity",
    "unitPrice",
    "discount",
    "itemTotal",
];

// Mapeia o recurso para seus normalizadores e colunas de CSV.
const RESOURCE_NORMALIZERS = {
    categories: { normalize: normalizeCategories, columns: CATEGORIES_COLUMNS },
    products: { normalize: normalizeProducts, columns: PRODUCTS_COLUMNS },
    customers: { normalize: normalizeCustomers, columns: CUSTOMER_COLUMNS },
    suppliers: { normalize: normalizeSuppliers, columns: SUPPLIER_COLUMNS },
    orders: { normalize: normalizeOrdersCSV, columns: ORDERS_CSV_COLUMNS },
};

// Prepara os dados de acordo com o recurso e formato.
const prepareData = (resource, rows, format) => {
    if (format === "json") {
        if (resource === "orders") {
            return rows;
        }
        return RESOURCE_NORMALIZERS[resource].normalize(rows);
    }
    return RESOURCE_NORMALIZERS[resource].normalize(rows);
};

// Retorna os dados de exportação prontos para o controller.
export const exportResourceService = async (resource, query, tenantId) => {
    const resolvedResource = getResource(resource);
    const format = getFormat(query.format);
    const { page, limit, skip } = getExportPagination(query);
    const sort = getSort(query, "createdAt");

    const [rows, total] = await Promise.all([
        getExportData(resolvedResource, tenantId, skip, limit, sort),
        countExportData(resolvedResource, tenantId),
    ]);

    const prepared = prepareData(resolvedResource, rows, format);
    const filename = `${resolvedResource}_page_${page}.${format}`;
    const content = format === "csv" ? toCSV(prepared, RESOURCE_NORMALIZERS[resolvedResource].columns) : toJSON(prepared);

    return {
        content,
        contentType: format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        filename,
        total,
    };
};
