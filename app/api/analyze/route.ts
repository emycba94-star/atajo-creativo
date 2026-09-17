import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient, Entry } from "@/lib/supabase";
import { checkPasscode } from "@/lib/admin";
import { QUESTIONS } from "@/lib/questions";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Sos analista del equipo de Atajo Creativo (agencia de Meta Ads y consultoría comercial en Córdoba).
Abajo están las observaciones semanales del equipo (metodología T5T de NVIDIA). Analizalas por capas SIN sobre-resumir: el valor está en los matices, no en conclusiones genéricas.

Devolvé exactamente estas 4 secciones, en español rioplatense, concreto y breve:

CAPA 1 — Temas que se repiten: qué observaciones aparecen en más de una persona. Agrupá; citá quién lo dijo.
CAPA 2 — Contradicciones o tensiones: dónde una persona ve algo que choca con lo que ve otra.
CAPA 3 — Señales débiles: 2-4 observaciones que aparecen UNA sola vez pero que, por su posible impacto, merecen atención. Explicá por qué.
CAPA 4 — Para decidir esta semana: 2-3 acciones concretas que Emi y Cami podrían tomar. Cada una en una línea.

No inventes datos que no estén en las respuestas. Si una capa no tiene contenido real, decilo en una línea.`;

function buildTranscript(entries: Entry[]): string {
  const blocks: string[] = [];
  for (const e of entries) {
    const answers = QUESTIONS.map((q, i) => {
      const val = (e[q.key] || "").trim();
      return `${i + 1}. ${q.label}\n   ${val || "(sin respuesta)"}`;
    }).join("\n");
    blocks.push(`### ${e.person_name}\n${answers}`);
  }
  return blocks.join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const { passcode, week_id } = (await req.json()) ?? {};
    if (!checkPasscode(passcode)) {
      return NextResponse.json({ error: "Passcode incorrecto." }, { status: 401 });
    }
    if (!week_id) {
      return NextResponse.json({ error: "Falta week_id." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta ANTHROPIC_API_KEY en el servidor." },
        { status: 500 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("week_id", week_id)
      .order("person_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries = (data ?? []) as Entry[];
    const withContent = entries.filter((e) =>
      [e.q1, e.q2, e.q3, e.q4, e.q5].some((v) => (v || "").trim().length > 0)
    );

    if (withContent.length === 0) {
      return NextResponse.json(
        { error: "No hay respuestas cargadas en esta semana todavía." },
        { status: 400 }
      );
    }

    const transcript = buildTranscript(withContent);
    const anthropic = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

    const message = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Observaciones de ${week_id}:\n\n${transcript}`,
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ analysis: text });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado." },
      { status: 500 }
    );
  }
}
