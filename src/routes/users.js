const router = require("express").Router();
const { pool } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const { validate, userUpdateSchema } = require("../middleware/validate");

// All routes require auth
router.use(authenticate);

// GET /users — admin only
router.get("/", authorize("admin"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(rows);
});

// GET /users/:id — admin only
router.get("/:id", authorize("admin"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, is_active, created_at FROM users WHERE id=$1",
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

// PATCH /users/:id — admin only (update role / status / name)
router.patch("/:id", authorize("admin"), validate(userUpdateSchema), async (req, res) => {
  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, val] of Object.entries(req.body)) {
    fields.push(`${key}=$${i++}`);
    values.push(val);
  }

  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${fields.join(",")} WHERE id=$${i} RETURNING id, name, email, role, is_active`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

// DELETE /users/:id — admin only (hard delete, protect self-deletion)
router.delete("/:id", authorize("admin"), async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }
  const { rowCount } = await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User deleted" });
});

module.exports = router;
