export class ApiError extends Error {
  constructor(method, url, status, detail) {
    super(`${method} ${url} → ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse(r, method, url) {
  if (!r.ok) {
    let detail = `Request failed (${r.status})`;
    try {
      const body = await r.json();
      if (body.detail) {
        detail = Array.isArray(body.detail)
          ? body.detail.map(d => d.msg || String(d)).join(', ')
          : String(body.detail);
      }
    } catch (_) {}
    throw new ApiError(method, url, r.status, detail);
  }
  // 204 No Content (and any response with no body) has nothing to parse
  if (r.status === 204 || r.headers.get('content-length') === '0') return null;
  return r.json();
}

const api = {
  get: async (url) => {
    const r = await fetch(url);
    return handleResponse(r, 'GET', url);
  },
  post: async (url, data) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r, 'POST', url);
  },
  put: async (url, data) => {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r, 'PUT', url);
  },
  del: async (url) => {
    const r = await fetch(url, { method: 'DELETE' });
    return handleResponse(r, 'DELETE', url);
  },
  patch: async (url, data) => {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(r, 'PATCH', url);
  },
  upload: async (url, formData) => {
    const r = await fetch(url, { method: 'POST', body: formData });
    return handleResponse(r, 'POST', url);
  },
};

export default api;
