document
  .getElementById("login-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    console.log("Tentando login com:", { username, password }); // Log para depuração

    if (!username || !password) {
      console.error("Username ou senha não fornecidos.");
      document.getElementById("feedback").textContent =
        "Por favor, preencha todos os campos.";
      document.getElementById("feedback").classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/auth/login", { // Corrigido para incluir '/auth'
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      console.log("Resposta da requisição de login (status):", response.status);

      if (!response.ok) {
        const errorResult = await response.json();
        console.error("Erro no login:", errorResult.error);
        document.getElementById("feedback").textContent = errorResult.error;
        document.getElementById("feedback").classList.remove("hidden");
        return;
      }

      const result = await response.json();
      console.log("Resposta do servidor:", result); // Log para verificar a resposta do backend

      if (result.success) {
        localStorage.setItem("token", result.token);
        console.log("Token salvo no localStorage:", localStorage.getItem("token")); // Log para verificar o token salvo

        // Redireciona para a página inicial
        window.location.href = "/";
      } else {
        document.getElementById("feedback").textContent = result.error;
        document.getElementById("feedback").classList.remove("hidden");
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      document.getElementById("feedback").textContent =
        "Erro ao fazer login. Tente novamente mais tarde.";
      document.getElementById("feedback").classList.remove("hidden");
    }
  });
