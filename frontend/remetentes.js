import { fetchWithAuth, showFeedback } from "./script.js";

// Funções relacionadas aos remetentes

async function carregarRemetentes() {
  const listaRemetentes = document.getElementById("lista-remetentes");
  listaRemetentes.innerHTML = ""; // Limpa a lista antes de carregar

  try {
    const response = await fetchWithAuth("http://localhost:3000/remetentes");
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }
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
      throw new Error(result.error || "Erro ao carregar lista de remetentes.");
    }
  } catch (error) {
    console.error("Erro ao carregar lista de remetentes:", error);
    showFeedback("Erro ao carregar lista de remetentes.", "error");
  }
}

document.getElementById("lista-remetentes").addEventListener("click", async (e) => {
  if (e.target.classList.contains("editar-remetente")) {
    const remetenteId = e.target.dataset.id;

    try {
      const response = await fetchWithAuth(`http://localhost:3000/remetentes/${remetenteId}`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
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
  } else if (e.target.classList.contains("excluir-remetente")) {
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
        carregarRemetentes(); // Atualiza a lista
      } else {
        showFeedback("Erro ao excluir remetente: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao excluir remetente:", error);
      showFeedback("Erro ao excluir remetente.", "error");
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  carregarRemetentes();
});
