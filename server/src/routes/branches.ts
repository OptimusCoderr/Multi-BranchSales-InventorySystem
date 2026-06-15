import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Branch from '../models/Branch.js';
import BranchStock from '../models/BranchStock.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const router = Router();
router.use(authMiddleware);

// GET /api/branches
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const filter: any = {};
    if (active === 'true') filter.isActive = true;
    const branches = await Branch.find(filter).sort({ name: 1 });
    return sendResponse(res, 200, 'Branches fetched', branches);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// GET /api/branches/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return sendError(res, 404, 'Branch not found');
    return sendResponse(res, 200, 'Branch fetched', branch);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// GET /api/branches/:id/stock
router.get('/:id/stock', async (req: Request, res: Response) => {
  try {
    const stock = await BranchStock.find({ branchId: req.params.id }).populate('productId');
    return sendResponse(res, 200, 'Stock fetched', stock);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/branches (admin only)
router.post(
  '/',
  adminOnly,
  [body('name').trim().notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation failed', errors.array());
    try {
      const branch = await Branch.create(req.body);
      return sendResponse(res, 201, 'Branch created', branch);
    } catch (err) {
      return sendError(res, 500, 'Server error', err);
    }
  }
);

// PUT /api/branches/:id (admin only)
router.put('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!branch) return sendError(res, 404, 'Branch not found');
    return sendResponse(res, 200, 'Branch updated', branch);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// DELETE /api/branches/:id (admin only)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    await Branch.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, 'Branch deleted');
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
