function showTab(tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.add("hidden"));
  document.getElementById("tab-" + tabId).classList.remove("hidden");
}

// Função para exibir mensagens de feedback
function showFeedback(message, type) {
  const feedback = document.getElementById("feedback");
  feedback.textContent = message;
  feedback.className = `p-4 mb-4 text-white rounded ${
    type === "success" ? "success" : "error"
  }`;
  feedback.classList.remove("hidden");
  setTimeout(() => feedback.classList.add("hidden"), 5000);
}

// Verificar autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.error("Token ausente. Redirecionando para login.");
    window.location.href = 'login.html'; // Redireciona para a página de login se não estiver autenticado
    return;
  }

  // Verificar se o token é válido
  fetch("http://localhost:3000/protected", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Token inválido ou expirado. Redirecionando para login.");
        localStorage.removeItem('token'); // Remove o token inválido
        window.location.href = 'login.html'; // Redireciona para login
      }
    })
    .catch((error) => {
      console.error("Erro ao verificar o token:", error);
      window.location.href = 'login.html'; // Redireciona para login em caso de erro
    });
});

// Adicionar token no cabeçalho das requisições
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    console.error("Token ausente. Redirecionando para login.");
    window.location.href = 'login.html'; // Redireciona para login se o token não estiver presente
    return;
  }

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`, // Adiciona o token no cabeçalho Authorization
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error("Token inválido ou expirado. Redirecionando para login.");
        localStorage.removeItem('token'); // Remove o token inválido
        window.location.href = 'login.html'; // Redireciona para login
      }
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }

    return response;
  } catch (error) {
    console.error("Erro na requisição protegida:", error);
    throw error;
  }
}

// Salvar configurações de e-mail
document.querySelector("#tab-config form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const config = {
    email: document.getElementById("email-config").value,
    senha: document.getElementById("senha-config").value,
    smtp: document.getElementById("smtp-config").value,
    porta: parseInt(document.getElementById("porta-config").value, 10),
  };

  try {
    const response = await fetchWithAuth("http://localhost:3000/remetentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    const result = await response.json();
    if (result.success) {
      showFeedback("Configurações salvas com sucesso!", "success");
    } else {
      showFeedback("Erro ao salvar configurações: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    showFeedback("Erro ao salvar configurações.", "error");
  }
});

// Salvar cliente
document
  .querySelector("#tab-clientes form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const cliente = {
      nome: document.getElementById("nome-cliente").value,
      email: document.getElementById("email-cliente").value,
      remetente_id: document.getElementById("remetente-cliente").value,
    };

    if (!cliente.remetente_id) {
      showFeedback("Selecione um remetente para o cliente.", "error");
      return;
    }

    try {
      const response = await fetchWithAuth("http://localhost:3000/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cliente),
      });

      const result = await response.json();
      if (result.success) {
        showFeedback("Cliente salvo com sucesso!", "success");
        carregarClientes(); // recarrega lista
      } else {
        showFeedback("Erro ao salvar cliente: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      showFeedback("Erro ao salvar cliente.", "error");
    }
  });

// Substituir DOMNodeInserted por MutationObserver
document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        // Adicione aqui o código necessário para lidar com as mudanças no DOM
      }
    }
  });

  const targetNode = document.body; // Observa mudanças no <body>
  observer.observe(targetNode, { childList: true, subtree: true });
});

// Inicializa o editor Quill globalmente
let quill;

document.addEventListener("DOMContentLoaded", () => {
  carregarRemetente();
  carregarClientes();

  // Inicializa o editor Quill
  quill = new Quill("#editor-container", {
    theme: "snow", // Tema do editor
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline"],
        ["image", "link"],
        [{ list: "ordered" }, { list: "bullet" }],
      ],
    },
  });

  // Enviar mensagem
  document.querySelector("#form-mensagem").addEventListener("submit", async (e) => {
    e.preventDefault();
    const remetenteId = document.getElementById("remetente-mensagem").value;

    if (!remetenteId) {
      showFeedback("Selecione um remetente para enviar a mensagem.", "error");
      return;
    }

    const clienteMensagem = document.getElementById("cliente-mensagem");
    const assunto = document.getElementById("assunto-mensagem").value;
    const corpo = quill.root.innerHTML.trim(); // Obtém o conteúdo do editor Quill
    const anexos = document.getElementById("anexo-mensagem").files;

    // Verifica se "Selecionar Todos" foi escolhido
    let emailsSelecionados = Array.from(clienteMensagem.selectedOptions).map(
      (option) => option.value
    );

    if (emailsSelecionados.includes("all")) {
      emailsSelecionados = Array.from(clienteMensagem.options)
        .filter((option) => option.value !== "all")
        .map((option) => option.value);
    }

    emailsSelecionados = emailsSelecionados.filter((email) => email.includes("@"));

    if (emailsSelecionados.length === 0) {
      showFeedback("Nenhum destinatário válido selecionado.", "error");
      return;
    }

    if (!corpo || corpo === "<p><br></p>") {
      showFeedback("O corpo da mensagem não pode estar vazio.", "error");
      return;
    }

    try {
      const response = await ipcRenderer.invoke("enviar-mensagem", {
        emails: emailsSelecionados,
        assunto,
        corpo, // Envia o conteúdo do editor Quill
        anexos: Array.from(anexos).map((file) => file.path),
      });

      if (response.success) {
        showFeedback("E-mails enviados com sucesso!", "success");

        if (response.rejeitados && response.rejeitados.length > 0) {
          const rejeitados = response.rejeitados
            .map((rej) => `${rej.email}: ${rej.error}`)
            .join("\n");
          alert(`Os seguintes e-mails foram rejeitados:\n${rejeitados}`);
        }
      } else {
        showFeedback("Erro ao enviar e-mails: " + response.error, "error");
      }
    } catch (error) {
      console.error("Erro ao enviar e-mails:", error);
      showFeedback("Erro ao enviar e-mails.", "error");
    }
  });
});

// Preencher automaticamente as configurações de e-mail
async function carregarRemetente() {
  try {
    const response = await fetchWithAuth("http://localhost:3000/remetentes");
    const result = await response.json();

    if (result.success && result.remetente) {
      const { id, email, senha, smtp, porta } = result.remetente;
      document.getElementById("remetente-id").value = id;
      document.getElementById("email-config").value = email;
      document.getElementById("senha-config").value = senha;
      document.getElementById("smtp-config").value = smtp;
      document.getElementById("porta-config").value = porta;
    } else {
      throw new Error("Erro ao carregar remetente.");
    }
  } catch (error) {
    console.error("Erro ao carregar remetente:", error);
    showFeedback("Erro ao carregar remetente.", "error");
  }
}

// Salvar ou editar remetente
document.getElementById("form-config").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("remetente-id").value;
  const remetente = {
    id,
    email: document.getElementById("email-config").value,
    senha: document.getElementById("senha-config").value,
    smtp: document.getElementById("smtp-config").value,
    porta: parseInt(document.getElementById("porta-config").value, 10),
  };

  const channel = id ? "editar-remetente" : "salvar-config-email";
  const response = await ipcRenderer.invoke(channel, remetente);
  if (response.success) {
    showFeedback("Configuração salva com sucesso!", "success");
    carregarRemetente();
  } else {
    showFeedback("Erro ao salvar configuração.", "error");
  }
});

// Excluir remetente
document
  .getElementById("btn-excluir-remetente")
  .addEventListener("click", async () => {
    const response = await ipcRenderer.invoke("excluir-remetente");
    if (response.success) {
      showFeedback("Configuração excluída com sucesso!", "success");
      carregarRemetente();
    } else {
      showFeedback("Erro ao excluir configuração.", "error");
    }
  });

// Excluir cliente
async function excluirCliente(clienteId) {
  if (!clienteId) {
    console.error("ID do cliente não definido.");
    showFeedback("Erro: ID do cliente não encontrado.", "error");
    return;
  }

  try {
    const response = await fetchWithAuth(`http://localhost:3000/clientes/${clienteId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (result.success) {
      showFeedback("Cliente excluído com sucesso!", "success");
      carregarClientes(); // Atualiza a lista de clientes
    } else {
      showFeedback("Erro ao excluir cliente: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao excluir cliente:", error);
    showFeedback("Erro ao excluir cliente.", "error");
  }
}

