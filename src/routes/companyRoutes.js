import { Router } from 'express';
import {
  getCompany,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} from '../controllers/companyController.js';
import { permissions } from '../middlewares/authMiddleware.js';

const router = Router();

// aqui implementar as rotas baseadas no controller
router.get('/', getCompany);
router.get('/:id', getCompanyById);
router.post('/', permissions, createCompany);
router.put('/:id', permissions, updateCompany);
router.delete('/:id', permissions, deleteCompany);

export default router;