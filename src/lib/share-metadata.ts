export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://entreluar.com.br";
export const fallbackShareImage = "/luana.jpg";

export function absoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return new URL(fallbackShareImage, siteUrl).toString();
  try {
    return new URL(pathOrUrl, siteUrl).toString();
  } catch {
    return new URL(fallbackShareImage, siteUrl).toString();
  }
}

export function plainTextFromHtml(value?: string | null, max = 160) {
  const text = (value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
