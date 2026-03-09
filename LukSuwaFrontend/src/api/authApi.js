import API from "./axiosConfig";

export const loginUser = async (email, password) => {
  const res = await API.post("/login", { email, password });
  return res.data;
};