// Carregar clientes
async function carregarClientes() {
  const listaClientes = document.getElementById("lista-clientes");
  const clienteMensagem = document.getElementById("cliente-mensagem");

  listaClientes.innerHTML = "";
  clienteMensagem.innerHTML = '<option value="all">Selecionar Todos</option>';

  try {
    const response = await fetchWithAuth("http://localhost:3000/clientes");
    const result = await response.json();

    if (result.success && result.clientes) {
      result.clientes.forEach((cliente) => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
          ${cliente.nome} - ${cliente.email}
          <button class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" onclick="excluirCliente(${cliente.id})">Excluir</button>
        `;
        listaClientes.appendChild(li);

        const option = document.createElement("option");
        option.value = cliente.email;
        option.textContent = cliente.email;
        clienteMensagem.appendChild(option);
      });
    } else {
      throw new Error("Erro ao carregar clientes.");
    }
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
    showFeedback("Erro ao carregar clientes.", "error");
  }
}

// Salvar template
document
  .getElementById("btn-salvar-template")
  .addEventListener("click", async (e) => {
    e.preventDefault(); // Evita o comportamento padrão do botão
    e.stopPropagation(); // Impede que o evento se propague para outros elementos

    const remetenteId = document.getElementById("remetente-mensagem").value;

    if (!remetenteId) {
      showFeedback("Selecione um remetente para salvar o template.", "error");
      return;
    }

    const nome = document.getElementById("nome-template").value;
    const assunto = document.getElementById("assunto-mensagem").value;
    const corpo = quill.root.innerHTML.trim(); // Obtém o conteúdo do editor Quill
    const clienteMensagem = document.getElementById("cliente-mensagem");
    let emailsSelecionados = Array.from(clienteMensagem.selectedOptions).map(
      (option) => option.value
    );

    // Se "Selecionar Todos" for escolhido, salva "all" no backend
    if (emailsSelecionados.includes("all")) {
      emailsSelecionados = ["all"];
    } else {
      emailsSelecionados = emailsSelecionados.filter((email) => email.includes("@"));
    }

    if (!nome || !assunto || !corpo || emailsSelecionados.length === 0) {
      showFeedback("Preencha todos os campos e selecione pelo menos um destinatário para salvar o template.", "error");
      return;
    }

    try {
      const response = await fetchWithAuth("http://localhost:3000/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          assunto,
          corpo,
          emails: emailsSelecionados,
        }),
      });
      const result = await response.json();

      if (result.success) {
        showFeedback("Template salvo com sucesso!", "success");
        carregarTemplates(); // Atualiza a lista de templates
      } else {
        showFeedback("Erro ao salvar template: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      showFeedback("Erro ao salvar template.", "error");
    }
  });

// Atualizar os eventos de clique para carregar e excluir templates
document.addEventListener("DOMContentLoaded", () => {
  // Delegação de eventos para carregar e excluir templates
  document.getElementById("lista-templates").addEventListener("click", (e) => {
    e.preventDefault(); // Evita o comportamento padrão
    e.stopPropagation(); // Impede a propagação do evento

    const target = e.target;

    if (target.classList.contains("carregar-template")) {
      const templateId = target.dataset.templateId;
      carregarTemplate(templateId);
    } else if (target.classList.contains("excluir-template")) {
      const templateId = target.dataset.templateId;
      excluirTemplate(templateId);
    }
  });
});

// Carregar um template no editor
async function carregarTemplate(templateId) {
  try {
    const response = await fetchWithAuth(`http://localhost:3000/templates/${templateId}`);
    const result = await response.json();

    if (result.success && result.template) {
      const { assunto, corpo } = result.template;
      document.getElementById("assunto-mensagem").value = assunto; // Preenche o campo de assunto
      quill.root.innerHTML = corpo; // Preenche o editor Quill com o corpo do template
      showFeedback("Template carregado com sucesso!", "success");
    } else {
      showFeedback("Template não encontrado.", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar template:", error);
    showFeedback("Erro ao carregar template.", "error");
  }
}

// Excluir template
async function excluirTemplate(templateId) {
  try {
    const response = await fetchWithAuth(`http://localhost:3000/templates/${templateId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (result.success) {
      showFeedback("Template excluído com sucesso!", "success");
      carregarTemplates(); // Atualiza a lista de templates
    } else {
      showFeedback("Erro ao excluir template: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao excluir template:", error);
    showFeedback("Erro ao excluir template.", "error");
  }
}

// Carregar templates
async function carregarTemplates() {
  const listaTemplates = document.getElementById("lista-templates");
  listaTemplates.innerHTML = "";

  try {
    const response = await fetchWithAuth("http://localhost:3000/templates");
    const result = await response.json();

    if (result.success && result.templates) {
      result.templates.forEach((template) => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
          ${template.nome}
          <div class="flex gap-2">
            <button class="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 carregar-template" data-template-id="${template.id}">Carregar</button>
            <button class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 excluir-template" data-template-id="${template.id}">Excluir</button>
          </div>
        `;
        listaTemplates.appendChild(li);
      });
    } else {
      throw new Error("Erro ao carregar templates.");
    }
  } catch (error) {
    console.error("Erro ao carregar templates:", error);
    showFeedback("Erro ao carregar templates.", "error");
  }
}

// Salvar programação
document
  .getElementById("btn-salvar-programacao")
  .addEventListener("click", async () => {
    const remetenteId = document.getElementById("remetente-programacao").value;

    if (!remetenteId) {
      showFeedback("Selecione um remetente para salvar a programação.", "error");
      return;
    }

    const templateId = document.getElementById("template-programacao").value;
    const diaSemana = document.getElementById("dia-semana-programacao").value;
    const hora = document.getElementById("hora-programacao").value;

    if (!templateId || !diaSemana || !hora) {
      showFeedback("Preencha todos os campos para salvar a programação.", "error");
      return;
    }

    try {
      const response = await fetchWithAuth("http://localhost:3000/programacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          dia_semana: diaSemana,
          hora,
        }),
      });
      const result = await response.json();

      if (result.success) {
        showFeedback("Programação salva com sucesso!", "success");
        carregarProgramacoes(); // Atualiza a lista de programações
      } else {
        showFeedback("Erro ao salvar programação: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao salvar programação:", error);
      showFeedback("Erro ao salvar programação.", "error");
    }
  });

