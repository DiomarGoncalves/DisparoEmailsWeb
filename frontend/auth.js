export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function isAuthenticated() {
  return !!getToken();
}

export function redirectToLogin() {
  window.location.href = 'login.html';
}

export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return;
  }

  options.headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, options);
  if (response.status === 401 || response.status === 403) {
    clearToken();
    redirectToLogin();
  }
  return response;
}
