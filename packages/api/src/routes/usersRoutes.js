import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { isAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// aqui implementar as rotas baseadas no controller
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', isAdmin, createUser);
router.put('/:id', isAdmin, updateUser);
router.delete('/:id', isAdmin, deleteUser);

export default router;