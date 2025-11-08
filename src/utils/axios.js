import axios from "axios";

const api = axios.create({});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    config.headers["Content-Type"] = "application/json";
    return config;
  },
  (error) => {
    if (error.response?.status === 403) {
      console.warn("Access forbidden - possibly expired token");
    }
    return Promise.reject(error);
  }
);

export default api;