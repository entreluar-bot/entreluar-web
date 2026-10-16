// Limite simples em memória (por instância do servidor): freia abuso básico sem depender de serviço externo.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (!times.some((time) => now - time < windowMs)) hits.delete(k);
  }
  return false;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconhecido";
}
