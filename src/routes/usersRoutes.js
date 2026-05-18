import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { permissions } from '../middlewares/authMiddleware.js';

const router = Router();

// aqui implementar as rotas baseadas no controller
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', permissions, createUser);
router.put('/:id', permissions, updateUser);
router.delete('/:id', permissions, deleteUser);

export default router;