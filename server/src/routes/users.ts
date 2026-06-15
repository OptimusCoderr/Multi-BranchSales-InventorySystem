import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const router = Router();
router.use(authMiddleware);

// GET /api/users  (admin only)
router.get('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return sendResponse(res, 200, 'Users fetched', users);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/users  (admin only – create staff accounts)
router.post(
  '/',
  adminOnly,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').trim().notEmpty(),
    body('role').isIn(['admin', 'staff']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation failed', errors.array());
    try {
      const exists = await User.findOne({ email: req.body.email });
      if (exists) return sendError(res, 409, 'Email already in use');

      const user = await User.create({ ...req.body, isVerified: true, isActive: true });
      return sendResponse(res, 201, 'User created', {
        id: user._id, fullName: user.fullName, email: user.email,
        role: user.role, branchId: user.branchId,
      });
    } catch (err) {
      return sendError(res, 500, 'Server error', err);
    }
  }
);

// PUT /api/users/:id  (admin only)
router.put('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const { password, ...rest } = req.body;
    const update: any = { ...rest };
    if (password) {
      // Let the pre-save hook hash it by fetching and saving the doc
      const user = await User.findById(req.params.id).select('+password');
      if (!user) return sendError(res, 404, 'User not found');
      Object.assign(user, update);
      if (password) user.password = password;
      await user.save();
      return sendResponse(res, 200, 'User updated');
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return sendError(res, 404, 'User not found');
    return sendResponse(res, 200, 'User updated', user);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PATCH /api/users/:id/toggle-active  (admin only)
router.patch('/:id/toggle-active', adminOnly, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found');
    (user as any).isActive = !(user as any).isActive;
    await user.save();
    return sendResponse(res, 200, 'User status toggled', { isActive: (user as any).isActive });
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
