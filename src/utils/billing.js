'use strict';

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function countWeekdays(startDate, endDate) {
  let count = 0;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day >= 1 && day <= 5) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function splitMealPrice(totalCents, mealCount) {
  if (mealCount <= 0) return [];
  const base = Math.floor(totalCents / mealCount);
  const remainder = totalCents - base * mealCount;
  const prices = [];
  for (let i = 0; i < mealCount; i += 1) {
    prices.push(base + (i < remainder ? 1 : 0));
  }
  return prices;
}

function calculateMealUnitPrices(enrollment, plan) {
  const meals = plan.meals.split(',').filter(Boolean);
  const mealsPerDay = meals.length;
  const weekdays = countWeekdays(enrollment.startDate, enrollment.endDate);
  const totalMeals = weekdays * mealsPerDay;
  const priceList = splitMealPrice(enrollment.amountCents, totalMeals);

  const prices = {};
  let idx = 0;
  const start = parseDate(enrollment.startDate);
  const end = parseDate(enrollment.endDate);
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day >= 1 && day <= 5) {
      const dateStr = formatDate(cur);
      prices[dateStr] = {};
      for (const meal of meals) {
        prices[dateStr][meal] = priceList[idx];
        idx += 1;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return prices;
}

function getMealUnitPrice(prices, date, meal) {
  return prices[date] && prices[date][meal] !== undefined ? prices[date][meal] : 0;
}

function isBeforeDeadline(attendDateStr, deadlineHour, now = new Date()) {
  const deadline = parseDate(attendDateStr);
  deadline.setHours(Number(deadlineHour) || 9, 0, 0, 0);
  return now < deadline;
}

function calculateAbsentRefund(unitPrice, strategy) {
  switch (strategy) {
    case 'FULL':
      return unitPrice;
    case 'HALF':
      return Math.floor(unitPrice / 2);
    case 'NONE':
    default:
      return 0;
  }
}

function getBillMonth(dateStr) {
  return dateStr.slice(0, 7);
}

module.exports = {
  parseDate,
  formatDate,
  countWeekdays,
  splitMealPrice,
  calculateMealUnitPrices,
  getMealUnitPrice,
  isBeforeDeadline,
  calculateAbsentRefund,
  getBillMonth,
};
