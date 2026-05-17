const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// Helper: query all rows
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((c, i) => row[c] = vals[i]);
  }
  stmt.free();
  return row;
}

// GET /api/sessions
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const sessions = queryAll(db, `
    SELECT s.*,
           COUNT(f.id) as file_count,
           COALESCE(SUM(f.file_size), 0) as total_size
    FROM sessions s
    LEFT JOIN files f ON s.id = f.session_id
    GROUP BY s.id
    ORDER BY s.session_number ASC
  `);
  res.json({ sessions });
});

// GET /api/sessions/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  const session = queryOne(db, 'SELECT * FROM sessions WHERE id = ?', [Number(req.params.id)]);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const files = queryAll(db, `
    SELECT f.*, u.username as uploader_name
    FROM files f
    JOIN users u ON f.uploaded_by = u.id
    WHERE f.session_id = ?
    ORDER BY f.uploaded_at DESC
  `, [Number(req.params.id)]);

  res.json({ session, files });
});

module.exports = router;
