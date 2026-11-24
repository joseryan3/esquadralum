const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://esquadralum-mes.onrender.com';

const TOKEN_KEY = 'esquadralum_token';
const USER_KEY = 'esquadralum_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setSession: (token, usuario) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    localStorage.setItem('usuarioLogado', usuario?.email || '');
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('usuarioLogado');
  },
  isAuthenticated: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};

export function apiUrl(path = '') {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest(path, options = {}) {
  const token = authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(apiUrl(path), { ...options, headers });

  if (response.status === 401 && !path.includes('/auth/login')) {
    authStorage.clearSession();
    window.location.href = '/login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const backendMessage = data && (data.detail || data.message || data.title);
    const fallbackMessage =
      response.status === 400
        ? 'Os dados informados são inválidos. Confira os campos obrigatórios e os limites.'
        : response.status === 401
          ? 'Sua sessão expirou. Entre novamente no sistema.'
          : response.status === 403
            ? 'Você não tem permissão para realizar esta operação.'
            : response.status === 404
              ? 'O pedido ou esquadria solicitado não foi encontrado.'
              : response.status === 409
                ? 'Não foi possível concluir a operação porque os dados estão em conflito.'
                : response.status === 500
                  ? 'Erro interno ao salvar os dados. Confira altura (máximo 5.000 mm), quantidade (máximo 999) e tente novamente.'
                  : response.status >= 500
                    ? 'O servidor está temporariamente indisponível. Tente novamente em instantes.'
                    : `Erro na requisição (${response.status}).`;
    const isGenericServerMessage =
      backendMessage &&
      /erro interno inesperado|erro interno|internal server error/i.test(backendMessage);
    const message =
      (response.status >= 500 && (!backendMessage || isGenericServerMessage))
        ? fallbackMessage
        : backendMessage || fallbackMessage;
    throw new Error(message);
  }

  return data;
}

export const apiGet = (path) => apiRequest(path, { method: 'GET' });
export const apiPost = (path, body) =>
  apiRequest(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPut = (path, body) =>
  apiRequest(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = (path) => apiRequest(path, { method: 'DELETE' });

export async function openPdfInNewTab(path) {
  const token = authStorage.getToken();
  const response = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error('Não foi possível gerar a etiqueta PDF.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
}