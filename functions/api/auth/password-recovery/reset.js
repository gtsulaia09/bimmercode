// functions/api/auth/password-recovery/reset.js - Step 3: Reset Password
import { hashPassword, validatePasswordStrength } from "../../../lib/crypto.js";
import { logAudit, AUDIT_ACTIONS } from "../../../lib/audit.js";
import { getIpAddress } from "../../../lib/rate-limit.js";
import { verifyToken as verifyJwt } from "../../../lib/jwt.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const ipAddress = getIpAddress(request);

  try {
    const { reset_token, new_password } = await request.json();

    if (!reset_token || !new_password) {
      return new Response(JSON.stringify({ error: "Missing token or password" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const passwordValidation = validatePasswordStrength(new_password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          error: "Password does not meet requirements",
          details: passwordValidation.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const secret = env.JWT_SECRET || "secret-dev-key";
    const claims = await verifyJwt(reset_token, secret);
    if (!claims?.uid || claims.purpose !== "pwd_recovery_reset") {
      return new Response(JSON.stringify({ error: "Invalid or expired reset token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await env.DB.prepare("SELECT id, email, password_hash FROM users WHERE id = ?")
      .bind(claims.uid)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid or expired reset token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const currentFp = String(user.password_hash || "").slice(-12);
    if (claims.fp && claims.fp !== currentFp) {
      return new Response(JSON.stringify({ error: "Reset token has already been used" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newHash = await hashPassword(new_password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(newHash, user.id)
      .run();

    await logAudit(env, {
      userId: user.id,
      action: AUDIT_ACTIONS.SETTINGS_CHANGED,
      targetEntityType: "user",
      targetEntityId: user.id,
      details: { change: "password_reset_recovery", ip: ipAddress },
      ipAddress,
      userAgent: request.headers.get("User-Agent"),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password successfully reset",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Reset Error:", e);
    return new Response(JSON.stringify({ error: "Password reset failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
