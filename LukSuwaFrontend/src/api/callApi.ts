import API from "./axiosConfig";

export type CallType = "video" | "audio";

export type CallDoc = {
  callId: string;
  status: "pending" | "ongoing" | "completed" | "missed" | "rejected";
  doctorId: any;
  patientId: any;
  appointmentId: any;
  callType: CallType;
};

export type AgoraTokenPayload = {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
};

export async function initiateCall(
  token: string,
  payload: { doctorId: string; appointmentId: string; callType: CallType }
): Promise<CallDoc> {
  const res = await API.post("/calls/initiate", payload, {
    headers: { Authorization: `Bearer ${token}` }, // keep (ok)
  });
  return res.data?.call;
}

export async function acceptCall(token: string, payload: { callId: string }) {
  const res = await API.post("/calls/accept", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.call;
}

export async function endCall(token: string, payload: { callId: string }) {
  const res = await API.post("/calls/end", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data?.call;
}

/**
 * Get Agora token by callId
 * Backend should return: { appId, token, channelName, uid }
 */
// export async function getAgoraToken(
//   token: string,
//   callId: string
// ): Promise<AgoraTokenPayload> {
//   const res = await API.get(`/calls/agora-token/${callId}`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   return res.data;
// }


export async function getAgoraToken(
  token: string,
  callId: string
): Promise<AgoraTokenPayload> {
  const res = await API.post(
    `/calls/agora-token`,
    { callId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}
