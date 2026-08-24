import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { roleGuard } from '../middleware/authGuard';

const router = Router();
const controller = new UsersController();

router.get('/me', roleGuard('user'), (req, res, next) => {
  void controller.getProfile(req, res, next);
});
router.patch('/me', roleGuard('user'), (req, res, next) => {
  void controller.updateProfile(req, res, next);
});

export { router as usersRouter };
``;
