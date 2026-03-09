import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

export function generateAgoraRtcToken({
  channelName,
  uid,
  role = "publisher",
  expireSeconds = 3600,
}) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error("AGORA_APP_ID or AGORA_APP_CERTIFICATE missing in .env");
  }

  const agoraRole =
    role === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  const currentTs = Math.floor(Date.now() / 1000);
  const expireTs = currentTs + expireSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    agoraRole,
    expireTs
  );
}
