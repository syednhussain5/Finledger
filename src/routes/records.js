const router = require("express").Router();
const { pool } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, recordSchema, recordUpdateSchema } = require("../middleware/validate");

router.use(authenticate);

// GET /records — viewer, analyst, admin
router.get("/", async (req, res) => {
  const { type, category, from, to, page = 1, limit = 20 } = req.query;

  const conditions = ["is_deleted = false"];
  const values = [];
  let i = 1;

  if (type) { conditions.push(`type=$${i++}`); values.push(type); }
  if (category) { conditions.push(`LOWER(category)=LOWER($${i++})`); values.push(category); }
  if (from) { conditions.push(`date>=$${i++}`); values.push(from); }
  if (to) { conditions.push(`date<=$${i++}`); values.push(to); }

  const offset = (Number(page) - 1) * Number(limit);
  const where = `WHERE ${conditions.join(" AND ")}`;

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT r.*, u.name as created_by_name FROM records r
       LEFT JOIN users u ON r.created_by = u.id
       ${where} ORDER BY r.date DESC LIMIT $${i++} OFFSET $${i++}`,
      [...values, Number(limit), offset]
    ),
    pool.query(`SELECT COUNT(*) FROM records ${where}`, values),
  ]);

  res.json({
    data: dataRes.rows,
    pagination: {
      total: Number(countRes.rows[0].count),
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(Number(countRes.rows[0].count) / Number(limit)),
    },
  });
});

// GET /records/:id
router.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, u.name as created_by_name FROM records r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id=$1 AND r.is_deleted=false`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Record not found" });
  res.json(rows[0]);
});

// POST /records — analyst, admin
router.post("/", authorize("analyst", "admin"), validate(recordSchema), async (req, res) => {
  const { amount, type, category, date, notes } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO records (amount, type, category, date, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [amount, type, category, date, notes || null, req.user.id]
  );
  res.status(201).json(rows[0]);
});

// PATCH /records/:id — analyst, admin
router.patch("/:id", authorize("analyst", "admin"), validate(recordUpdateSchema), async (req, res) => {
  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, val] of Object.entries(req.body)) {
    fields.push(`${key}=$${i++}`);
    values.push(val);
  }

  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

  fields.push(`updated_at=NOW()`);
  values.push(req.params.id);

  const { rows } = await pool.query(
    `UPDATE records SET ${fields.join(",")} WHERE id=$${i} AND is_deleted=false RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: "Record not found" });
  res.json(rows[0]);
});

// DELETE /records/:id — admin only (soft delete)
router.delete("/:id", authorize("admin"), async (req, res) => {
  const { rowCount } = await pool.query(
    "UPDATE records SET is_deleted=true, updated_at=NOW() WHERE id=$1 AND is_deleted=false",
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Record not found" });
  res.json({ message: "Record deleted" });
});

module.exports = router;
