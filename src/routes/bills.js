'use strict';

const express = require('express');
const store = require('../data/store');
const { sendError, toPositiveInt } = require('../utils/http');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const VALID_BILL_MONTH = /^\d{4}-\d{2}$/;

router.get('/', wrap(async (req, res) => {
  const filters = {};
  if (req.query.studentId !== undefined) {
    const sid = toPositiveInt(req.query.studentId);
    if (sid === null) return sendError(res, 400, '无效的学生 ID');
    filters.studentId = sid;
  }
  if (req.query.enrollmentId !== undefined) {
    const eid = toPositiveInt(req.query.enrollmentId);
    if (eid === null) return sendError(res, 400, '无效的报名 ID');
    filters.enrollmentId = eid;
  }
  if (req.query.billMonth !== undefined) {
    if (!VALID_BILL_MONTH.test(req.query.billMonth)) {
      return sendError(res, 400, '账期格式必须为 YYYY-MM');
    }
    filters.billMonth = req.query.billMonth;
  }
  if (req.query.status !== undefined) {
    filters.status = req.query.status;
  }
  const list = await store.listBills(filters);
  res.json({ data: list, total: list.length });
}));

router.post('/generate', wrap(async (req, res) => {
  const b = req.body || {};
  const enrollmentId = toPositiveInt(b.enrollmentId);
  if (enrollmentId === null) return sendError(res, 400, '必须指定有效的报名 ID');
  if (!VALID_BILL_MONTH.test(b.billMonth)) {
    return sendError(res, 400, '账期格式必须为 YYYY-MM');
  }
  const enrollment = await store.getEnrollment(enrollmentId);
  if (!enrollment) return sendError(res, 404, '报名记录不存在');
  const bill = await store.generateBill(enrollmentId, b.billMonth);
  if (!bill) return sendError(res, 400, '该报名在此账期无有效天数');
  res.json({ data: bill });
}));

router.post('/:id/finalize', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的账单 ID');
  const [rows] = await require('../db').pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  if (!rows.length) return sendError(res, 404, '账单不存在');
  if (rows[0].status === 'FINALIZED') {
    return sendError(res, 409, '账单已结账，不能重复操作');
  }
  const bill = await store.finalizeBill(id);
  res.json({ data: bill });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的账单 ID');
  const [rows] = await require('../db').pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  if (!rows.length) return sendError(res, 404, '账单不存在');
  const bill = await store.listBills({});
  const found = bill.find(x => x.id === id);
  res.json({ data: found });
}));

module.exports = router;
