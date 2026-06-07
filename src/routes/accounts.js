'use strict';

const express = require('express');
const store = require('../data/store');
const { sendError, toPositiveInt, isValidDate } = require('../utils/http');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', wrap(async (req, res) => {
  const list = await store.listMealAccounts();
  res.json({ data: list, total: list.length });
}));

router.get('/student/:studentId', wrap(async (req, res) => {
  const sid = toPositiveInt(req.params.studentId);
  if (sid === null) return sendError(res, 400, '无效的学生 ID');
  const account = await store.getOrCreateMealAccount(sid);
  res.json({ data: account });
}));

router.get('/student/:studentId/transactions', wrap(async (req, res) => {
  const sid = toPositiveInt(req.params.studentId);
  if (sid === null) return sendError(res, 400, '无效的学生 ID');
  const filters = { studentId: sid };
  if (req.query.startDate !== undefined) {
    if (!isValidDate(req.query.startDate)) return sendError(res, 400, '开始日期格式错误');
    filters.startDate = req.query.startDate;
  }
  if (req.query.endDate !== undefined) {
    if (!isValidDate(req.query.endDate)) return sendError(res, 400, '结束日期格式错误');
    filters.endDate = req.query.endDate;
  }
  if (req.query.type !== undefined) {
    filters.type = req.query.type;
  }
  const list = await store.listTransactions(filters);
  res.json({ data: list, total: list.length });
}));

router.post('/student/:studentId/recharge', wrap(async (req, res) => {
  const sid = toPositiveInt(req.params.studentId);
  if (sid === null) return sendError(res, 400, '无效的学生 ID');
  const b = req.body || {};
  const amountCents = toPositiveInt(b.amountCents);
  if (amountCents === null) return sendError(res, 400, '充值金额必须为正整数(分)');
  const student = await store.getStudent(sid);
  if (!student) return sendError(res, 404, '学生不存在');
  const tx = await store.rechargeAccount(
    sid,
    amountCents,
    b.relatedType || '',
    b.relatedId || null,
    b.remark || '手动充值',
    b.operator || 'admin',
  );
  res.status(201).json({ data: tx });
}));

router.get('/student/:studentId/adjustments', wrap(async (req, res) => {
  const sid = toPositiveInt(req.params.studentId);
  if (sid === null) return sendError(res, 400, '无效的学生 ID');
  const filters = { studentId: sid };
  if (req.query.startDate !== undefined) {
    if (!isValidDate(req.query.startDate)) return sendError(res, 400, '开始日期格式错误');
    filters.startDate = req.query.startDate;
  }
  if (req.query.endDate !== undefined) {
    if (!isValidDate(req.query.endDate)) return sendError(res, 400, '结束日期格式错误');
    filters.endDate = req.query.endDate;
  }
  if (req.query.adjustType !== undefined) {
    filters.adjustType = req.query.adjustType;
  }
  const list = await store.listAdjustments(filters);
  res.json({ data: list, total: list.length });
}));

module.exports = router;
