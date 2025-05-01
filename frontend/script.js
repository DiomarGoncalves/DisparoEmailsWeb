function showTab(tabId) {
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.add("hidden"));
  document.getElementById("tab-" + tabId).classList.remove("hidden");
}

function showFeedback(message, type) {
  const feedback = document.getElementById("feedback");
  feedback.textContent = message;
  feedback.className = `p-4 mb-4 text-white rounded ${
    type === "success" ? "success" : "error"
  }`;
  feedback.classList.remove("hidden");
  setTimeout(() => feedback.classList.add("hidden"), 5000);
}

// Tornar fetchWithAuth global
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    console.error("Token ausente. Redirecionando para login.");
    window.location.href = "login.html";
    return;
  }

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error("Token inválido ou expirado. Redirecionando para login.");
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
      throw new Error(`Erro na requisição: ${response.statusText || "Resposta inválida"}`);
    }

    return response;
  } catch (error) {
    console.error("Erro na requisição protegida:", error);
    throw error;
  }
}
