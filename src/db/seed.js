require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const bcrypt = require("bcryptjs");
const { pool, initDB } = require("./index");

async function seed() {
  await initDB();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear existing data
    await client.query("DELETE FROM records");
    await client.query("DELETE FROM users");
    await client.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE records_id_seq RESTART WITH 1");

    const hash = (pw) => bcrypt.hashSync(pw, 10);

    const users = [
      { name: "Alice Admin", email: "admin@finledger.dev", password: hash("Admin@123"), role: "admin" },
      { name: "Ana Analyst", email: "analyst@finledger.dev", password: hash("Analyst@123"), role: "analyst" },
      { name: "Victor Viewer", email: "viewer@finledger.dev", password: hash("Viewer@123"), role: "viewer" },
    ];

    const ids = [];
    for (const u of users) {
      const { rows } = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
        [u.name, u.email, u.password, u.role]
      );
      ids.push(rows[0].id);
    }

    const adminId = ids[0];
    const categories = ["salary", "rent", "groceries", "utilities", "freelance", "travel", "investment", "medical"];
    const types = ["income", "expense"];

    for (let i = 0; i < 30; i++) {
      const type = types[i % 2];
      const cat = categories[i % categories.length];
      const date = new Date(2024, Math.floor(i / 3), (i % 28) + 1).toISOString().split("T")[0];
      await client.query(
        "INSERT INTO records (amount, type, category, date, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [(Math.random() * 4900 + 100).toFixed(2), type, cat, date, `Seed record #${i + 1}`, adminId]
      );
    }

    await client.query("COMMIT");
    console.log("✓ Seed complete");
    console.log("  admin@finledger.dev    / Admin@123");
    console.log("  analyst@finledger.dev  / Analyst@123");
    console.log("  viewer@finledger.dev   / Viewer@123");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => { console.error(e); process.exit(1); });
