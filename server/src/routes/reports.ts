import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import DailyReport from '../models/DailyReport.js';
import Sale from '../models/Sale.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { sendResponse, sendError } from '../utils/apiResponse.js';

// ── Inline Debtor & Expense models (no separate files needed) ──────────────────

const debtorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    amountOwed: { type: Number, required: true, min: 0 },
    branchId: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdByName: { type: String, required: true },
    saleId: { type: String, default: null },
    isCleared: { type: Boolean, default: false },
    clearedBy: { type: String, default: null },
    clearedByName: { type: String, default: null },
    clearedAt: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const Debtor = mongoose.models.Debtor || mongoose.model('Debtor', debtorSchema);

const expenseSchema = new mongoose.Schema(
  {
    branchId: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'other' },
    recordedBy: { type: String, required: true },
    recordedByName: { type: String, required: true },
    expenseDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);

// ── Router ─────────────────────────────────────────────────────────────────────

const router = Router();
router.use(authMiddleware);

// ── Daily Reports ──────────────────────────────────────────────────────────────

// GET /api/reports/daily
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const { branchId, status, startDate, endDate, limit = '50' } = req.query as Record<string, string>;

    const filter: any = {};
    if (status) filter.status = status;
    if (branchId) filter.branchId = branchId;
    else if (req.user?.role !== 'admin' && req.user?.branchId) {
      filter.branchId = req.user.branchId;
    }
    if (startDate || endDate) {
      filter.reportDate = {};
      if (startDate) filter.reportDate.$gte = new Date(startDate);
      if (endDate) filter.reportDate.$lte = new Date(endDate);
    }

    const reports = await DailyReport.find(filter).sort({ reportDate: -1 }).limit(parseInt(limit));
    return sendResponse(res, 200, 'Reports fetched', reports);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// GET /api/reports/daily/:id
router.get('/daily/:id', async (req: Request, res: Response) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) return sendError(res, 404, 'Report not found');
    return sendResponse(res, 200, 'Report fetched', report);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/reports/daily
