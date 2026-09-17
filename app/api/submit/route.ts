import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { person_id, week_id } = (await req.json()) ?? {};
    if (!person_id || !week_id) {
      return NextResponse.json(
        { error: "Faltan person_id o week_id." },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("entries")
      .update({ submitted: true })
      .eq("person_id", person_id)
      .eq("week_id", week_id);

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
