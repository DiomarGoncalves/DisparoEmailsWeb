const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { expressjwt: jwtMiddleware } = require('express-jwt'); // Middleware para validar JWT
const authRoutes = require('./routes/auth'); // Rotas de autenticação
const path = require('path'); // Importação corrigida do módulo 'path'
const fs = require('fs'); // Certifique-se de que 'fs' também está importado
const multer = require("multer");
const xlsx = require("xlsx");
const upload = multer({ dest: "uploads/" }); // Diretório temporário para uploads

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
        nome TEXT,
        email TEXT NOT NULL,
        remetente_id INTEGER
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
  db.all(`SELECT id, email, smtp, porta FROM remetente`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar remetentes:', err.message);
      return res.status(500).json({ success: false, error: "Erro ao buscar remetentes." });
    }
    res.json({ success: true, remetentes: rows });
  });
});

// Rota para salvar ou editar remetente
app.post('/remetentes', (req, res) => {
  const { id, email, senha, smtp, porta } = req.body;

  if (id) {
    // Editar remetente existente
    db.run(
      `UPDATE remetente SET email = ?, senha = ?, smtp = ?, porta = ? WHERE id = ?`,
      [email, senha, smtp, porta, id],
      function (err) {
        if (err) {
          console.error('Erro ao editar remetente:', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: "Remetente não encontrado." });
        }
        res.json({ success: true });
      }
    );
  } else {
    // Inserir novo remetente
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
  }
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

// Rota para buscar clientes com base no remetente
app.get('/clientes', (req, res) => {
  const { remetente_id } = req.query;
  const query = remetente_id
    ? `SELECT id, nome, email FROM clientes WHERE remetente_id = ?`
    : `SELECT id, nome, email FROM clientes`;

  db.all(query, remetente_id ? [remetente_id] : [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar clientes:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, clientes: rows });
  });
});

// Rota para salvar ou editar cliente
app.post('/clientes', (req, res) => {
  const { id, nome, email, remetente_id } = req.body;

  if (id) {
    // Editar cliente existente
    db.run(
      `UPDATE clientes SET nome = ?, email = ?, remetente_id = ? WHERE id = ?`,
      [nome, email, remetente_id, id],
      function (err) {
        if (err) {
          console.error('Erro ao editar cliente:', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: "Cliente não encontrado." });
        }
        res.json({ success: true });
      }
    );
  } else {
    // Inserir novo cliente
    db.run(
      `INSERT INTO clientes (nome, email, remetente_id) VALUES (?, ?, ?)`,
      [nome, email, remetente_id],
      function (err) {
        if (err) {
          console.error('Erro ao salvar cliente:', err.message);
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  }
});

// Rota para exportar clientes
app.get("/clientes/exportar", (req, res) => {
  db.all(`SELECT nome, email FROM clientes`, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar clientes para exportação:", err.message);
      return res.status(500).json({ success: false, error: "Erro ao buscar clientes." });
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Clientes");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=clientes.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  });
});

// Rota para importar clientes
app.post("/clientes/importar", upload.single("file"), (req, res) => {
  const remetenteId = req.body.remetente_id;

  if (!req.file) {
    return res.status(400).json({ success: false, error: "Nenhum arquivo enviado." });
  }

  if (!remetenteId) {
    return res.status(400).json({ success: false, error: "Remetente não selecionado." });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const insertPromises = data.map((cliente) => {
      return new Promise((resolve, reject) => {
        if (!cliente.email) {
          return reject(new Error("O campo 'email' é obrigatório."));
        }

        db.run(
          `INSERT INTO clientes (nome, email, remetente_id) VALUES (?, ?, ?)`,
          [cliente.nome || null, cliente.email, remetenteId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        res.json({ success: true });
      })
      .catch((err) => {
        console.error("Erro ao importar clientes:", err.message);
        res.status(400).json({ success: false, error: err.message });
      })
      .finally(() => {
        fs.unlinkSync(req.file.path); // Remove o arquivo temporário
      });
  } catch (error) {
    console.error("Erro ao processar arquivo de importação:", error.message);
    res.status(500).json({ success: false, error: "Erro ao processar arquivo." });
  }
});

// Rota para buscar um cliente específico
app.get('/clientes/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT id, nome, email, remetente_id FROM clientes WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar cliente:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, error: "Cliente não encontrado." });
    }
    res.json({ success: true, cliente: row });
  });
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
  db.all(`SELECT id, nome, assunto, corpo, remetente_id FROM templates`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar templates:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, templates: rows });
  });
});

