// functions/api/auth/password-recovery/verify.js - Step 2: Verify Security Answer
import { verifySecurityAnswer } from "../../../lib/crypto.js";
import { checkRateLimit, RATE_LIMITS, getIpAddress } from "../../../lib/rate-limit.js";
import { verifyToken as verifyJwt, generateToken as signJwt } from "../../../lib/jwt.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const ipAddress = getIpAddress(request);

  try {
    const rateLimit = await checkRateLimit(env, ipAddress, RATE_LIMITS.PASSWORD_RECOVERY);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many attempts. Please try again later.",
          resetAt: rateLimit.resetAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimit.resetAt - new Date()) / 1000).toString(),
          },
        }
      );
    }

    const { recovery_token, security_answer } = await request.json();
    if (!recovery_token || !security_answer) {
      return new Response(JSON.stringify({ error: "Missing token or answer" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const secret = env.JWT_SECRET || "secret-dev-key";
    const claims = await verifyJwt(recovery_token, secret);
    if (!claims?.uid || claims.purpose !== "pwd_recovery_verify") {
      return new Response(JSON.stringify({ error: "Invalid or expired recovery session" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await env.DB.prepare(
      "SELECT id, security_answer_hash, password_hash FROM users WHERE id = ?"
    )
      .bind(claims.uid)
      .first();

    if (!user || !user.security_answer_hash) {
      return new Response(JSON.stringify({ error: "Invalid recovery state" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isValid = await verifySecurityAnswer(security_answer, user.security_answer_hash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Incorrect security answer" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Bind reset token to current password_hash prefix so it is single-use once password changes
    const pwFingerprint = String(user.password_hash || "").slice(-12);
    const resetToken = await signJwt(
      { uid: user.id, purpose: "pwd_recovery_reset", fp: pwFingerprint },
      secret,
      { expiresIn: 600 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        reset_token: resetToken,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Verify Error:", e);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
