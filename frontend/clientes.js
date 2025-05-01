import { fetchWithAuth, showFeedback } from "./script.js";

// Funções relacionadas aos clientes

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

document.addEventListener("DOMContentLoaded", () => {
  carregarClientes();
});
