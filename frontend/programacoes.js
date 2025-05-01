import { fetchWithAuth, showFeedback } from "./script.js";

// Funções relacionadas às configurações de envio

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

document.addEventListener("DOMContentLoaded", () => {
  carregarProgramacoes();
});
