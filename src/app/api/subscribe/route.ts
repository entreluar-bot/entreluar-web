import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from("subscribers").insert([{ email }]);

    // 23505 is unique violation code in Postgres
    if (error && error.code === "23505") {
      return NextResponse.json({ message: "E-mail já cadastrado!" });
    }
    
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Inscrição confirmada!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
