"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  const supabase = createClient();
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setMessage("Não consegui entrar: " + (error?.message || "tente novamente")); setLoading(false); return; }
    const { data: profile } = await supabase.from("admin_profiles").select("force_password_change").eq("id", data.user.id).maybeSingle();
    if (!profile) { await supabase.auth.signOut(); setMessage("Este usuário não tem acesso ao painel administrativo."); setLoading(false); return; }
    window.location.assign(profile.force_password_change ? "/admin/alterar-senha" : "/admin");
  };
  return <main className="admin-shell grid min-h-screen place-items-center p-4"><form onSubmit={login} className="glass-panel w-full max-w-md rounded-[32px] p-7 md:p-10"><div className="mb-8 text-center"><span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-[var(--line)] text-3xl text-[var(--champagne)]">☾</span><p className="eyebrow">Área reservada</p><h1 className="font-display mt-3 text-4xl">Acesso ao ateliê</h1><p className="muted mt-2 text-sm">Entre para criar a próxima conversa da Entreluar.</p></div>{message && <p role="alert" className="mb-5 rounded-2xl border border-red-300/20 bg-red-950/45 p-4 text-sm text-red-100">{message}</p>}<div className="space-y-5"><label className="block text-sm font-bold text-[var(--champagne-pale)]">E-mail<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required className="mt-2 w-full px-4 py-3" /></label><label className="block text-sm font-bold text-[var(--champagne-pale)]">Senha<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required className="mt-2 w-full px-4 py-3" /></label></div><button type="submit" disabled={loading} className="luxe-button mt-8 w-full">{loading ? "Abrindo o ateliê…" : "Entrar no painel →"}</button></form></main>;
}
