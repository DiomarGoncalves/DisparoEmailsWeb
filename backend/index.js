const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { expressjwt: jwtMiddleware } = require('express-jwt'); // Middleware para validar JWT
const authRoutes = require('./routes/auth'); // Rotas de autenticação
const path = require('path'); // Importação corrigida do módulo 'path'
const fs = require('fs'); // Certifique-se de que 'fs' também está importado

const app = express();
const PORT = 3000;
const SECRET_KEY = "sua_chave_secreta"; // Substitua por uma chave segura

// Banco de dados SQLite
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(bodyParser.json());

// Define um diretório de cache personalizado
const cachePath = path.join(__dirname, "../cache"); // Substituí app.getPath por __dirname
if (!fs.existsSync(cachePath)) {
  fs.mkdirSync(cachePath, { recursive: true });
}

// Criação das tabelas no banco de dados
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS remetente (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        senha TEXT NOT NULL,
        smtp TEXT NOT NULL,
        porta INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assunto TEXT NOT NULL,
        corpo TEXT NOT NULL,
        anexos TEXT,
        data_envio DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Criação das tabelas adicionais no banco de dados
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      assunto TEXT NOT NULL,
      corpo TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS programacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      dia_semana TEXT NOT NULL,
      hora TEXT NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates (id)
    )
  `);

  // Criação da tabela template_emails
  db.run(`
    CREATE TABLE IF NOT EXISTS template_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates (id)
    )
  `);
});

// Adicionar coluna "ativo" na tabela de programações, se não existir
db.serialize(() => {
  db.run(`ALTER TABLE programacoes ADD COLUMN ativo INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Erro ao adicionar coluna 'ativo':", err.message);
    }
  });
});

// Adicionar coluna "remetente_id" nas tabelas relevantes
db.serialize(() => {
  db.run(`ALTER TABLE clientes ADD COLUMN remetente_id INTEGER`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Erro ao adicionar coluna 'remetente_id' em clientes:", err.message);
    }
  });

  db.run(`ALTER TABLE templates ADD COLUMN remetente_id INTEGER`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Erro ao adicionar coluna 'remetente_id' em templates:", err.message);
    }
  });

  db.run(`ALTER TABLE programacoes ADD COLUMN remetente_id INTEGER`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Erro ao adicionar coluna 'remetente_id' em programacoes:", err.message);
    }
  });
});

// Diretório para salvar os logs
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFilePath = path.join(logsDir, "app.log");

// Função para registrar logs em arquivo
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage, { encoding: "utf8" });
}

