import { fetchWithAuth, showFeedback } from "./script.js";

// Funções relacionadas aos clientes

async function carregarClientes() {
  const listaClientes = document.getElementById("lista-clientes");
  listaClientes.innerHTML = ""; // Limpa a lista antes de carregar

  try {
    const response = await fetchWithAuth("http://localhost:3000/clientes");
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }
    const result = await response.json();

    if (result.success && Array.isArray(result.clientes)) {
      result.clientes.forEach((cliente) => {
        const li = document.createElement("li");
        li.className = "py-2 flex justify-between items-center";
        li.innerHTML = `
          <div>
            <strong>${cliente.nome}</strong> - ${cliente.email}
          </div>
          <div class="flex gap-2">
            <button class="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 editar-cliente" data-id="${cliente.id}">Editar</button>
            <button class="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 excluir-cliente" data-id="${cliente.id}">Excluir</button>
          </div>
        `;
        listaClientes.appendChild(li);
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

async function carregarRemetentesParaClientes() {
  const selectRemetente = document.getElementById("remetente-cliente");
  selectRemetente.innerHTML = '<option value="">Selecione um remetente</option>'; // Limpa o select

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
        selectRemetente.appendChild(option);
      });
    } else {
      console.error("Resposta inesperada da API:", result);
      throw new Error(result.error || "Erro ao carregar lista de remetentes.");
    }
  } catch (error) {
    console.error("Erro ao carregar lista de remetentes:", error);
    showFeedback("Erro ao carregar lista de remetentes.", "error");
  }
}

document.getElementById("lista-clientes").addEventListener("click", async (e) => {
  if (e.target.classList.contains("editar-cliente")) {
    const clienteId = e.target.dataset.id;

    try {
      const response = await fetchWithAuth(`http://localhost:3000/clientes/${clienteId}`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
      }
      const result = await response.json();

      if (result.success && result.cliente) {
        const { id, nome, email, remetente_id } = result.cliente;
        document.getElementById("cliente-id").value = id;
        document.getElementById("nome-cliente").value = nome;
        document.getElementById("email-cliente").value = email;
        document.getElementById("remetente-cliente").value = remetente_id || "";
        showFeedback("Cliente carregado para edição.", "success");
      } else {
        showFeedback("Erro ao carregar cliente para edição.", "error");
      }
    } catch (error) {
      console.error("Erro ao carregar cliente para edição:", error);
      showFeedback("Erro ao carregar cliente para edição.", "error");
    }
  } else if (e.target.classList.contains("excluir-cliente")) {
    const clienteId = e.target.dataset.id;

    if (!confirm("Tem certeza que deseja excluir este cliente?")) {
      return;
    }

    try {
      const response = await fetchWithAuth(`http://localhost:3000/clientes/${clienteId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        showFeedback("Cliente excluído com sucesso!", "success");
        carregarClientes(); // Atualiza a lista
      } else {
        showFeedback("Erro ao excluir cliente: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      showFeedback("Erro ao excluir cliente.", "error");
    }
  }
});

// Salvar ou editar cliente
document.querySelector("#tab-clientes form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("cliente-id").value;
  const nome = document.getElementById("nome-cliente").value;
  const email = document.getElementById("email-cliente").value;
  const remetente_id = document.getElementById("remetente-cliente").value;

  if (!remetente_id) {
    showFeedback("Selecione um remetente para o cliente.", "error");
    return;
  }

  const cliente = { id, nome, email, remetente_id };

  try {
    const response = await fetchWithAuth("http://localhost:3000/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cliente),
    });

    const result = await response.json();

    if (result.success) {
      showFeedback(id ? "Cliente editado com sucesso!" : "Cliente salvo com sucesso!", "success");
      carregarClientes(); // Atualiza a lista
      document.querySelector("#tab-clientes form").reset(); // Limpa o formulário
    } else {
      showFeedback("Erro ao salvar cliente: " + result.error, "error");
    }
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
    showFeedback("Erro ao salvar cliente.", "error");
  }
});

// Exportar clientes para um arquivo Excel
document.getElementById("btn-exportar-planilha").addEventListener("click", async () => {
  try {
    const response = await fetchWithAuth("http://localhost:3000/clientes/exportar");
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showFeedback("Exportação concluída com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao exportar clientes:", error);
    showFeedback("Erro ao exportar clientes.", "error");
  }
});

// Importar clientes de um arquivo Excel
document.getElementById("btn-importar-planilha").addEventListener("click", async () => {
  const remetenteId = document.getElementById("remetente-cliente").value;

  if (!remetenteId) {
    showFeedback("Selecione um remetente antes de importar clientes.", "error");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx";

  input.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("remetente_id", remetenteId);

    try {
      const response = await fetchWithAuth("http://localhost:3000/clientes/importar", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        showFeedback("Importação concluída com sucesso!", "success");
        carregarClientes(); // Atualiza a lista de clientes
      } else {
        showFeedback("Erro ao importar clientes: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao importar clientes:", error);
      showFeedback("Erro ao importar clientes.", "error");
    }
  });

  input.click();
});

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
  carregarRemetentesParaClientes(); // Carregar remetentes no select
});
