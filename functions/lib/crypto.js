// functions/lib/crypto.js - Zero-CPU-bottleneck Web Crypto PBKDF2 + legacy bcrypt support
// Uses native BoringSSL Web Crypto (crypto.subtle) so Cloudflare Workers never hit
// the 10ms Free-tier CPU limit (Error 1102), while remaining backward-compatible with existing $2a$/$2b$ hashes.

const PBKDF2_ITERATIONS = 100000;

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const clean = String(hex || "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derivePbkdf2Hex(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(String(password)),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(saltHex),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

/**
 * Hash a password using hardware-accelerated Web Crypto PBKDF2-SHA256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Encoded PBKDF2 hash
 */
export async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = bytesToHex(saltBytes);
  const derivedHex = await derivePbkdf2Hex(password, saltHex, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${derivedHex}`;
}

/**
 * Verify a password against a stored PBKDF2 or legacy bcrypt hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored PBKDF2 or bcrypt hash
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const hashStr = String(storedHash);

  if (hashStr.startsWith("pbkdf2$")) {
    const parts = hashStr.split("$");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
      const saltHex = parts[2];
      const expectedHex = parts[3];
      const actualHex = await derivePbkdf2Hex(password, saltHex, iterations);
      return timingSafeEqualHex(actualHex, expectedHex);
    }
    if (parts.length === 3) {
      const saltHex = parts[1];
      const expectedHex = parts[2];
      const actualHex = await derivePbkdf2Hex(password, saltHex, PBKDF2_ITERATIONS);
      return timingSafeEqualHex(actualHex, expectedHex);
    }
    return false;
  }

  if (hashStr.startsWith("$2a$") || hashStr.startsWith("$2b$") || hashStr.startsWith("$2y$")) {
    try {
      const mod = await import("bcryptjs");
      const bcrypt = mod.default || mod;
      return await bcrypt.compare(password, hashStr);
    } catch (e) {
      console.error("Legacy bcrypt verification unavailable:", e);
      return false;
    }
  }

  if (/^[0-9a-f]{64}$/i.test(hashStr)) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(password)));
    return timingSafeEqualHex(bytesToHex(new Uint8Array(digest)), hashStr.toLowerCase());
  }

  return false;
}

/**
 * Hash a security answer (case-insensitive)
 */
export async function hashSecurityAnswer(answer) {
  const normalized = String(answer || "").trim().toLowerCase();
  return await hashPassword(normalized);
}

/**
 * Verify a security answer (case-insensitive)
 */
export async function verifySecurityAnswer(answer, storedHash) {
  const normalized = String(answer || "").trim().toLowerCase();
  return await verifyPassword(normalized, storedHash);
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password) {
  const pw = String(password || "");
  const errors = [];

  if (pw.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(pw)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(pw)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(pw)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
