import {
    createCompanyService,
    getCompanyService,
    getCompanyByIdService,
    updateCompanyService,
    deleteCompanyService
} from "../services/companyService.js";

// Criar empresa
export const createCompany = async (req, res) => {
    try {
        const data = req.body;

        const company = await createCompanyService(
            data,
            req.user
        );

        return res.status(201).json({
            message: "Emrpesa criada com sucesso",
            company
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Erro ao criar empresa"
        });
    }
}

// Buscar empresas
export const getCompany = async (req, res) => {

}

// Buscar empresa por id
export const getCompanyById = async (req, res) => {

}

// Atualizar empresa
export const updateCompany = async (req, res) => {

}

// Deletar empresa
export const deleteCompany = async (req, res) => {

}
