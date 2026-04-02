const api = {
  get: async (url) => { const r = await fetch(url); return r.json(); },
  post: async (url, data) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  put: async (url, data) => {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  del: async (url) => { const r = await fetch(url, { method: 'DELETE' }); return r.json(); },
  patch: async (url, data) => {
    const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  upload: async (url, formData) => {
    const r = await fetch(url, { method: 'POST', body: formData });
    return r.json();
  },
};

export default api;
