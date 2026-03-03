import crypto from "crypto";

export const APP_SECRET_ALGO = "aes-256-gcm";

export const encryptWithAppSecret = (plaintext, secret) => {
  if (!secret || secret.length < 32) {
    throw new Error("BACKUP_KEY_ENC_SECRET must be at least 32 characters long");
  }

  const iv = crypto.randomBytes(12);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv(APP_SECRET_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    scheme: APP_SECRET_ALGO,
    ivB64: iv.toString("base64"),
    authTagB64: authTag.toString("base64"),
    ciphertextB64: ciphertext.toString("base64")
  });
};

export const decryptWithAppSecret = (payload, secret) => {
  if (!secret || secret.length < 32) {
    throw new Error("BACKUP_KEY_ENC_SECRET must be at least 32 characters long");
  }

  const parsed = JSON.parse(payload);

  if (
    parsed?.scheme !== APP_SECRET_ALGO
    || !parsed?.ivB64
    || !parsed?.authTagB64
    || !parsed?.ciphertextB64
  ) {
    throw new Error("Invalid encrypted passphrase payload");
  }

  const iv = Buffer.from(parsed.ivB64, "base64");
  const authTag = Buffer.from(parsed.authTagB64, "base64");
  const ciphertext = Buffer.from(parsed.ciphertextB64, "base64");
  const key = crypto.createHash("sha256").update(secret).digest();

  const decipher = crypto.createDecipheriv(APP_SECRET_ALGO, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};
