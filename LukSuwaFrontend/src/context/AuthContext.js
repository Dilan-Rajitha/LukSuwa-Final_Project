import * as SecureStore from "expo-secure-store";
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // loading state (for auto-login gate)
  const [loading, setLoading] = useState(true);

  // Save token
  const saveToken = async (newToken) => {
    try {
      if (!newToken) return;
      await SecureStore.setItemAsync("token", String(newToken));
    } catch (e) {
      console.log("Token save error:", e);
    }
  };

  // Save user
  const saveUser = async (u) => {
    try {
      if (!u) return;
      await SecureStore.setItemAsync("user", JSON.stringify(u));
    } catch (e) {
      console.log("User save error:", e);
    }
  };

  // Load auth on app start
  const loadAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("token");
      const rawUser = await SecureStore.getItemAsync("user");

      if (storedToken) setToken(storedToken);
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch (e) {
      console.log("Auth load error:", e);
    } finally {
      // must set loading false so layout can redirect
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuth();
  }, []);

  // Login
  const login = async (data) => {
    try {
      const newToken = data?.token;
      const u = data?.user || {};

      // Keep your structure (no breaking changes)
      const userObj = {
        id: u.id || u._id,
        _id: u.id || u._id,
        role: u.role,
        username: u.username,
        email: u.email,

        // normal user
        age: u.age,
        gender: u.gender,

        // SuperUser / pharmacy
        type: u.type,
        isApproved: u.isApproved,
        isProfileComplete: u.isProfileComplete,
        pharmacy_name: u.pharmacy_name,
        address: u.address,
        specialization: u.specialization,
        license_id: u.license_id,
        certificate_id: u.certificate_id,
      };

      await saveToken(newToken);
      await saveUser(userObj);

      setToken(newToken);
      setUser(userObj);

      console.log("Login success:", userObj.role, userObj.type);
    } catch (e) {
      console.log("Login error:", e);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("session"); // cleanup old versions

      setToken(null);
      setUser(null);
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};