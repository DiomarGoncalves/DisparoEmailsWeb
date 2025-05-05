import { fetchWithAuth, showFeedback } from "./script.js";

// Carregar clientes no select com base no remetente selecionado
async function carregarClientesParaMensagens(remetenteId) {
  const selectClientes = document.getElementById("cliente-mensagem");
  selectClientes.innerHTML = '<option value="all">Selecionar Todos</option>'; // Limpa o select

  if (!remetenteId) {
    showFeedback("Selecione um remetente para carregar os clientes.", "error");
    return;
  }

  try {
    const response = await fetchWithAuth(`http://localhost:3000/clientes?remetente_id=${remetenteId}`);
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }
    const result = await response.json();

    if (result.success && Array.isArray(result.clientes)) {
      result.clientes.forEach((cliente) => {
        const option = document.createElement("option");
        option.value = cliente.email;
        option.textContent = `${cliente.nome || "Sem Nome"} - ${cliente.email}`;
        selectClientes.appendChild(option);
      });
    } else {
      console.error("Resposta inesperada da API:", result);
      throw new Error(result.error || "Erro ao carregar lista de clientes.");
    }
  } catch (error) {
    console.error("Erro ao carregar lista de clientes:", error);
    showFeedback("Erro ao carregar lista de clientes.", "error");
  }
}

// Carregar remetentes no select
async function carregarRemetentesParaMensagens() {
  const selectRemetentes = document.getElementById("remetente-mensagem");
  selectRemetentes.innerHTML = '<option value="">Selecione um remetente</option>'; // Limpa o select

  try {
    const response = await fetchWithAuth("http://localhost:3000/remetentes");
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }
    const result = await response.json();

    if (result.success && Array.isArray(result.remetentes)) {
      result.remetentes.forEach((remetente) => {
        const option = document.createElement("option");
        option.value = remetente.id;
        option.textContent = remetente.email;
        selectRemetentes.appendChild(option);
      });

      // Carregar clientes do primeiro remetente automaticamente
      if (result.remetentes.length > 0) {
        carregarClientesParaMensagens(result.remetentes[0].id);
      }
    } else {
      console.error("Resposta inesperada da API:", result);
      throw new Error(result.error || "Erro ao carregar lista de remetentes.");
    }
  } catch (error) {
    console.error("Erro ao carregar lista de remetentes:", error);
    showFeedback("Erro ao carregar lista de remetentes.", "error");
  }
}

// Atualizar clientes ao mudar o remetente
document.getElementById("remetente-mensagem").addEventListener("change", (e) => {
  const remetenteId = e.target.value;
  carregarClientesParaMensagens(remetenteId);
});