// Carregar programações
async function carregarProgramacoes() {
  const listaProgramacoes = document.getElementById("lista-programacoes");
  listaProgramacoes.innerHTML = "";

  try {
    const response = await fetchWithAuth("http://localhost:3000/programacoes");
    const result = await response.json();

    if (result.success && result.programacoes) {
      result.programacoes.forEach((programacao) => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
          ${programacao.dia_semana} às ${programacao.hora} - Template: ${programacao.template_nome}
          <div class="flex gap-2 items-center">
            <label class="flex items-center gap-2">
              <input type="checkbox" class="toggle-programacao" data-programacao-id="${programacao.id}" ${
          programacao.ativo ? "checked" : ""
        } />
              Ativo
            </label>
            <button class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" onclick="excluirProgramacao(${programacao.id})">Excluir</button>
          </div>
        `;
        listaProgramacoes.appendChild(li);
      });
    } else {
      throw new Error("Erro ao carregar programações.");
    }
  } catch (error) {
    console.error("Erro ao carregar programações:", error);
    showFeedback("Erro ao carregar programações.", "error");
  }
}

// Excluir programação
async function excluirProgramacao(programacaoId) {
  try {
    const response = await fetchWithAuth(`http://localhost:3000/programacoes/${programacaoId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (result.success) {
      showFeedback("Programação excluída com sucesso!", "success");
      carregarProgramacoes(); // Atualiza a lista de programações
    } else {
      showFeedback("Erro ao excluir programação: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao excluir programação:", error);
    showFeedback("Erro ao excluir programação.", "error");
  }
}

// Carregar templates no dropdown de programações
async function carregarTemplatesParaProgramacao() {
  const dropdown = document.getElementById("template-programacao");
  dropdown.innerHTML = '<option value="">Selecione um template</option>';

  try {
    const response = await fetchWithAuth("http://localhost:3000/templates");
    if (!response || !response.ok) {
      throw new Error(`Erro na requisição: ${response?.statusText || "Resposta inválida"}`);
    }
    const result = await response.json();

    if (result.success) {
      result.templates.forEach((template) => {
        const option = document.createElement("option");
        option.value = template.id;
        option.textContent = template.nome;
        dropdown.appendChild(option);
      });
    } else {
      showFeedback("Erro ao carregar templates: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao carregar templates:", error);
    showFeedback("Erro ao carregar templates.", "error");
  }
}
// Importar clientes da planilha
document.getElementById("btn-importar-planilha").addEventListener("click", async () => {
  try {
    const { canceled, filePaths } = await ipcRenderer.invoke("dialog:openFile", {
      filters: [{ name: "Planilhas Excel", extensions: ["xlsx"] }],
      properties: ["openFile"],
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return;
    }

    const filePath = filePaths[0];
    const response = await ipcRenderer.invoke("importar-planilha", filePath);

    if (response.success) {
      showFeedback("Clientes importados com sucesso!", "success");
      carregarClientes(); // Atualiza a lista
    } else {
      showFeedback("Erro ao importar clientes: " + response.error, "error");
    }
  } catch (error) {
    console.error("Erro ao importar planilha:", error);
    showFeedback("Erro ao importar planilha.", "error");
  }
});

// Exportar clientes para uma planilha
document.getElementById("btn-exportar-planilha").addEventListener("click", async () => {
  try {
    const response = await ipcRenderer.invoke("exportar-planilha");

    if (response.success) {
      showFeedback("Clientes exportados com sucesso!", "success");
    } else {
      showFeedback("Erro ao exportar clientes: " + response.error, "error");
    }
  } catch (error) {
    console.error("Erro ao exportar planilha:", error);
    showFeedback("Erro ao exportar planilha.", "error");
  }
});

// Alternar estado de ativação da programação
document.addEventListener("change", async (e) => {
  if (e.target.classList.contains("toggle-programacao")) {
    const programacaoId = e.target.dataset.programacaoId;
    const ativar = e.target.checked;

    try {
      const response = await fetchWithAuth(`http://localhost:3000/programacoes/${programacaoId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativar }),
      });
      const result = await response.json();

      if (result.success) {
        showFeedback(`Programação ${ativar ? "ativada" : "desativada"} com sucesso!`, "success");
      } else {
        showFeedback(`Erro ao alterar estado da programação: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Erro ao alternar estado da programação:", error);
      showFeedback("Erro ao alternar estado da programação.", "error");
    }
  }
});

// Carregar remetentes para dropdowns
async function carregarRemetentes() {
  const dropdowns = [
    document.getElementById("remetente-cliente"),
    document.getElementById("remetente-mensagem"),
    document.getElementById("remetente-programacao"),
  ];

  dropdowns.forEach((dropdown) => (dropdown.innerHTML = '<option value="">Selecione um remetente</option>'));

  try {
    const response = await fetchWithAuth("http://localhost:3000/remetentes");
    const result = await response.json();

    if (result.success && result.remetentes) {
      result.remetentes.forEach((remetente) => {
        dropdowns.forEach((dropdown) => {
          const option = document.createElement("option");
          option.value = remetente.id;
          option.textContent = remetente.email;
          dropdown.appendChild(option);
        });
      });
    } else {
      throw new Error("Erro ao carregar remetentes.");
    }
  } catch (error) {
    console.error("Erro ao carregar remetentes:", error);
    showFeedback("Erro ao carregar remetentes.", "error");
  }
}

// Inicializar abas e carregar remetentes
document.addEventListener("DOMContentLoaded", () => {
  carregarRemetentes();
  carregarTemplates();
  carregarTemplatesParaProgramacao(); // Certifique-se de carregar os templates para o select
  carregarProgramacoes();
});

// Ignorar requisição de favicon
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname === "/favicon.ico") {
    console.log("Requisição de favicon ignorada.");
  }
});

// Carregar lista de remetentes
async function carregarListaRemetentes() {
  const listaRemetentes = document.getElementById("lista-remetentes");
  listaRemetentes.innerHTML = ""; // Limpa a lista antes de carregar

  try {
    const response = await fetchWithAuth("http://localhost:3000/remetentes");
    const result = await response.json();

    if (result.success && result.remetentes) {
      result.remetentes.forEach((remetente) => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
          <div>
            <strong>${remetente.email}</strong> - SMTP: ${remetente.smtp}, Porta: ${remetente.porta}
          </div>
          <div class="flex gap-2">
            <button class="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 editar-remetente" data-id="${remetente.id}">Editar</button>
            <button class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 excluir-remetente" data-id="${remetente.id}">Excluir</button>
          </div>
        `;
        listaRemetentes.appendChild(li);
      });
    } else {
      throw new Error("Erro ao carregar lista de remetentes.");
    }
  } catch (error) {
    console.error("Erro ao carregar lista de remetentes:", error);
    showFeedback("Erro ao carregar lista de remetentes.", "error");
  }
}

// Editar remetente
document.getElementById("lista-remetentes").addEventListener("click", async (e) => {
  if (e.target.classList.contains("editar-remetente")) {
    const remetenteId = e.target.dataset.id;

    try {
      const response = await fetchWithAuth(`http://localhost:3000/remetentes/${remetenteId}`);
      if (!response || !response.ok) {
        throw new Error(`Erro na requisição: ${response?.statusText || "Resposta inválida"}`);
      }
      const result = await response.json();

      if (result.success && result.remetente) {
        const { id, email, senha, smtp, porta } = result.remetente;
        document.getElementById("remetente-id").value = id;
        document.getElementById("email-config").value = email;
        document.getElementById("senha-config").value = senha;
        document.getElementById("smtp-config").value = smtp;
        document.getElementById("porta-config").value = porta;
        showFeedback("Remetente carregado para edição.", "success");
      } else {
        showFeedback("Erro ao carregar remetente para edição.", "error");
      }
    } catch (error) {
      console.error("Erro ao carregar remetente para edição:", error);
      showFeedback("Erro ao carregar remetente para edição.", "error");
    }
  }
});

// Excluir remetente
document.getElementById("lista-remetentes").addEventListener("click", async (e) => {
  if (e.target.classList.contains("excluir-remetente")) {
    const remetenteId = e.target.dataset.id;

    if (!confirm("Tem certeza que deseja excluir este remetente?")) {
      return;
    }

    try {
      const response = await fetchWithAuth(`http://localhost:3000/remetentes/${remetenteId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        showFeedback("Remetente excluído com sucesso!", "success");
        carregarListaRemetentes(); // Atualiza a lista
      } else {
        showFeedback("Erro ao excluir remetente: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao excluir remetente:", error);
      showFeedback("Erro ao excluir remetente.", "error");
    }
  }
});

// Atualizar lista de remetentes ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  carregarListaRemetentes();
});
