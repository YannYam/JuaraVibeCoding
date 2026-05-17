const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB, saveDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

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

// POST /api/sessions/:id/files — Moderator only
router.post(
  '/sessions/:id/files',
  authMiddleware,
  requireRole('moderator'),
  upload.array('files', 10),
  async (req, res) => {
    const db = await getDB();
    const sessionId = Number(req.params.id);

    const session = queryOne(db, 'SELECT id FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const uploaded = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
      db.run(
        `INSERT INTO files (session_id, original_name, stored_name, file_type, file_size, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, file.originalname, file.filename, ext, file.size, req.user.id]
      );
      // Get last inserted id
      const lastId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      uploaded.push({
        id: lastId,
        original_name: file.originalname,
        file_type: ext,
        file_size: file.size
      });
    }
    saveDB();
    res.json({ message: `${uploaded.length} file(s) uploaded`, files: uploaded });
  }
);

// GET /api/files/:id/download
router.get('/files/:id/download', authMiddleware, async (req, res) => {
  const db = await getDB();
  const file = queryOne(db, 'SELECT * FROM files WHERE id = ?', [Number(req.params.id)]);

  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(uploadsDir, file.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  res.download(filePath, file.original_name);
});

// DELETE /api/files/:id — Moderator only
router.delete('/files/:id', authMiddleware, requireRole('moderator'), async (req, res) => {
  const db = await getDB();
  const file = queryOne(db, 'SELECT * FROM files WHERE id = ?', [Number(req.params.id)]);

  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(uploadsDir, file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.run('DELETE FROM files WHERE id = ?', [Number(req.params.id)]);
  saveDB();
  res.json({ message: 'File deleted' });
});

module.exports = router;