// Função para registrar logs no banco de dados
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      message TEXT NOT NULL
    )
  `);
});

function logToDatabase(message) {
  db.run(`INSERT INTO logs (message) VALUES (?)`, [message], (err) => {
    if (err) {
      console.error("Erro ao registrar log no banco de dados:", err.message);
    }
  });
}

// Criar tabela de usuários
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);
});

// Middleware para proteger rotas
const authenticateToken = jwtMiddleware({
  secret: SECRET_KEY,
  algorithms: ['HS256'],
});

// Rotas públicas
app.use('/auth', authRoutes); // Certifique-se de que as rotas de autenticação estão prefixadas com '/auth'

// Exemplo de rota protegida para verificar autenticação
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ success: true, message: "Token válido.", user: req.auth });
});

// Middleware global para capturar erros
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, error: "Token inválido ou ausente." });
  }
  console.error("Erro no servidor:", err.message);
  res.status(500).json({ success: false, error: "Erro interno do servidor." });
});

// Rota para buscar o remetente
app.get('/remetentes', (req, res) => {
  db.get(`SELECT id, email, senha, smtp, porta FROM remetente LIMIT 1`, (err, row) => {
    if (err) {
      console.error('Erro ao buscar remetente:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, remetente: row });
  });
});

// Rota para salvar o remetente
app.post('/remetentes', (req, res) => {
  const { email, senha, smtp, porta } = req.body;
  db.run(
    `INSERT INTO remetente (email, senha, smtp, porta) VALUES (?, ?, ?, ?)`,
    [email, senha, smtp, porta || 465],
    function (err) {
      if (err) {
        console.error('Erro ao salvar remetente:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Rota para excluir o remetente
app.delete('/remetentes', (req, res) => {
  db.run(`DELETE FROM remetente`, function (err) {
    if (err) {
      console.error('Erro ao excluir remetente:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// Corrigir a rota para buscar todos os remetentes
app.get('/remetentes', (req, res) => {
  db.all(`SELECT id, email, smtp, porta FROM remetente`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar remetentes:', err.message);
      return res.status(500).json({ success: false, error: "Erro ao buscar remetentes." });
    }
    res.json({ success: true, remetentes: rows });
  });
});

// Rota para buscar um remetente específico
app.get('/remetentes/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT id, email, senha, smtp, porta FROM remetente WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar remetente:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: "Remetente não encontrado." });
    }
    res.json({ success: true, remetente: row });
  });
});

// Rota para excluir um remetente específico
app.delete('/remetentes/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM remetente WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Erro ao excluir remetente:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: "Remetente não encontrado." });
    }
    res.json({ success: true });
  });
});

// Rota para buscar clientes
app.get('/clientes', (req, res) => {
  db.all(`SELECT id, nome, email FROM clientes`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar clientes:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, clientes: rows });
  });
});

// Rota para salvar cliente
app.post('/clientes', (req, res) => {
  const { nome, email } = req.body;
  db.run(
    `INSERT INTO clientes (nome, email) VALUES (?, ?)`,
    [nome, email],
    function (err) {
      if (err) {
        console.error('Erro ao salvar cliente:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Rota para excluir cliente
app.delete('/clientes/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM clientes WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Erro ao excluir cliente:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// Rota para buscar templates
app.get('/templates', (req, res) => {
  db.all(`SELECT id, nome, assunto, corpo FROM templates`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar templates:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, templates: rows });
  });
});

// Rota para salvar template
app.post('/templates', (req, res) => {
  const { nome, assunto, corpo, emails } = req.body;
  db.run(
    `INSERT INTO templates (nome, assunto, corpo) VALUES (?, ?, ?)`,
    [nome, assunto, corpo],
    function (err) {
      if (err) {
        console.error('Erro ao salvar template:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      const templateId = this.lastID;

      // Salvar os e-mails associados ao template
      const insertEmails = emails.map((email) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO template_emails (template_id, email) VALUES (?, ?)`,
            [templateId, email],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      });

      Promise.all(insertEmails)
        .then(() => res.json({ success: true, id: templateId }))
        .catch((emailErr) => {
          console.error('Erro ao salvar e-mails do template:', emailErr.message);
          res.status(500).json({ success: false, error: emailErr.message });
        });
    }
  );
});

// Rota para excluir template
app.delete('/templates/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM templates WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Erro ao excluir template:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    db.run(`DELETE FROM template_emails WHERE template_id = ?`, [id], (emailErr) => {
      if (emailErr) {
        console.error('Erro ao excluir e-mails associados ao template:', emailErr.message);
        return res.status(500).json({ success: false, error: emailErr.message });
      }
      res.json({ success: true });
    });
  });
});

// Rota para buscar programações
app.get('/programacoes', (req, res) => {
  db.all(
    `SELECT p.id, p.dia_semana, p.hora, t.nome AS template_nome
     FROM programacoes p
     JOIN templates t ON p.template_id = t.id`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar programações:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, programacoes: rows });
    }
  );
});

// Rota para salvar programação
app.post('/programacoes', (req, res) => {
  const { template_id, dia_semana, hora } = req.body;
  db.run(
    `INSERT INTO programacoes (template_id, dia_semana, hora) VALUES (?, ?, ?)`,
    [template_id, dia_semana, hora],
    function (err) {
      if (err) {
        console.error('Erro ao salvar programação:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Rota para excluir programação
app.delete('/programacoes/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM programacoes WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Erro ao excluir programação:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// Rota para alternar estado de ativação de uma programação
app.post('/programacoes/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { ativar } = req.body;
  db.run(
    `UPDATE programacoes SET ativo = ? WHERE id = ?`,
    [ativar ? 1 : 0, id],
    function (err) {
      if (err) {
        console.error('Erro ao alterar estado da programação:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    }
  );
});

// Rota para salvar remetente
app.post('/remetentes', (req, res) => {
  const { email, senha, smtp, porta } = req.body;

  db.run(
    `INSERT INTO remetente (email, senha, smtp, porta) VALUES (?, ?, ?, ?)`,

    [email, senha, smtp, porta || 465],
    function (err) {
      if (err) {
        console.error('Erro ao salvar remetente:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Rota para favicon (opcional, pode ser um arquivo real ou ignorado)
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // Retorna "No Content" para ignorar a requisição
});

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para a página inicial (protegida)
app.get('/', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota para a página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Rota para a página de cadastro
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
