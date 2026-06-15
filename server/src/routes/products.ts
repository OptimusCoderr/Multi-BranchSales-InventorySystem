import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import Product from '../models/Product.js';
import BranchStock from '../models/BranchStock.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const router = Router();
router.use(authMiddleware);

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const filter: any = {};
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const products = await Product.find(filter).sort({ name: 1 });
    return sendResponse(res, 200, 'Products fetched', products);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');
    return sendResponse(res, 200, 'Product fetched', product);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/products  (admin only)
router.post(
  '/',
  adminOnly,
  [
    body('name').trim().notEmpty(),
    body('unitPrice').isFloat({ min: 0 }),
    body('unit').isIn(['piece', 'kg', 'litre', 'box', 'carton', 'bag', 'roll', 'pair', 'set', 'dozen']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation failed', errors.array());
    try {
      const product = await Product.create({
        ...req.body,
        currentPrice: req.body.currentPrice ?? req.body.unitPrice,
        previousPrice: 0,
      });
      return sendResponse(res, 201, 'Product created', product);
    } catch (err: any) {
      if (err.code === 11000) return sendError(res, 409, 'SKU already exists');
      return sendError(res, 500, 'Server error', err);
    }
  }
);

// PUT /api/products/:id  (admin only)
router.put(
  '/:id',
  adminOnly,
  [body('name').optional().trim().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const existing = await Product.findById(req.params.id);
      if (!existing) return sendError(res, 404, 'Product not found');

      // Track price history
      const update: any = { ...req.body, updatedAt: new Date() };
      if (req.body.unitPrice && req.body.unitPrice !== existing.unitPrice) {
        update.previousPrice = existing.currentPrice;
        update.currentPrice = req.body.unitPrice;
      }

      const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
      return sendResponse(res, 200, 'Product updated', product);
    } catch (err) {
      return sendError(res, 500, 'Server error', err);
    }
  }
);

// DELETE /api/products/:id  (soft delete, admin only)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    return sendResponse(res, 200, 'Product deactivated');
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PUT /api/products/:id/stock  — assign/update branch stock (admin only)
router.put('/:id/stock', adminOnly, async (req: Request, res: Response) => {
  try {
    const { branchId, quantity } = req.body;
    if (!branchId) return sendError(res, 400, 'branchId is required');

    const stock = await BranchStock.findOneAndUpdate(
      { branchId, productId: req.params.id },
      { branchId, productId: req.params.id, quantity: Number(quantity) ?? 0 },
      { upsert: true, new: true }
    );
    return sendResponse(res, 200, 'Stock updated', stock);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
