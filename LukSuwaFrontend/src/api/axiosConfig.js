import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API = axios.create({
  // baseURL: "http://192.168.1.6:5000/api",   
  baseURL: "https://luksuwa-backend-host-check-001.onrender.com/api",  
});

// Attach token if exists (React Native friendly)
API.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log("Token read error:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// export const SOCKET_URL = "http://192.168.1.6:5000"; 
export const SOCKET_URL = "https://luksuwa-backend-host-check-001.onrender.com"; 
export default API;
