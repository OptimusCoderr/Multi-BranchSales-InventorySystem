import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Sale from '../models/Sale.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const router = Router();
router.use(authMiddleware);

// GET /api/sales
router.get('/', async (req: Request, res: Response) => {
  try {
    const { branchId, startDate, endDate, paymentMethod, limit = '100', page = '1' } = req.query as Record<string, string>;

    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }

    // Non-admin staff can only see their branch
    if (req.user?.role !== 'admin' && req.user?.branchId) {
      filter.branchId = req.user.branchId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sales = await Sale.find(filter)
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Sale.countDocuments(filter);
    return sendResponse(res, 200, 'Sales fetched', { sales, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// GET /api/sales/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return sendError(res, 404, 'Sale not found');
    return sendResponse(res, 200, 'Sale fetched', sale);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/sales
router.post(
  '/',
  [
    body('branchId').notEmpty(),
    body('paymentMethod').isIn(['cash', 'pos', 'unpaid']),
    body('items').isArray({ min: 1 }),
    body('items.*.productId').notEmpty(),
    body('items.*.quantity').isFloat({ min: 0.01 }),
    body('items.*.unitPrice').isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 400, 'Validation failed', errors.array());
    try {
      const { items, ...rest } = req.body;
      const processedItems = items.map((item: any) => ({
        ...item,
        subtotal: item.quantity * item.unitPrice,
      }));
      const totalAmount = processedItems.reduce((sum: number, i: any) => sum + i.subtotal, 0);

      const sale = await Sale.create({
        ...rest,
        items: processedItems,
        totalAmount,
        staffId: req.userId,
        staffName: req.user?.fullName ?? req.user?.email ?? '',
        saleDate: rest.saleDate ? new Date(rest.saleDate) : new Date(),
      });
      return sendResponse(res, 201, 'Sale recorded', sale);
    } catch (err) {
      return sendError(res, 500, 'Server error', err);
    }
  }
);

// DELETE /api/sales/:id (admin only)
router.delete('/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    await Sale.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, 'Sale deleted');
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
