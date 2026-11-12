"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return window.location.assign("/admin/login");
      const { data: profile } = await supabase.from("admin_profiles").select("id").eq("id", data.user.id).maybeSingle();
      if (!profile) { await supabase.auth.signOut(); window.location.assign("/admin/login"); }
    });
  }, [supabase]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return setMessage("Escolha uma senha com pelo menos 10 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não são iguais.");
    setLoading(true); setMessage("");
    const { data: userData, error: userError } = await supabase.auth.updateUser({ password });
    if (userError || !userData.user) { setMessage(`Não consegui atualizar: ${userError?.message || "tente novamente"}`); setLoading(false); return; }
    const { error: profileError } = await supabase.from("admin_profiles").update({ force_password_change: false, updated_at: new Date().toISOString() }).eq("id", userData.user.id);
    if (profileError) { setMessage(`A senha mudou, mas não consegui concluir o acesso: ${profileError.message}`); setLoading(false); return; }
    window.location.assign("/admin");
  };

  return <main className="admin-shell grid min-h-screen place-items-center p-4"><form onSubmit={submit} className="glass-panel w-full max-w-md rounded-[32px] p-7 md:p-10"><div className="mb-8 text-center"><span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-[var(--line)] text-3xl text-[var(--champagne)]">☾</span><p className="eyebrow">Primeiro acesso</p><h1 className="font-display mt-3 text-4xl">Crie sua senha</h1><p className="muted mt-2 text-sm">A senha provisória só vale para esta primeira entrada.</p></div>{message && <p role="alert" className="mb-5 rounded-2xl border border-red-300/20 bg-red-950/45 p-4 text-sm text-red-100">{message}</p>}<div className="space-y-5"><label className="block text-sm font-bold text-[var(--champagne-pale)]">Nova senha<input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required className="mt-2 w-full px-4 py-3" /></label><label className="block text-sm font-bold text-[var(--champagne-pale)]">Confirme a nova senha<input type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required className="mt-2 w-full px-4 py-3" /></label></div><button type="submit" disabled={loading} className="luxe-button mt-8 w-full">{loading ? "Salvando…" : "Salvar e abrir o painel →"}</button></form></main>;
}
