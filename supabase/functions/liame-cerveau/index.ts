import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://pastekjak-maker.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Méthode non autorisée" }, 405);
  }

  const token = (req.headers.get("Authorization") || "")
    .replace(/^Bearer\s+/i, "");

  if (!token) return json({ error: "Connexion requise" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_ANON_KEY") || ""
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return json({ error: "Utilisateur non autorisé" }, 401);
  }

  let message: unknown;
  try {
    message = (await req.json()).message;
  } catch {
    return json({ error: "Message invalide" }, 400);
  }

  if (typeof message !== "string" ||
      !message.trim() || message.length > 500) {
    return json({ error: "Message limité à 500 caractères" }, 400);
  }

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "Clé IA non configurée" }, 503);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        reasoning: { effort: "none" },
        max_output_tokens: 180,
        store: false,
        instructions: "Tu es LIAME, un compagnon IA chaleureux et respectueux. Parle en français avec naturel et douceur. Réponds brièvement, rebondis sur la conversation et pose parfois une question pertinente. Ne prétends jamais connaître des souvenirs, des proches ou des actualités qui ne t'ont pas été fournis. Respecte les silences et les refus. Tu es une IA, pas une personne humaine.",
        input: message.trim()
      })
    });

    if (!response.ok) {
      return json({ error: "Appel IA impossible", code: response.status }, 502);
    }

    const result = await response.json();
    const texte = (result.output || [])
      .flatMap((item: { content?: Array<{ type: string; text?: string }> }) =>
        item.content || [])
      .filter((part: { type: string }) => part.type === "output_text")
      .map((part: { text?: string }) => part.text || "")
      .join(" ").trim();

    return json({ message: texte || "Peux-tu me répéter cela ?" });
  } catch {
    return json({ error: "Service IA indisponible" }, 502);
  }
});
