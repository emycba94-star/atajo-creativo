import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkPasscode } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { passcode, week_id } = (await req.json()) ?? {};

    if (!checkPasscode(passcode)) {
      return NextResponse.json({ error: "Passcode incorrecto." }, { status: 401 });
    }
    if (!week_id) {
      return NextResponse.json({ error: "Falta week_id." }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Entradas de la semana pedida.
    const { data: weekEntries, error: e1 } = await supabase
      .from("entries")
      .select("*")
      .eq("week_id", week_id)
      .order("person_name", { ascending: true });

    if (e1) {
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }

    // Roster = todas las personas que alguna vez cargaron algo.
    const { data: rosterRows, error: e2 } = await supabase
      .from("entries")
      .select("person_id, person_name");

    if (e2) {
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }

    const rosterMap = new Map<string, string>();
    for (const r of rosterRows ?? []) {
      rosterMap.set(r.person_id, r.person_name);
    }
    const roster = Array.from(rosterMap, ([person_id, person_name]) => ({
      person_id,
      person_name,
    })).sort((a, b) => a.person_name.localeCompare(b.person_name));

    return NextResponse.json({ entries: weekEntries ?? [], roster });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado." },
      { status: 500 }
    );
  }
}
