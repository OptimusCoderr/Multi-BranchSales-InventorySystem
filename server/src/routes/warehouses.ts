import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Warehouse from '../models/Warehouse.js';
import WarehouseStock from '../models/WarehouseStock.js';
import Product from '../models/Product.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

const router = Router();
router.use(authMiddleware, adminOnly);

// GET /api/warehouses
router.get('/', async (_req: Request, res: Response) => {
  try {
    const warehouses = await Warehouse.find().sort({ name: 1 });
    return sendResponse(res, 200, 'Warehouses fetched', warehouses);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/warehouses
router.post('/', [body('name').trim().notEmpty()], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 400, 'Validation failed', errors.array());
  try {
    const warehouse = await Warehouse.create(req.body);
    return sendResponse(res, 201, 'Warehouse created', warehouse);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PUT /api/warehouses/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!warehouse) return sendError(res, 404, 'Warehouse not found');
    return sendResponse(res, 200, 'Warehouse updated', warehouse);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// DELETE /api/warehouses/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, 'Warehouse deleted');
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// GET /api/warehouses/:id/stock
router.get('/:id/stock', async (req: Request, res: Response) => {
  try {
    const stock = await WarehouseStock.find({ warehouseId: req.params.id }).populate('productId');
    return sendResponse(res, 200, 'Stock fetched', stock);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PUT /api/warehouses/:id/stock  (upsert)
router.put('/:id/stock', async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) return sendError(res, 400, 'productId is required');
    const stock = await WarehouseStock.findOneAndUpdate(
      { warehouseId: req.params.id, productId },
      { warehouseId: req.params.id, productId, quantity: Number(quantity) ?? 0 },
      { upsert: true, new: true }
    );
    return sendResponse(res, 200, 'Stock updated', stock);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// DELETE /api/warehouses/stock/:stockId
router.delete('/stock/:stockId', async (req: Request, res: Response) => {
  try {
    await WarehouseStock.findByIdAndDelete(req.params.stockId);
    return sendResponse(res, 200, 'Stock item deleted');
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
