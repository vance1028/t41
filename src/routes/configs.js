'use strict';

const express = require('express');
const store = require('../data/store');
const { sendError, isNonEmptyString } = require('../utils/http');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', wrap(async (req, res) => {
  const list = await store.getAllConfigs();
  res.json({ data: list, total: list.length });
}));

router.get('/:key', wrap(async (req, res) => {
  const key = req.params.key;
  if (!isNonEmptyString(key)) return sendError(res, 400, '配置键不能为空');
  const config = await store.getConfig(key);
  if (!config) return sendError(res, 404, '配置不存在');
  res.json({ data: config });
}));

router.put('/:key', wrap(async (req, res) => {
  const key = req.params.key;
  if (!isNonEmptyString(key)) return sendError(res, 400, '配置键不能为空');
  const b = req.body || {};
  const value = b.configValue !== undefined ? String(b.configValue) : '';
  const config = await store.setConfig(key, value, b.description || '');
  res.json({ data: config });
}));

module.exports = router;
