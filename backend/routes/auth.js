const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const router = express.Router();
const SECRET_KEY = "sua_chave_secreta"; // Substitua por uma chave segura
const db = new sqlite3.Database('./database.db');

// Rota para registrar um novo usuário
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username e senha são obrigatórios." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO usuarios (username, password) VALUES (?, ?)`,
    [username, hashedPassword],
    function (err) {
      if (err) {
        console.error('Erro ao registrar usuário:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Rota para autenticar um usuário (login)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username e senha são obrigatórios." });
  }

  db.get(`SELECT * FROM usuarios WHERE username = ?`, [username], async (err, user) => {
    if (err) {
      console.error("Erro ao buscar usuário no banco de dados:", err.message);
      return res.status(500).json({ success: false, error: "Erro interno do servidor." });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: "Credenciais inválidas." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: "Credenciais inválidas." });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ success: true, token });
  });
});

module.exports = router;
