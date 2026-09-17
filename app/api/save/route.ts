import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      person_id,
      person_name,
      week_id,
      week_label,
      q1 = "",
      q2 = "",
      q3 = "",
      q4 = "",
      q5 = "",
    } = body ?? {};

    if (!person_id || !person_name || !week_id || !week_label) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("entries")
      .upsert(
        {
          person_id,
          person_name,
          week_id,
          week_label,
          q1,
          q2,
          q3,
          q4,
          q5,
        },
        { onConflict: "person_id,week_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado." },
      { status: 500 }
    );
  }
}
