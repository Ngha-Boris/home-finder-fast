import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { normalizePhone } from "@/lib/phone";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return json({ error: message }, { status });
}

export const Route = createFileRoute("/api/landlord/register")({
  server: {
    handlers: {
      POST: async () => {
        const request = getRequest();
        if (!request) return errorResponse("Registration is not available.", 500);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("Invalid registration request.");
        }

        const input = body as { name?: unknown; phone?: unknown; password?: unknown };
        const normalized = typeof input.phone === "string" ? normalizePhone(input.phone) : null;
        const password = typeof input.password === "string" ? input.password : "";
        const displayName =
          typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;

        if (!normalized) return errorResponse("Enter a valid 9-digit phone number.");
        if (password.length < 6) return errorResponse("Use at least 6 characters.");

        try {
          const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await admin.auth.admin.createUser({
            phone: `+${normalized}`,
            password,
            phone_confirm: true,
            user_metadata: {
              phone_number: normalized,
              display_name: displayName,
            },
          });

          if (error) {
            const message = error.message.toLowerCase().includes("already")
              ? "That phone number is already registered. Try logging in."
              : error.message;
            return errorResponse(message, error.status || 400);
          }

          const userId = data.user?.id;
          if (!userId) return errorResponse("Account created without a user id.", 500);

          const { error: roleError } = await admin
            .from("user_roles")
            .upsert({ user_id: userId, role: "landlord" }, { onConflict: "user_id,role" });
          if (roleError) throw roleError;

          const { error: profileError } = await admin.from("profiles").upsert(
            {
              id: userId,
              phone_number: normalized,
              display_name: displayName,
            },
            { onConflict: "id" },
          );
          if (profileError) throw profileError;

          return json({ userId });
        } catch (error) {
          console.error("[auth] Landlord registration failed", error);
          return errorResponse("Unable to create landlord account right now.", 500);
        }
      },
    },
  },
});
