import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post("/api/auth/refresh", { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Typed API helpers
export const authApi = {
  login: (email: string, password: string) => {
    const form = new FormData();
    form.append("username", email);
    form.append("password", password);
    return api.post<{ access_token: string; refresh_token: string }>("/auth/login", form);
  },
  me: () => api.get("/auth/me"),
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post("/auth/register", data),
};

export const gardenApi = {
  list: () => api.get("/gardens"),
  get: (id: number) => api.get(`/gardens/${id}`),
  create: (data: object) => api.post("/gardens", data),
  update: (id: number, data: object) => api.patch(`/gardens/${id}`, data),
  spaces: (gardenId: number) => api.get(`/gardens/${gardenId}/spaces`),
  createSpace: (gardenId: number, data: object) => api.post(`/gardens/${gardenId}/spaces`, data),
  seasons: (gardenId: number) => api.get(`/gardens/${gardenId}/seasons`),
  plantings: (gardenId: number, params?: object) =>
    api.get(`/gardens/${gardenId}/plantings`, { params }),
  schedule: (gardenId: number, params?: object) =>
    api.get(`/gardens/${gardenId}/schedule`, { params }),
  expenses: (gardenId: number, params?: object) =>
    api.get(`/gardens/${gardenId}/expenses`, { params }),
};

export const varietyApi = {
  list: () => api.get("/varieties"),
  get: (id: number) => api.get(`/varieties/${id}`),
  create: (data: object) => api.post("/varieties", data),
  extractPacket: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/varieties/extract-packet", form);
  },
};

export const plantingApi = {
  get: (gardenId: number, plantingId: number) =>
    api.get(`/gardens/${gardenId}/plantings/${plantingId}`),
  update: (gardenId: number, plantingId: number, data: object) =>
    api.patch(`/gardens/${gardenId}/plantings/${plantingId}`, data),
  maintenance: (plantingId: number) => api.get(`/plantings/${plantingId}/maintenance`),
  addMaintenance: (plantingId: number, data: object) =>
    api.post(`/plantings/${plantingId}/maintenance`, data),
  issues: (plantingId: number) => api.get(`/plantings/${plantingId}/issues`),
  addIssue: (plantingId: number, data: object) =>
    api.post(`/plantings/${plantingId}/issues`, data),
  harvests: (plantingId: number) => api.get(`/plantings/${plantingId}/harvests`),
  addHarvest: (plantingId: number, data: object) =>
    api.post(`/plantings/${plantingId}/harvests`, data),
  photos: (plantingId: number) => api.get(`/plantings/${plantingId}/photos`),
  uploadPhoto: (plantingId: number, file: File, caption?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    return api.post(`/plantings/${plantingId}/photos`, form);
  },
};
