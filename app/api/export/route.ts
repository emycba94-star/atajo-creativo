import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkPasscode } from "@/lib/admin";

export const runtime = "nodejs";

// Devuelve TODAS las entradas para armar el CSV en el cliente.
export async function POST(req: NextRequest) {
  try {
    const { passcode } = (await req.json()) ?? {};
    if (!checkPasscode(passcode)) {
      return NextResponse.json({ error: "Passcode incorrecto." }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("week_id", { ascending: false })
      .order("person_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ entries: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado." },
      { status: 500 }
    );
  }
}
