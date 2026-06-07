'use strict';

/**
 * 数据仓储层 - 基于 MySQL（mysql2/promise）。
 * 所有方法 async，返回 camelCase 字段对象。
 */

const { pool } = require('../db');
const billing = require('../utils/billing');

/* ----------------------------- 映射 ----------------------------- */

function mapStudent(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentNo: r.student_no,
    name: r.name,
    grade: r.grade,
    school: r.school,
    guardianName: r.guardian_name,
    guardianPhone: r.guardian_phone,
    allergies: r.allergies,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapPlan(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    meals: r.meals,
    priceCents: r.price_cents,
    period: r.period,
    description: r.description,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

function mapEnrollment(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentId: r.student_id,
    planId: r.plan_id,
    startDate: r.start_date,
    endDate: r.end_date,
    amountCents: r.amount_cents,
    paid: !!r.paid,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapMenu(r) {
  if (!r) return null;
  return {
    id: r.id,
    menuDate: r.menu_date,
    meal: r.meal,
    dishes: r.dishes,
    createdAt: r.created_at,
  };
}

function mapAttendance(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentId: r.student_id,
    attendDate: r.attend_date,
    meal: r.meal,
    status: r.status,
    pickedUpBy: r.picked_up_by,
    checkedAt: r.checked_at,
    remark: r.remark,
    billed: !!r.billed,
  };
}

function mapConfig(r) {
  if (!r) return null;
  return {
    id: r.id,
    configKey: r.config_key,
    configValue: r.config_value,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMealAccount(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentId: r.student_id,
    balanceCents: r.balance_cents,
    frozenCents: r.frozen_cents,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTransaction(r) {
  if (!r) return null;
  return {
    id: r.id,
    accountId: r.account_id,
    studentId: r.student_id,
    transactionType: r.transaction_type,
    amountCents: r.amount_cents,
    balanceAfterCents: r.balance_after_cents,
    relatedType: r.related_type,
    relatedId: r.related_id,
    remark: r.remark,
    operator: r.operator,
    createdAt: r.created_at,
  };
}

function mapAdjustment(r) {
  if (!r) return null;
  return {
    id: r.id,
    enrollmentId: r.enrollment_id,
    studentId: r.student_id,
    adjustDate: r.adjust_date,
    meal: r.meal,
    adjustType: r.adjust_type,
    unitPriceCents: r.unit_price_cents,
    quantity: r.quantity,
    amountCents: r.amount_cents,
    attendanceId: r.attendance_id,
    transactionId: r.transaction_id,
    remark: r.remark,
    createdAt: r.created_at,
  };
}

function mapBill(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentId: r.student_id,
    enrollmentId: r.enrollment_id,
    billMonth: r.bill_month,
    plannedAmountCents: r.planned_amount_cents,
    refundAmountCents: r.refund_amount_cents,
    supplementAmountCents: r.supplement_amount_cents,
    actualAmountCents: r.actual_amount_cents,
    paidAmountCents: r.paid_amount_cents,
    balanceCents: r.balance_cents,
    status: r.status,
    remark: r.remark,
    generatedAt: r.generated_at,
    finalizedAt: r.finalized_at,
    createdAt: r.created_at,
  };
}

/* --------------------------- 初始化/重置 --------------------------- */

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['bills', 'meal_adjustments', 'meal_transactions', 'meal_accounts',
      'attendances', 'enrollments', 'daily_menus', 'meal_plans', 'students', 'system_configs']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    await conn.query(
      `INSERT INTO system_configs (config_key, config_value, description) VALUES
        ('leave_refund_enabled', '1', '是否开启请假退费'),
        ('leave_deadline_hour', '9', '请假截止时间(小时)，当天该时间前请假可退费'),
        ('absent_refund_strategy', 'NONE', '旷餐退费策略: NONE=不退, HALF=退一半, FULL=全退'),
        ('extra_meal_price_cents', '3000', '临时加餐单价(分)')`,
    );
    await conn.query(
      `INSERT INTO students (id, student_no, name, grade, school, guardian_name, guardian_phone, allergies, status) VALUES
        (1,'XS2026001','小明','三年级','实验小学','王女士','13800001111','花生','ACTIVE'),
        (2,'XS2026002','小红','四年级','实验小学','李先生','13800002222','','ACTIVE'),
        (3,'XS2026003','小刚','二年级','中心小学','张女士','13800003333','海鲜','ACTIVE'),
        (4,'XS2026004','小丽','五年级','中心小学','赵先生','13800004444','','INACTIVE')`,
    );
    await conn.query(
      `INSERT INTO meal_plans (id, name, meals, price_cents, period, description, active) VALUES
        (1,'工作日午餐月套餐','LUNCH',60000,'MONTHLY','周一至周五午餐',1),
        (2,'午晚两餐月套餐','LUNCH,DINNER',99000,'MONTHLY','周一至周五午餐+晚餐含作业辅导',1),
        (3,'单日午餐','LUNCH',3000,'DAILY','临时单日午餐',1)`,
    );
    await conn.query(
      `INSERT INTO enrollments (id, student_id, plan_id, start_date, end_date, amount_cents, paid, status) VALUES
        (1,1,1,'2026-06-01','2026-06-30',60000,1,'ACTIVE'),
        (2,2,2,'2026-06-01','2026-06-30',99000,1,'ACTIVE'),
        (3,3,1,'2026-06-01','2026-06-30',60000,0,'ACTIVE')`,
    );
    await conn.query(
      `INSERT INTO daily_menus (id, menu_date, meal, dishes) VALUES
        (1,'2026-06-05','LUNCH','红烧鸡腿、清炒时蔬、紫菜蛋汤、米饭'),
        (2,'2026-06-05','DINNER','番茄牛腩、蒜蓉西兰花、米饭'),
        (3,'2026-06-06','LUNCH','糖醋里脊、麻婆豆腐、冬瓜汤、米饭')`,
    );
    await conn.query(
      `INSERT INTO attendances (id, student_id, attend_date, meal, status, picked_up_by, remark, billed) VALUES
        (1,1,'2026-06-05','LUNCH','PRESENT','','正常用餐',0),
        (2,2,'2026-06-05','LUNCH','PRESENT','','正常用餐',0),
        (3,3,'2026-06-05','LUNCH','LEAVE','','家长提前请假',0)`,
    );
    await conn.query(
      `INSERT INTO meal_accounts (id, student_id, balance_cents) VALUES
        (1,1,60000),
        (2,2,99000),
        (3,3,0)`,
    );
  } finally {
    conn.release();
  }
}

/* ----------------------------- 学生 ----------------------------- */

async function listStudents({ status, school } = {}) {
  const where = [];
  const params = [];
  if (status !== undefined) { where.push('status = ?'); params.push(status); }
  if (school !== undefined) { where.push('school = ?'); params.push(school); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM students ${clause} ORDER BY id`, params);
  return rows.map(mapStudent);
}

async function getStudent(id) {
  const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
  return mapStudent(rows[0]);
}

async function findStudentByNo(studentNo) {
  const [rows] = await pool.query('SELECT * FROM students WHERE student_no = ?', [studentNo]);
  return mapStudent(rows[0]);
}

async function createStudent(s) {
  const [r] = await pool.query(
    `INSERT INTO students (student_no, name, grade, school, guardian_name, guardian_phone, allergies, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.studentNo, s.name, s.grade || '', s.school || '', s.guardianName || '',
     s.guardianPhone || '', s.allergies || '', s.status || 'ACTIVE'],
  );
  return getStudent(r.insertId);
}

async function updateStudent(id, patch) {
  const map = {
    name: 'name', grade: 'grade', school: 'school',
    guardianName: 'guardian_name', guardianPhone: 'guardian_phone',
    allergies: 'allergies', status: 'status',
  };
  const sets = [];
  const params = [];
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { sets.push(`${col} = ?`); params.push(patch[k]); }
  }
  if (sets.length) {
    sets.push('updated_at = CURRENT_TIMESTAMP(3)');
    params.push(id);
    await pool.query(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getStudent(id);
}

async function deleteStudent(id) {
  const [r] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

/* ----------------------------- 套餐 ----------------------------- */

async function listPlans({ activeOnly } = {}) {
  const clause = activeOnly ? 'WHERE active = 1' : '';
  const [rows] = await pool.query(`SELECT * FROM meal_plans ${clause} ORDER BY id`);
  return rows.map(mapPlan);
}

async function getPlan(id) {
  const [rows] = await pool.query('SELECT * FROM meal_plans WHERE id = ?', [id]);
  return mapPlan(rows[0]);
}

async function createPlan(p) {
  const [r] = await pool.query(
    `INSERT INTO meal_plans (name, meals, price_cents, period, description, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [p.name, p.meals || 'LUNCH', p.priceCents || 0, p.period || 'MONTHLY',
     p.description || '', p.active === false ? 0 : 1],
  );
  return getPlan(r.insertId);
}

/* ----------------------------- 报名/订餐 ----------------------------- */

async function listEnrollments({ studentId } = {}) {
  if (studentId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = ? ORDER BY id', [studentId]);
    return rows.map(mapEnrollment);
  }
  const [rows] = await pool.query('SELECT * FROM enrollments ORDER BY id');
  return rows.map(mapEnrollment);
}

async function getEnrollment(id) {
  const [rows] = await pool.query('SELECT * FROM enrollments WHERE id = ?', [id]);
  return mapEnrollment(rows[0]);
}

async function createEnrollment(e) {
  const [r] = await pool.query(
    `INSERT INTO enrollments (student_id, plan_id, start_date, end_date, amount_cents, paid, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [e.studentId, e.planId, e.startDate, e.endDate, e.amountCents, e.paid ? 1 : 0, e.status || 'ACTIVE'],
  );
  return getEnrollment(r.insertId);
}

async function markEnrollmentPaid(id) {
  await pool.query('UPDATE enrollments SET paid = 1 WHERE id = ?', [id]);
  return getEnrollment(id);
}

/* ----------------------------- 菜单 ----------------------------- */

async function listMenus({ date } = {}) {
  if (date !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM daily_menus WHERE menu_date = ? ORDER BY meal', [date]);
    return rows.map(mapMenu);
  }
  const [rows] = await pool.query('SELECT * FROM daily_menus ORDER BY menu_date DESC, meal');
  return rows.map(mapMenu);
}

async function findMenu(date, meal) {
  const [rows] = await pool.query(
    'SELECT * FROM daily_menus WHERE menu_date = ? AND meal = ?', [date, meal]);
  return mapMenu(rows[0]);
}

async function upsertMenu(m) {
  await pool.query(
    `INSERT INTO daily_menus (menu_date, meal, dishes) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE dishes = VALUES(dishes)`,
    [m.menuDate, m.meal, m.dishes || ''],
  );
  return findMenu(m.menuDate, m.meal);
}

/* ----------------------------- 出勤/签到 ----------------------------- */

async function listAttendances({ date, studentId } = {}) {
  const where = [];
  const params = [];
  if (date !== undefined) { where.push('attend_date = ?'); params.push(date); }
  if (studentId !== undefined) { where.push('student_id = ?'); params.push(studentId); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM attendances ${clause} ORDER BY attend_date DESC, id`, params);
  return rows.map(mapAttendance);
}

async function findAttendance(studentId, date, meal) {
  const [rows] = await pool.query(
    'SELECT * FROM attendances WHERE student_id = ? AND attend_date = ? AND meal = ?',
    [studentId, date, meal]);
  return mapAttendance(rows[0]);
}

async function createAttendance(a) {
  const [r] = await pool.query(
    `INSERT INTO attendances (student_id, attend_date, meal, status, picked_up_by, remark)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [a.studentId, a.attendDate, a.meal, a.status || 'PRESENT', a.pickedUpBy || '', a.remark || ''],
  );
  const [rows] = await pool.query('SELECT * FROM attendances WHERE id = ?', [r.insertId]);
  return mapAttendance(rows[0]);
}

async function updateAttendanceBilled(id, billed = true) {
  await pool.query('UPDATE attendances SET billed = ? WHERE id = ?', [billed ? 1 : 0, id]);
}

/* --------------------------- 系统配置 --------------------------- */

async function getConfig(configKey) {
  const [rows] = await pool.query('SELECT * FROM system_configs WHERE config_key = ?', [configKey]);
  return mapConfig(rows[0]);
}

async function getAllConfigs() {
  const [rows] = await pool.query('SELECT * FROM system_configs ORDER BY id');
  return rows.map(mapConfig);
}

async function setConfig(configKey, configValue, description = '') {
  await pool.query(
    `INSERT INTO system_configs (config_key, config_value, description) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description), updated_at = CURRENT_TIMESTAMP(3)`,
    [configKey, configValue, description],
  );
  return getConfig(configKey);
}

async function getConfigMap() {
  const list = await getAllConfigs();
  const map = {};
  for (const c of list) {
    map[c.configKey] = c.configValue;
  }
  return map;
}

/* --------------------------- 餐费账户 --------------------------- */

async function getMealAccountByStudent(studentId) {
  const [rows] = await pool.query('SELECT * FROM meal_accounts WHERE student_id = ?', [studentId]);
  return mapMealAccount(rows[0]);
}

async function getOrCreateMealAccount(studentId) {
  let acc = await getMealAccountByStudent(studentId);
  if (acc) return acc;
  await pool.query('INSERT IGNORE INTO meal_accounts (student_id, balance_cents) VALUES (?, 0)', [studentId]);
  return getMealAccountByStudent(studentId);
}

async function listMealAccounts() {
  const [rows] = await pool.query('SELECT * FROM meal_accounts ORDER BY id');
  return rows.map(mapMealAccount);
}

/* --------------------------- 餐费流水 --------------------------- */

async function createTransaction(tx) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM meal_accounts WHERE id = ? FOR UPDATE', [tx.accountId]);
    if (!rows.length) throw new Error('账户不存在');
    const account = rows[0];

    const newBalance = account.balance_cents + tx.amountCents;
    if (newBalance < 0) throw new Error('账户余额不足');

    await conn.query('UPDATE meal_accounts SET balance_cents = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [newBalance, tx.accountId]);

    const [r] = await conn.query(
      `INSERT INTO meal_transactions (account_id, student_id, transaction_type, amount_cents, balance_after_cents, related_type, related_id, remark, operator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tx.accountId, tx.studentId, tx.transactionType, tx.amountCents, newBalance,
        tx.relatedType || '', tx.relatedId || null, tx.remark || '', tx.operator || ''],
    );

    await conn.commit();

    const [txRows] = await pool.query('SELECT * FROM meal_transactions WHERE id = ?', [r.insertId]);
    return mapTransaction(txRows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function listTransactions({ studentId, accountId, startDate, endDate, type } = {}) {
  const where = [];
  const params = [];
  if (studentId !== undefined) { where.push('student_id = ?'); params.push(studentId); }
  if (accountId !== undefined) { where.push('account_id = ?'); params.push(accountId); }
  if (startDate !== undefined) { where.push('DATE(created_at) >= ?'); params.push(startDate); }
  if (endDate !== undefined) { where.push('DATE(created_at) <= ?'); params.push(endDate); }
  if (type !== undefined) { where.push('transaction_type = ?'); params.push(type); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM meal_transactions ${clause} ORDER BY id DESC`, params);
  return rows.map(mapTransaction);
}

/* --------------------------- 退补餐记录 --------------------------- */

async function createAdjustment(adj) {
  const [r] = await pool.query(
    `INSERT INTO meal_adjustments (enrollment_id, student_id, adjust_date, meal, adjust_type, unit_price_cents, quantity, amount_cents, attendance_id, transaction_id, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [adj.enrollmentId, adj.studentId, adj.adjustDate, adj.meal, adj.adjustType,
      adj.unitPriceCents, adj.quantity || 1, adj.amountCents, adj.attendanceId || null,
      adj.transactionId || null, adj.remark || ''],
  );
  const [rows] = await pool.query('SELECT * FROM meal_adjustments WHERE id = ?', [r.insertId]);
  return mapAdjustment(rows[0]);
}

async function findAdjustment(enrollmentId, adjustDate, meal, adjustType) {
  const [rows] = await pool.query(
    'SELECT * FROM meal_adjustments WHERE enrollment_id = ? AND adjust_date = ? AND meal = ? AND adjust_type = ?',
    [enrollmentId, adjustDate, meal, adjustType],
  );
  return mapAdjustment(rows[0]);
}

async function listAdjustments({ studentId, enrollmentId, startDate, endDate, adjustType } = {}) {
  const where = [];
  const params = [];
  if (studentId !== undefined) { where.push('student_id = ?'); params.push(studentId); }
  if (enrollmentId !== undefined) { where.push('enrollment_id = ?'); params.push(enrollmentId); }
  if (startDate !== undefined) { where.push('adjust_date >= ?'); params.push(startDate); }
  if (endDate !== undefined) { where.push('adjust_date <= ?'); params.push(endDate); }
  if (adjustType !== undefined) { where.push('adjust_type = ?'); params.push(adjustType); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM meal_adjustments ${clause} ORDER BY id DESC`, params);
  return rows.map(mapAdjustment);
}

/* --------------------------- 账单 --------------------------- */

async function getBill(enrollmentId, billMonth) {
  const [rows] = await pool.query('SELECT * FROM bills WHERE enrollment_id = ? AND bill_month = ?',
    [enrollmentId, billMonth]);
  return mapBill(rows[0]);
}

async function listBills({ studentId, enrollmentId, billMonth, status } = {}) {
  const where = [];
  const params = [];
  if (studentId !== undefined) { where.push('student_id = ?'); params.push(studentId); }
  if (enrollmentId !== undefined) { where.push('enrollment_id = ?'); params.push(enrollmentId); }
  if (billMonth !== undefined) { where.push('bill_month = ?'); params.push(billMonth); }
  if (status !== undefined) { where.push('status = ?'); params.push(status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM bills ${clause} ORDER BY id DESC`, params);
  return rows.map(mapBill);
}

async function upsertBill(bill) {
  await pool.query(
    `INSERT INTO bills (student_id, enrollment_id, bill_month, planned_amount_cents, refund_amount_cents,
      supplement_amount_cents, actual_amount_cents, paid_amount_cents, balance_cents, status, remark, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       planned_amount_cents = VALUES(planned_amount_cents),
       refund_amount_cents = VALUES(refund_amount_cents),
       supplement_amount_cents = VALUES(supplement_amount_cents),
       actual_amount_cents = VALUES(actual_amount_cents),
       paid_amount_cents = VALUES(paid_amount_cents),
       balance_cents = VALUES(balance_cents),
       status = VALUES(status),
       remark = VALUES(remark),
       generated_at = CURRENT_TIMESTAMP(3)`,
    [bill.studentId, bill.enrollmentId, bill.billMonth, bill.plannedAmountCents || 0,
      bill.refundAmountCents || 0, bill.supplementAmountCents || 0, bill.actualAmountCents || 0,
      bill.paidAmountCents || 0, bill.balanceCents || 0, bill.status || 'DRAFT', bill.remark || ''],
  );
  return getBill(bill.enrollmentId, bill.billMonth);
}

async function finalizeBill(id) {
  await pool.query('UPDATE bills SET status = ?, finalized_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    ['FINALIZED', id]);
  const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  return mapBill(rows[0]);
}

/* --------------------------- 核心计费逻辑 --------------------------- */

async function findActiveEnrollment(studentId, date) {
  const [rows] = await pool.query(
    `SELECT e.* FROM enrollments e
     WHERE e.student_id = ? AND e.status = 'ACTIVE'
       AND e.start_date <= ? AND e.end_date >= ?
     ORDER BY e.id LIMIT 1`,
    [studentId, date, date],
  );
  return rows.length ? mapEnrollment(rows[0]) : null;
}

async function processAttendanceBilling(attendanceId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [attRows] = await conn.query('SELECT * FROM attendances WHERE id = ? FOR UPDATE', [attendanceId]);
    if (!attRows.length) {
      await conn.rollback();
      return { success: false, error: '出勤记录不存在' };
    }
    const att = attRows[0];
    if (att.billed) {
      await conn.commit();
      return { success: true, skipped: true, reason: '已计费' };
    }

    const enrollment = await findActiveEnrollment(att.student_id, att.attend_date);
    if (!enrollment) {
      await conn.rollback();
      return { success: false, error: '未找到生效中的报名' };
    }

    const [planRows] = await conn.query('SELECT * FROM meal_plans WHERE id = ?', [enrollment.planId]);
    if (!planRows.length) {
      await conn.rollback();
      return { success: false, error: '套餐不存在' };
    }
    const plan = mapPlan(planRows[0]);

    const prices = billing.calculateMealUnitPrices(enrollment, plan);
    const unitPrice = billing.getMealUnitPrice(prices, att.attend_date, att.meal);
    if (unitPrice <= 0) {
      await conn.query('UPDATE attendances SET billed = 1 WHERE id = ?', [att.id]);
      await conn.commit();
      return { success: true, skipped: true, reason: '非工作日/非套餐餐次，无需计费' };
    }

    const configMap = await getConfigMap();
    const account = await getOrCreateMealAccount(att.student_id);

    let adjustType = null;
    let txType = null;
    let amount = 0;
    let remark = '';

    if (att.status === 'PRESENT') {
      adjustType = 'DEDUCT_MEAL';
      txType = 'DEDUCT';
      amount = -unitPrice;
      remark = `${att.attend_date} ${att.meal} 出勤核销`;
    } else if (att.status === 'LEAVE') {
      const leaveEnabled = configMap.leave_refund_enabled === '1';
      const deadlineHour = Number(configMap.leave_deadline_hour) || 9;
      const isBefore = billing.isBeforeDeadline(att.attend_date, deadlineHour, new Date(att.checked_at));
      if (leaveEnabled && isBefore) {
        adjustType = 'REFUND_LEAVE';
        txType = 'REFUND';
        amount = unitPrice;
        remark = `${att.attend_date} ${att.meal} 提前请假退费`;
      } else {
        adjustType = 'REFUND_LEAVE_LATE';
        amount = 0;
        remark = `${att.attend_date} ${att.meal} 请假但超过截止时间，不予退费`;
      }
    } else if (att.status === 'ABSENT') {
      const strategy = configMap.absent_refund_strategy || 'NONE';
      const refundAmt = billing.calculateAbsentRefund(unitPrice, strategy);
      if (refundAmt > 0) {
        adjustType = 'REFUND_ABSENT';
        txType = 'REFUND';
        amount = refundAmt;
        remark = `${att.attend_date} ${att.meal} 旷餐退费(${strategy})`;
      } else {
        adjustType = 'REFUND_ABSENT_NONE';
        amount = 0;
        remark = `${att.attend_date} ${att.meal} 旷餐不予退费`;
      }
    } else if (att.status === 'EXTRA') {
      const extraPrice = Number(configMap.extra_meal_price_cents) || 3000;
      adjustType = 'SUPPLEMENT_EXTRA';
      txType = 'DEDUCT';
      amount = -extraPrice;
      remark = `${att.attend_date} ${att.meal} 临时加餐补收`;
    }

    let txId = null;
    if (txType && amount !== 0) {
      const newBalance = account.balanceCents + amount;
      if (newBalance < 0) {
        await conn.rollback();
        return { success: false, error: '账户余额不足' };
      }

      await conn.query('UPDATE meal_accounts SET balance_cents = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [newBalance, account.id]);

      const [txR] = await conn.query(
        `INSERT INTO meal_transactions (account_id, student_id, transaction_type, amount_cents, balance_after_cents, related_type, related_id, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [account.id, att.student_id, txType, amount, newBalance, 'ATTENDANCE', att.id, remark],
      );
      txId = txR.insertId;
    }

    const adjAmount = amount > 0 ? amount : -amount;
    const priceForAdj = att.status === 'EXTRA' ? (Number(configMap.extra_meal_price_cents) || 3000) : unitPrice;
    await conn.query(
      `INSERT INTO meal_adjustments (enrollment_id, student_id, adjust_date, meal, adjust_type, unit_price_cents, quantity, amount_cents, attendance_id, transaction_id, remark)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [enrollment.id, att.student_id, att.attend_date, att.meal, adjustType,
        priceForAdj, adjAmount, att.id, txId, remark],
    );

    await conn.query('UPDATE attendances SET billed = 1 WHERE id = ?', [att.id]);

    await conn.commit();

    return { success: true, adjustment: { type: adjustType, amountCents: adjAmount, remark } };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function generateBill(enrollmentId, billMonth) {
  const enrollment = await getEnrollment(enrollmentId);
  if (!enrollment) throw new Error('报名不存在');

  const yearMonth = billMonth.split('-');
  const monthStart = `${billMonth}-01`;
  const nextMonth = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEndDate = new Date(nextMonth.getTime() - 86400000);
  const monthEnd = billing.formatDate(monthEndDate);

  const adjStart = enrollment.startDate > monthStart ? enrollment.startDate : monthStart;
  const adjEnd = enrollment.endDate < monthEnd ? enrollment.endDate : monthEnd;

  if (adjStart > adjEnd) {
    return null;
  }

  const adjustments = await listAdjustments({
    enrollmentId,
    startDate: adjStart,
    endDate: adjEnd,
  });

  let refundAmount = 0;
  let supplementAmount = 0;

  for (const adj of adjustments) {
    if (adj.adjustType.startsWith('REFUND_')) {
      refundAmount += adj.amountCents;
    } else if (adj.adjustType.startsWith('SUPPLEMENT_')) {
      supplementAmount += adj.amountCents;
    }
  }

  const plan = await getPlan(enrollment.planId);
  const prices = billing.calculateMealUnitPrices(enrollment, plan);

  let plannedAmount = 0;
  const start = billing.parseDate(adjStart);
  const end = billing.parseDate(adjEnd);
  const cur = new Date(start);
  const meals = plan.meals.split(',').filter(Boolean);
  while (cur <= end) {
    const dateStr = billing.formatDate(cur);
    for (const meal of meals) {
      plannedAmount += billing.getMealUnitPrice(prices, dateStr, meal);
    }
    cur.setDate(cur.getDate() + 1);
  }

  const actualAmount = plannedAmount - refundAmount + supplementAmount;

  const bill = await upsertBill({
    studentId: enrollment.studentId,
    enrollmentId,
    billMonth,
    plannedAmountCents: plannedAmount,
    refundAmountCents: refundAmount,
    supplementAmountCents: supplementAmount,
    actualAmountCents: actualAmount,
    paidAmountCents: enrollment.paid ? enrollment.amountCents : 0,
    balanceCents: 0,
    status: 'DRAFT',
    remark: `计费周期: ${adjStart} ~ ${adjEnd}`,
  });

  return bill;
}

async function rechargeAccount(studentId, amountCents, relatedType = '', relatedId = null, remark = '', operator = '') {
  const account = await getOrCreateMealAccount(studentId);
  return createTransaction({
    accountId: account.id,
    studentId,
    transactionType: 'RECHARGE',
    amountCents,
    relatedType,
    relatedId,
    remark: remark || '账户充值',
    operator,
  });
}

module.exports = {
  seed,
  listStudents, getStudent, findStudentByNo, createStudent, updateStudent, deleteStudent,
  listPlans, getPlan, createPlan,
  listEnrollments, getEnrollment, createEnrollment, markEnrollmentPaid,
  listMenus, findMenu, upsertMenu,
  listAttendances, findAttendance, createAttendance, updateAttendanceBilled,
  getConfig, getAllConfigs, setConfig, getConfigMap,
  getMealAccountByStudent, getOrCreateMealAccount, listMealAccounts,
  createTransaction, listTransactions,
  createAdjustment, findAdjustment, listAdjustments,
  getBill, listBills, upsertBill, finalizeBill,
  findActiveEnrollment, processAttendanceBilling, generateBill, rechargeAccount,
};