// Enviar mensagem
document.getElementById("form-mensagem").addEventListener("submit", async (e) => {
  e.preventDefault();

  const remetenteId = document.getElementById("remetente-mensagem").value;
  const assunto = document.getElementById("assunto-mensagem").value;
  const corpo = document.querySelector("#editor-container .ql-editor").innerHTML;
  const clientesSelecionados = Array.from(
    document.getElementById("cliente-mensagem").selectedOptions
  ).map((option) => option.value);

  if (!remetenteId) {
    showFeedback("Selecione um remetente.", "error");
    return;
  }

  if (clientesSelecionados.length === 0) {
    showFeedback("Selecione pelo menos um cliente.", "error");
    return;
  }

  const mensagem = {
    remetente_id: remetenteId,
    assunto,
    corpo,
    destinatarios: clientesSelecionados,
  };

  try {
    const response = await fetchWithAuth("http://localhost:3000/mensagens/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mensagem),
    });

    const result = await response.json();

    if (result.success) {
      showFeedback("Mensagem enviada com sucesso!", "success");
      document.getElementById("form-mensagem").reset(); // Limpa o formulário
    } else {
      showFeedback("Erro ao enviar mensagem: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    showFeedback("Erro ao enviar mensagem.", "error");
  }
});

// Salvar template
document.getElementById("btn-salvar-template").addEventListener("click", async () => {
  const nome = document.getElementById("nome-template").value;
  const assunto = document.getElementById("assunto-mensagem").value;
  const corpo = document.querySelector("#editor-container .ql-editor").innerHTML;
  const remetenteId = document.getElementById("remetente-mensagem").value;
  const clientesSelecionados = Array.from(
    document.getElementById("cliente-mensagem").selectedOptions
  ).map((option) => option.value);

  if (!remetenteId) {
    showFeedback("Selecione um remetente para o template.", "error");
    return;
  }

  if (clientesSelecionados.length === 0) {
    showFeedback("Selecione pelo menos um cliente para o template.", "error");
    return;
  }

  const template = { nome, assunto, corpo, remetente_id: remetenteId, clientes: clientesSelecionados };

  try {
    const response = await fetchWithAuth("http://localhost:3000/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });

    const result = await response.json();

    if (result.success) {
      showFeedback("Template salvo com sucesso!", "success");
      carregarTemplates(); // Atualiza a lista de templates
      document.getElementById("form-template").reset(); // Limpa o formulário
    } else {
      showFeedback("Erro ao salvar template: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao salvar template:", error);
    showFeedback("Erro ao salvar template.", "error");
  }
});

// Carregar templates
async function carregarTemplates() {
  const listaTemplates = document.getElementById("lista-templates");
  listaTemplates.innerHTML = ""; // Limpa a lista antes de carregar

  try {
    const response = await fetchWithAuth("http://localhost:3000/templates");
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }
    const result = await response.json();

    if (result.success && Array.isArray(result.templates)) {
      result.templates.forEach((template) => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
          <div>
            <strong>${template.nome}</strong> - Assunto: ${template.assunto}
          </div>
          <div class="flex gap-2">
            <button class="carregar-template bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700" data-template-id="${template.id}">Carregar</button>
            <button class="excluir-template bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" data-template-id="${template.id}">Excluir</button>
          </div>
        `;
        listaTemplates.appendChild(li);
      });
    } else {
      console.error("Resposta inesperada da API:", result);
      throw new Error(result.error || "Erro ao carregar lista de templates.");
    }
  } catch (error) {
    console.error("Erro ao carregar lista de templates:", error);
    showFeedback("Erro ao carregar lista de templates.", "error");
  }
}

// Carregar template para edição
document.getElementById("lista-templates").addEventListener("click", async (e) => {
  if (e.target.classList.contains("carregar-template")) {
    const templateId = e.target.dataset.templateId;

    try {
      const response = await fetchWithAuth(`http://localhost:3000/templates/${templateId}`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
      }
      const result = await response.json();

      if (result.success && result.template) {
        const { nome, assunto, corpo, remetente_id } = result.template;
        document.getElementById("nome-template").value = nome;
        document.getElementById("assunto-mensagem").value = assunto;
        document.querySelector("#editor-container .ql-editor").innerHTML = corpo;
        document.getElementById("remetente-mensagem").value = remetente_id;

        // Carregar clientes associados ao template
        const clientesResponse = await fetchWithAuth(`http://localhost:3000/templates/${templateId}/clientes`);
        const clientesResult = await clientesResponse.json();
        if (clientesResult.success) {
          const selectClientes = document.getElementById("cliente-mensagem");
          Array.from(selectClientes.options).forEach((option) => {
            option.selected = clientesResult.clientes.includes(option.value);
          });
        }

        showFeedback("Template carregado para edição.", "success");
      } else {
        showFeedback("Erro ao carregar template para edição.", "error");
      }
    } catch (error) {
      console.error("Erro ao carregar template para edição:", error);
      showFeedback("Erro ao carregar template para edição.", "error");
    }
  } else if (e.target.classList.contains("excluir-template")) {
    const templateId = e.target.dataset.templateId;

    if (!confirm("Tem certeza que deseja excluir este template?")) {
      return;
    }

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
});

document.addEventListener("DOMContentLoaded", () => {
  carregarRemetentesParaMensagens();

  // Inicializar o editor de texto
  new Quill("#editor-container", {
    theme: "snow",
  });

  carregarTemplates();
});