// Rota para salvar template
app.post('/templates', (req, res) => {
  const { nome, assunto, corpo, remetente_id, clientes } = req.body;

  if (!remetente_id) {
    return res.status(400).json({ success: false, error: "Remetente é obrigatório para o template." });
  }

  db.run(
    `INSERT INTO templates (nome, assunto, corpo, remetente_id) VALUES (?, ?, ?, ?)`,
    [nome, assunto, corpo, remetente_id],
    function (err) {
      if (err) {
        console.error('Erro ao salvar template:', err.message);
        return res.status(500).json({ success: false, error: err.message });
      }
      const templateId = this.lastID;

      // Salvar os clientes associados ao template
      const insertClientes = clientes.map((clienteEmail) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO template_emails (template_id, email) VALUES (?, ?)`,
            [templateId, clienteEmail],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      });

      Promise.all(insertClientes)
        .then(() => res.json({ success: true, id: templateId }))
        .catch((emailErr) => {
          console.error('Erro ao salvar clientes do template:', emailErr.message);
          res.status(500).json({ success: false, error: emailErr.message });
        });
    }
  );
});

// Rota para buscar clientes associados a um template
app.get('/templates/:id/clientes', (req, res) => {
  const { id } = req.params;
  db.all(`SELECT email FROM template_emails WHERE template_id = ?`, [id], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar clientes do template:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, clientes: rows.map((row) => row.email) });
  });
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
        console.error('Erro ao excluir clientes associados ao template:', emailErr.message);
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

// Rota para enviar mensagens
app.post("/mensagens/enviar", async (req, res) => {
  const { remetente_id, assunto, corpo, destinatarios } = req.body;

  if (!remetente_id || !assunto || !corpo || !destinatarios || destinatarios.length === 0) {
    return res.status(400).json({ success: false, error: "Dados incompletos para envio de mensagem." });
  }

  try {
    // Buscar remetente no banco de dados
    db.get(`SELECT email, senha, smtp, porta FROM remetente WHERE id = ?`, [remetente_id], async (err, remetente) => {
      if (err || !remetente) {
        console.error("Erro ao buscar remetente:", err?.message || "Remetente não encontrado.");
        return res.status(500).json({ success: false, error: "Erro ao buscar remetente." });
      }

      // Configuração do transporte SMTP
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: remetente.smtp,
        port: remetente.porta,
        secure: remetente.porta === 465, // SSL/TLS
        auth: {
          user: remetente.email,
          pass: remetente.senha,
        },
      });

      // Se "todos os clientes" for selecionado, buscar todos os e-mails no banco
      let emailsParaEnviar = destinatarios;
      if (destinatarios.includes("all")) {
        const clientes = await new Promise((resolve, reject) => {
          db.all(`SELECT email FROM clientes`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map((cliente) => cliente.email));
          });
        });
        emailsParaEnviar = clientes;
      }

      // Enviar e-mails para os destinatários
      const envioPromises = emailsParaEnviar.map((destinatario) => {
        return transporter.sendMail({
          from: remetente.email,
          to: destinatario,
          subject: assunto,
          html: corpo,
        });
      });

      try {
        await Promise.all(envioPromises);
        res.json({ success: true });
      } catch (emailError) {
        console.error("Erro ao enviar mensagens:", emailError.message);
        res.status(500).json({ success: false, error: "Erro ao enviar mensagens." });
      }
    });
  } catch (error) {
    console.error("Erro ao processar envio de mensagens:", error.message);
    res.status(500).json({ success: false, error: "Erro ao processar envio de mensagens." });
  }
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

// Alterar a tabela clientes para que o campo nome não seja obrigatório
db.serialize(() => {
  db.run(`ALTER TABLE clientes RENAME TO clientes_old`, (err) => {
    if (err && !err.message.includes("already exists")) {
      console.error("Erro ao renomear tabela clientes:", err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT NOT NULL,
      remetente_id INTEGER
    )
  `);

  db.run(`
    INSERT INTO clientes (id, nome, email, remetente_id)
    SELECT id, nome, email, remetente_id FROM clientes_old
  `);

  db.run(`DROP TABLE clientes_old`, (err) => {
    if (err) {
      console.error("Erro ao remover tabela antiga clientes:", err.message);
    }
  });
});
