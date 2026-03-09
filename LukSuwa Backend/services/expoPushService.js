import fetch from "node-fetch";

export async function sendExpoPush(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return { ok: true, results: [] };

  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

  const results = [];
  for (const chunk of chunks) {
    const resp = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    results.push(await resp.json());
  }

  return { ok: true, results };
}
