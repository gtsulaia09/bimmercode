// functions/api/auth/password-recovery/init.js - Step 1: Initialize Password Recovery
import { checkRateLimit, RATE_LIMITS, getIpAddress } from "../../../lib/rate-limit.js";
import { generateToken as signJwt } from "../../../lib/jwt.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const ipAddress = getIpAddress(request);

  try {
    const rateLimit = await checkRateLimit(env, ipAddress, RATE_LIMITS.PASSWORD_RECOVERY);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many recovery attempts. Please try again later.",
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

    const { identifier } = await request.json();
    const cleanIdent = String(identifier || "").trim().toLowerCase();

    if (!cleanIdent) {
      return new Response(JSON.stringify({ error: "Email or username is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await env.DB.prepare(
      "SELECT id, security_question FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?"
    )
      .bind(cleanIdent, cleanIdent)
      .first();

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return new Response(JSON.stringify({ error: "Account not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!user.security_question) {
      return new Response(
        JSON.stringify({
          error: "Security question not set for this account. Please contact support.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const secret = env.JWT_SECRET || "secret-dev-key";
    const recoveryToken = await signJwt(
      { uid: user.id, purpose: "pwd_recovery_verify" },
      secret,
      { expiresIn: 600 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        security_question: user.security_question,
        recovery_token: recoveryToken,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Recovery Init Error:", e);
    return new Response(JSON.stringify({ error: "Failed to initiate recovery" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