router.post('/daily', async (req: Request, res: Response) => {
  try {
    const { branchId, reportDate } = req.body;
    if (!branchId || !reportDate) return sendError(res, 400, 'branchId and reportDate are required');

    const dateStart = new Date(reportDate);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(reportDate);
    dateEnd.setUTCHours(23, 59, 59, 999);

    const existing = await DailyReport.findOne({
      branchId,
      reportDate: { $gte: dateStart, $lte: dateEnd },
    });

    const payload = {
      ...req.body,
      submittedBy: req.userId,
      submittedByName: req.user?.fullName ?? req.user?.email ?? '',
      reportDate: new Date(reportDate),
      status: 'pending',
    };

    let report;
    if (existing) {
      report = await DailyReport.findByIdAndUpdate(existing._id, { $set: payload }, { new: true });
    } else {
      report = await DailyReport.create(payload);
    }
    return sendResponse(res, 201, 'Report submitted', report);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PATCH /api/reports/daily/:id/review  (admin only)
router.patch('/daily/:id/review', adminOnly, async (req: Request, res: Response) => {
  try {
    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return sendError(res, 400, 'Invalid status');

    const report = await DailyReport.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          reviewedBy: req.userId,
          reviewedByName: req.user?.fullName ?? '',
          reviewedAt: new Date(),
          reviewNotes: reviewNotes ?? '',
        },
      },
      { new: true }
    );
    if (!report) return sendError(res, 404, 'Report not found');
    return sendResponse(res, 200, 'Report reviewed', report);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// ── Debtors ────────────────────────────────────────────────────────────────────

// GET /api/reports/debtors
router.get('/debtors', async (req: Request, res: Response) => {
  try {
    const { branchId, isCleared } = req.query as Record<string, string>;
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    else if (req.user?.role !== 'admin' && req.user?.branchId) {
      filter.branchId = req.user.branchId;
    }
    if (isCleared !== undefined) filter.isCleared = isCleared === 'true';

    const debtors = await Debtor.find(filter).sort({ createdAt: -1 });
    return sendResponse(res, 200, 'Debtors fetched', debtors);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/reports/debtors
router.post('/debtors', async (req: Request, res: Response) => {
  try {
    const debtor = await Debtor.create({
      ...req.body,
      createdBy: req.userId,
      createdByName: req.user?.fullName ?? '',
    });
    return sendResponse(res, 201, 'Debtor recorded', debtor);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PATCH /api/reports/debtors/:id/clear
router.patch('/debtors/:id/clear', adminOnly, async (req: Request, res: Response) => {
  try {
    const debtor = await Debtor.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          isCleared: true,
          clearedBy: req.userId,
          clearedByName: req.user?.fullName ?? '',
          clearedAt: new Date(),
        },
      },
      { new: true }
    );
    if (!debtor) return sendError(res, 404, 'Debtor not found');
    return sendResponse(res, 200, 'Debtor cleared', debtor);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// PATCH /api/reports/debtors/:id/reactivate
router.patch('/debtors/:id/reactivate', adminOnly, async (req: Request, res: Response) => {
  try {
    const debtor = await Debtor.findByIdAndUpdate(
      req.params.id,
      { $set: { isCleared: false, clearedBy: null, clearedByName: null, clearedAt: null } },
      { new: true }
    );
    if (!debtor) return sendError(res, 404, 'Debtor not found');
    return sendResponse(res, 200, 'Debtor reactivated', debtor);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// ── Expenses ───────────────────────────────────────────────────────────────────

// GET /api/reports/expenses
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const { branchId, startDate, endDate } = req.query as Record<string, string>;
    const filter: any = {};
    if (branchId) filter.branchId = branchId;
    else if (req.user?.role !== 'admin' && req.user?.branchId) {
      filter.branchId = req.user.branchId;
    }
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter).sort({ expenseDate: -1 });
    return sendResponse(res, 200, 'Expenses fetched', expenses);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// POST /api/reports/expenses
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      recordedBy: req.userId,
      recordedByName: req.user?.fullName ?? '',
      expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : new Date(),
    });
    return sendResponse(res, 201, 'Expense recorded', expense);
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

// ── Analytics ──────────────────────────────────────────────────────────────────

// GET /api/reports/analytics/dashboard
router.get('/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today); endOfDay.setUTCHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const saleFilter: any = { saleDate: { $gte: startOfDay, $lte: endOfDay } };
    const expenseFilter: any = { expenseDate: { $gte: startOfDay, $lte: endOfDay } };
    const debtorFilter: any = {};

    if (req.user?.role !== 'admin' && req.user?.branchId) {
      const bId = req.user.branchId;
      saleFilter.branchId = bId;
      expenseFilter.branchId = bId;
      debtorFilter.branchId = bId;
    }

    const [sales, expenses, reports, debtors] = await Promise.all([
      Sale.find(saleFilter),
      Expense.find(expenseFilter),
      DailyReport.find({ reportDate: { $gte: sevenDaysAgo } }),
      Debtor.find(debtorFilter),
    ]);

    const todaySales = sales.reduce((s: number, x: any) => s + Number(x.totalAmount), 0);
    const todayCash = sales.filter((s: any) => s.paymentMethod === 'cash').reduce((a: number, s: any) => a + Number(s.totalAmount), 0);
    const todayPos = sales.filter((s: any) => s.paymentMethod === 'pos').reduce((a: number, s: any) => a + Number(s.totalAmount), 0);
    const todayExpenses = expenses.reduce((s: number, x: any) => s + Number(x.amount), 0);
    const pendingReports = (reports as any[]).filter((r: any) => r.status === 'pending').length;
    const activeDebtors = (debtors as any[]).filter((d: any) => !d.isCleared);

    return sendResponse(res, 200, 'Dashboard data fetched', {
      todaySales,
      todayCash,
      todayPos,
      todayExpenses,
      pendingReports,
      activeDebtors: activeDebtors.length,
      totalDebtorAmount: activeDebtors.reduce((s: number, d: any) => s + Number(d.amountOwed), 0),
    });
  } catch (err) {
    return sendError(res, 500, 'Server error', err);
  }
});

export default router;
