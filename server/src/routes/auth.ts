import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').trim().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, 'Validation failed', errors.array());
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return sendError(res, 401, 'Invalid email or password');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return sendError(res, 401, 'Invalid email or password');
      }

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        branchId: user.branchId?.toString(),
        fullName: user.fullName,
      } as any);

      return sendResponse(res, 200, 'Login successful', {
        token,
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          branchId: user.branchId?.toString() || null,
        },
      });
    } catch (err) {
      return sendError(res, 500, 'Server error', err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, 404, 'User not found');
    return sendResponse(res, 200, 'User fetched', {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId?.toString() || null,
    });
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
