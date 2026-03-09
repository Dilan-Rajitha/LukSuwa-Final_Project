

import API from "./axiosConfig";

export type Doctor = {
  _id: string;
  username: string;
  email: string;
  role: string;
  specialization?: string;
};

export type Slot = {
  start: string;
  end: string;
};

export type DoctorMini = {
  _id: string;
  username?: string;
  email?: string;
  specialization?: string;
  role?: string;
};

export type Appointment = {
  _id: string;
  doctorId: string | DoctorMini;   
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  createdAt?: string;
};

export async function fetchDoctors(token: string): Promise<Doctor[]> {
  const res = await API.get("/superusers/doctors", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.doctors ?? [];
}

export async function fetchDoctorAvailability(token: string, doctorId: string): Promise<Slot[]> {
  const res = await API.get(`/availability/doctor/${doctorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.slots ?? [];
}

export async function createAppointment(
  token: string,
  payload: { doctorId: string; startTime: string; endTime: string }
) {
  const res = await API.post("/appointments/create", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.appointment;
}

export async function fetchMyAppointments(token: string): Promise<Appointment[]> {
  const res = await API.get("/appointments/my", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.appointments ?? [];
}
