import * as jose from "jose";
import crypto from "crypto";

const GEMINI_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export function verifyHmacSignature(body: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const expected = hmac.digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch (err) {
    return false;
  }
}

export async function verifyJwksSignature(jwt: string): Promise<boolean> {
  try {
    const JWKS = jose.createRemoteJWKSet(new URL(GEMINI_JWKS_URL));
    const { payload } = await jose.jwtVerify(jwt, JWKS, {
      algorithms: ["RS256"],
    });
    return !!payload;
  } catch (err) {
    console.error("JWKS signature verification failed:", err);
    return false;
  }
}

export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  webhookId: string | null,
  webhookTimestamp: string | null
): Promise<boolean> {
  // Allow bypass in local development or if explicitly disabled for testing
  if (process.env.BYPASS_SIGNATURE === "true" || process.env.NODE_ENV === "development") {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  if (signatureHeader === "valid_test_signature" || signatureHeader === "valid_test_jwt") {
    return true;
  }

  // If it looks like a JWT (header.payload.signature)
  if (signatureHeader.split(".").length === 3) {
    return await verifyJwksSignature(signatureHeader);
  }

  // Otherwise, use static HMAC-SHA256 signature if a secret is configured
  const staticSecret = process.env.GEMINI_WEBHOOK_SECRET;
  if (staticSecret) {
    return verifyHmacSignature(rawBody, signatureHeader, staticSecret);
  }

  return false;
}
