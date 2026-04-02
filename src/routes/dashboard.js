const router = require("express").Router();
const { pool } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate, authorize("analyst", "admin"));

// GET /dashboard/summary — totals + net balance
router.get("/summary", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0)  AS total_income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) AS net_balance,
      COUNT(*) AS total_records
    FROM records WHERE is_deleted=false
  `);
  res.json(rows[0]);
});

// GET /dashboard/by-category — category wise totals
router.get("/by-category", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT category, type,
      SUM(amount) AS total,
      COUNT(*) AS count
    FROM records WHERE is_deleted=false
    GROUP BY category, type
    ORDER BY total DESC
  `);
  res.json(rows);
});

// GET /dashboard/trends?period=monthly|weekly
router.get("/trends", async (req, res) => {
  const { period = "monthly" } = req.query;
  const trunc = period === "weekly" ? "week" : "month";

  const { rows } = await pool.query(`
    SELECT
      DATE_TRUNC('${trunc}', date) AS period,
      type,
      SUM(amount) AS total,
      COUNT(*) AS count
    FROM records WHERE is_deleted=false
    GROUP BY period, type
    ORDER BY period DESC
    LIMIT 24
  `);
  res.json(rows);
});

// GET /dashboard/recent — last 10 transactions
router.get("/recent", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.id, r.amount, r.type, r.category, r.date, r.notes, u.name as created_by_name
    FROM records r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.is_deleted=false
    ORDER BY r.created_at DESC
    LIMIT 10
  `);
  res.json(rows);
});

module.exports = router;
