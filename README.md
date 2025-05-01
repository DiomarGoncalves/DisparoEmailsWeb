# DisparoEmails

Um sistema simples e eficiente para o envio de e-mails em massa, desenvolvido com tecnologias modernas para facilitar a comunicação com seus clientes.

---

## 🚀 Funcionalidades

- **Configuração de E-mail**: Configure facilmente o remetente com servidor SMTP, porta e credenciais.
- **Cadastro de Clientes**: Adicione, edite e exclua clientes diretamente no sistema.
- **Envio de Mensagens**: Utilize um editor WYSIWYG (Quill) para criar mensagens personalizadas com formatação rica.
- **Importação e Exportação**: Importe e exporte listas de clientes em formato Excel.
- **Modelo de Mensagens**: Carregue modelos de mensagens do Outlook para reutilização.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML, TailwindCSS, Quill.js
- **Backend**: Electron.js
- **Outras Dependências**:
  - `electron-forge` para empacotamento e distribuição.
  - `xlsx` para manipulação de planilhas Excel.

---

## 📦 Instalação

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/DiomarGoncalves/DisparoEmails.git
   cd DisparoEmails
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Inicie o sistema**:
   ```bash
   npm start
   ```

---

## 🖥️ Uso

### Configuração de E-mail
1. Acesse a aba **Configurações**.
2. Preencha os campos de e-mail, senha, servidor SMTP e porta.
3. Clique em **Salvar**.

### Cadastro de Clientes
1. Acesse a aba **Clientes**.
2. Adicione clientes manualmente ou importe uma planilha Excel.
3. Exporte a lista de clientes, se necessário.

### Envio de Mensagens
1. Acesse a aba **Mensagens**.
2. Selecione os destinatários e preencha o assunto.
3. Crie a mensagem no editor Quill e anexe arquivos, se necessário.
4. Clique em **Enviar E-mail**.

---

## 📂 Estrutura do Projeto

```
DisparoEmails/
├── frontend/                # Código do frontend
│   ├── index.html           # Interface principal
│   ├── script.js            # Lógica do frontend
│   └── styles.css           # Estilos adicionais (se necessário)
├── main.js                  # Código principal do Electron
├── package.json             # Configurações do projeto
├── LICENSE                  # Licença do projeto
└── README.md                # Documentação do projeto
```

---

## 📥 Download

Baixe a versão mais recente do sistema diretamente [aqui](https://github.com/DiomarGoncalves/DisparoEmails/releases/latest).

### Caminho do Executável
Após compilar o projeto, o executável estará disponível no seguinte caminho:
```
Output\Disparador de emails.exe
```

---

## 📝 Licença

Este projeto está licenciado sob a **Licença Personalizada**. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

## 🤝 Contribuições

Contribuições são bem-vindas! Siga os passos abaixo para contribuir:

1. Faça um fork do repositório.
2. Crie uma branch para sua feature:
   ```bash
   git checkout -b minha-feature
   ```
3. Commit suas alterações:
   ```bash
   git commit -m "Adiciona minha feature"
   ```
4. Envie para o repositório remoto:
   ```bash
   git push origin minha-feature
   ```
5. Abra um Pull Request.

---

## 📧 Contato

Desenvolvido por **Diomar Goncalves**. Para dúvidas ou sugestões, entre em contato pelo e-mail: **diomarbr4@gmail.com**.
