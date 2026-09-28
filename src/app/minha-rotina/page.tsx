import { createClient } from "@/utils/supabase/server";
import type { Tag } from "@/lib/tags";
import MinhaRotinaClient from "./MinhaRotinaClient";

export const revalidate = 0;

export default async function MinhaRotina() {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id,name,slug,type").eq("type", "concern").order("name", { ascending: true });
  const concernTags = ((data || []) as Tag[]).map((tag) => ({ slug: tag.slug, name: tag.name }));

  return <MinhaRotinaClient concernTags={concernTags} />;
}
