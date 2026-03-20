"use client";

// crypto/rsa.ts
function ensureCryptoAvailable() {
  if (typeof window === 'undefined') {
    throw new Error('Crypto operations must run in browser environment');
  }
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available. Ensure you are using HTTPS or localhost.');
  }
}

export async function generateRSAKeyPair() {
  ensureCryptoAvailable();
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportPublicKey(key: CryptoKey) {
  ensureCryptoAvailable();
  const spki = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(spki)));
}

export async function exportPrivateKey(key: CryptoKey) {
  ensureCryptoAvailable();
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  return btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
}

export async function importPublicKey(base64: string) {
  ensureCryptoAvailable();
  
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid public key: Key is missing or not a string');
  }

  // Validate base64 format
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Pattern.test(base64)) {
    throw new Error('Public key is corrupted or invalid');
  }

  try {
    const buf = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      "spki",
      buf,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  } catch (error) {
    throw new Error('Public key is corrupted or invalid');
  }
}

export async function importPrivateKey(base64: string) {
  ensureCryptoAvailable();
  
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid private key: Key is missing or not a string');
  }

  // Validate base64 format - should only contain valid base64 characters
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Pattern.test(base64)) {
    throw new Error('Private key is corrupted. Please log out and log back in to regenerate your encryption keys.');
  }

  try {
    const buf = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      "pkcs8",
      buf,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["decrypt"]
    );
  } catch (error) {
    throw new Error('Private key is corrupted. Please log out and log back in to regenerate your encryption keys.');
  }
}

export async function rsaEncrypt(publicKey: CryptoKey, data: ArrayBuffer) {
  ensureCryptoAvailable();
  return crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data);
}

export async function rsaDecrypt(privateKey: CryptoKey, data: ArrayBuffer) {
  ensureCryptoAvailable();
  return crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, data);
}

export async function validateKeyPair(publicKeyB64: string, privateKeyB64: string) {
  const pub = await importPublicKey(publicKeyB64);   // throws if invalid
  const priv = await importPrivateKey(privateKeyB64); // throws if invalid

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const encrypted = await rsaEncrypt(pub, challenge.buffer);
  const decrypted = await rsaDecrypt(priv, encrypted);

  const out = new Uint8Array(decrypted);
  const matches =
    out.length === challenge.length &&
    out.every((b, i) => b === challenge[i]);

  return matches; // true => both valid and same keypair
}