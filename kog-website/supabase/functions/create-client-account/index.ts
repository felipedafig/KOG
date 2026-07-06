// Staff-only account management for the "Mijn Pand" client portal.
//
// Actions (POST, JSON body):
//   { action: "create", property_id, email }
//     -> new email:      creates a client user with a temp password, links it to the
//                        property; returns { status: "created", temp_password }
//     -> existing client: links only; returns { status: "linked_existing" }
//     -> existing staff:  409 { error: "is_staff_account" } (never touch staff accounts)
//   { action: "reset_password", user_id }
//     -> target must be a client; returns { status: "reset", temp_password }
//
// The caller's JWT is verified against GoTrue and must carry
// app_metadata.user_role === "staff" — this in-function check is the real
// authorization boundary, not the platform's verify_jwt (which accepts any
// valid project JWT, including the anon key).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function tempPassword(): string {
  // Unambiguous alphabet (no 0/O/1/l/i), 12 random chars in 3 groups.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `KOG-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Authorize the caller: valid session AND staff role.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
  if (callerError || caller?.app_metadata?.user_role !== "staff") {
    return json({ error: "forbidden" }, 403);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (body.action === "create") {
    const { property_id, email } = body;
    if (!property_id || !email) return json({ error: "missing_fields" }, 400);

    // listUsers has no email filter pre-v2 GoTrue admin generateLink trick; use the
    // admin REST filter instead (exact-match on email).
    const { data: existing, error: lookupError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (lookupError) return json({ error: lookupError.message }, 500);
    const match = existing.users.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
    );

    if (match) {
      if (match.app_metadata?.user_role === "staff") {
        return json({ error: "is_staff_account" }, 409);
      }
      const { error: linkError } = await admin.from("property_users")
        .upsert(
          { property_id, user_id: match.id, email: match.email },
          { onConflict: "property_id,user_id", ignoreDuplicates: true },
        );
      if (linkError) return json({ error: linkError.message }, 500);
      return json({ status: "linked_existing" });
    }

    const password = tempPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { user_role: "client" },
      user_metadata: { must_change_password: true },
    });
    if (createError) return json({ error: createError.message }, 500);

    const { error: linkError } = await admin.from("property_users")
      .insert({ property_id, user_id: created.user.id, email });
    if (linkError) {
      // Don't leave an orphaned login behind if the link failed.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: linkError.message }, 500);
    }
    return json({ status: "created", temp_password: password });
  }

  if (body.action === "reset_password") {
    const { user_id } = body;
    if (!user_id) return json({ error: "missing_fields" }, 400);

    const { data: target, error: getError } = await admin.auth.admin.getUserById(user_id);
    if (getError || !target?.user) return json({ error: "user_not_found" }, 404);
    if (target.user.app_metadata?.user_role !== "client") {
      return json({ error: "not_a_client_account" }, 409);
    }

    const password = tempPassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(user_id, {
      password,
      user_metadata: { must_change_password: true },
    });
    if (updateError) return json({ error: updateError.message }, 500);
    return json({ status: "reset", temp_password: password });
  }

  return json({ error: "unknown_action" }, 400);
});
