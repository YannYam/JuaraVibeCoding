const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'classvault.db');
let db = null;

async function getDB() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  return db;
}

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initDB() {
  const db = await getDB();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      speaker_name TEXT NOT NULL,
      speaker_role TEXT,
      speaker_bio TEXT,
      speaker_avatar TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      uploaded_by INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `);

  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const count = result[0]?.values[0]?.[0] || 0;
  if (count === 0) {
    seedData(db);
  }
  saveDB();
}

function seedData(db) {
  const stmt = db.prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  );
  stmt.run(['admin', 'admin@classvault.com', bcrypt.hashSync('admin123', 10), 'moderator']);
  stmt.run(['user', 'user@classvault.com', bcrypt.hashSync('user123', 10), 'user']);
  stmt.free();

  const sessions = [
    [1, 'Introduction to Cloud Computing',
     'An in-depth overview of cloud computing paradigms including IaaS, PaaS, and SaaS. Learn about major cloud providers and real-world deployment strategies.',
     '2026-03-05', 'Dr. Sarah Chen', 'Cloud Architect, Google',
     '15+ years in distributed systems and cloud architecture. Published researcher in scalable computing.'],
    [2, 'Machine Learning in Production',
     'Bridging the gap between ML research and production systems. Topics include model serving, MLOps pipelines, monitoring, and scaling inference.',
     '2026-03-12', 'Prof. James Rivera', 'ML Lead, Microsoft Research',
     'Former Stanford professor specializing in applied machine learning. Led ML systems serving millions.'],
    [3, 'Cybersecurity Fundamentals',
     'Essential concepts in modern cybersecurity including threat modeling, vulnerability assessment, encryption, and incident response.',
     '2026-03-19', 'Aisyah Putri, CISSP', 'Security Consultant, Deloitte',
     'Certified ISSP with expertise in enterprise security architecture and ethical hacking.'],
    [4, 'Mobile App Development with Flutter',
     'Building beautiful, natively compiled applications for mobile from a single codebase using Flutter and Dart.',
     '2026-03-26', 'Budi Santoso', 'Senior Mobile Developer, Tokopedia',
     'Flutter GDE with 8+ years of mobile development. Active open-source contributor.'],
    [5, 'DevOps & CI/CD Pipelines',
     'Modern DevOps practices including continuous integration, delivery, containerization with Docker, and orchestration with Kubernetes.',
     '2026-04-02', 'Rizky Pratama', 'DevOps Engineer, Gojek',
     'Kubernetes certified engineer managing infrastructure at scale. Speaker at multiple DevOps conferences.'],
    [6, 'Data Engineering at Scale',
     'Designing robust data pipelines, data warehousing strategies, and real-time streaming architectures for modern analytics.',
     '2026-04-09', 'Dr. Mega Wulandari', 'Data Engineering Lead, Grab',
     'PhD in Computer Science with focus on big data processing. Built data platforms processing petabytes daily.'],
    [7, 'AI Ethics & Responsible Innovation',
     'Exploring ethical implications of AI including bias mitigation, transparency, privacy, and the societal impact of AI systems.',
     '2026-04-16', 'Prof. David Hartono', 'AI Ethics Researcher, ITB',
     'Leading researcher in AI governance and ethics policy. Advisor to government bodies on responsible AI.']
  ];

  const sStmt = db.prepare(
    `INSERT INTO sessions (session_number, title, description, date, speaker_name, speaker_role, speaker_bio, speaker_avatar)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
  );
  for (const s of sessions) {
    sStmt.run(s);
  }
  sStmt.free();

  console.log('Database seeded with default users and sessions');
}

module.exports = { getDB, initDB, saveDB };
