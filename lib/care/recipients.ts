import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CareRecipient = {
  id: string;
  name: string;
  initials: string;
  relationship: string;
  routine: {
    wake: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    bedtime: string;
  };
};

export async function getCareRecipients(): Promise<CareRecipient[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("care_circle_memberships")
    .select("circle_id");
  const circleIds = memberships?.map((membership) => membership.circle_id) ?? [];
  if (!circleIds.length) return [];

  const { data } = await supabase
    .from("care_recipients")
    .select("id, display_name, routine")
    .in("circle_id", circleIds)
    .order("created_at");

  return (data ?? []).map((recipient) => ({
    id: recipient.id,
    name: recipient.display_name,
    relationship: "Care recipient",
    initials: recipient.display_name
      .split(/\s+/)
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    routine: recipient.routine as CareRecipient["routine"],
  }));
}
