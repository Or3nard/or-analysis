// OR Analysis — gestion des comptes (Supabase Edge Function « or-admin »)
// La clé d'administration (service role) reste côté serveur : elle n'est jamais envoyée au navigateur.
// Seuls les comptes présents dans public.masters peuvent appeler ces actions.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Clé d'administration fournie automatiquement par Supabase (ancien ou nouveau système de clés)
function adminKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const single = Deno.env.get("SUPABASE_SECRET_KEY");
  if (single) return single;
  const many = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (many) {
    try {
      const obj = JSON.parse(many);
      const k = obj.default ?? Object.values(obj)[0];
      if (k) return String(k);
    } catch { /* ignore */ }
  }
  throw new Error("Clé d'administration introuvable dans l'environnement de la fonction.");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Qui appelle ?
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: who, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !who?.user) return json({ error: "Session expirée, reconnectez-vous." }, 401);
    const me = who.user;

    // 2) Est-ce un Master ?
    const { data: isM } = await admin.from("masters").select("user_id").eq("user_id", me.id).maybeSingle();
    if (!isM) return json({ error: "Accès réservé aux comptes Master." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const masterIds = async () => {
      const { data, error } = await admin.from("masters").select("user_id");
      if (error) throw error;
      return new Set((data || []).map((r: { user_id: string }) => r.user_id));
    };
    const checkPwd = (p: unknown) => typeof p === "string" && p.length >= 8;

    switch (action) {
      case "list": {
        const users = [];
        for (let page = 1; ; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) throw error;
          users.push(...data.users);
          if (data.users.length < 1000) break;
        }
        const ms = await masterIds();
        return json({
          me: me.id,
          users: users.map((u) => ({
            id: u.id, email: u.email, role: ms.has(u.id) ? "master" : "reader",
            created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
          })),
        });
      }
      case "create": {
        const email = String(body.email || "").trim().toLowerCase();
        if (!EMAIL_RE.test(email)) return json({ error: "Adresse e-mail invalide." }, 400);
        if (!checkPwd(body.password)) return json({ error: "Mot de passe : 8 caractères minimum." }, 400);
        const { data, error } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true });
        if (error) return json({ error: /already/i.test(error.message) ? "Un compte existe déjà avec cet e-mail." : error.message }, 400);
        if (body.role === "master") {
          const { error: e2 } = await admin.from("masters").insert({ user_id: data.user.id });
          if (e2) throw e2;
        }
        return json({ ok: true, id: data.user.id });
      }
      case "setRole": {
        const { userId, role } = body;
        if (!userId || !["master", "reader"].includes(role)) return json({ error: "Requête invalide." }, 400);
        if (userId === me.id && role !== "master") return json({ error: "Vous ne pouvez pas retirer vos propres droits Master." }, 400);
        if (role === "master") {
          const { error } = await admin.from("masters").upsert({ user_id: userId });
          if (error) throw error;
        } else {
          const { error } = await admin.from("masters").delete().eq("user_id", userId);
          if (error) throw error;
        }
        return json({ ok: true });
      }
      case "resetPassword": {
        const { userId, password } = body;
        if (!userId || !checkPwd(password)) return json({ error: "Mot de passe : 8 caractères minimum." }, 400);
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      case "delete": {
        const { userId } = body;
        if (!userId) return json({ error: "Requête invalide." }, 400);
        if (userId === me.id) return json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, 400);
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
      default:
        return json({ error: "Action inconnue." }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
