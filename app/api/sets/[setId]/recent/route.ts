import { NextResponse } from "next/server";

import { recordRecentSetVisit } from "@/lib/recent-sets";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RecentSetRouteProps = {
  params: Promise<{ setId: string }>;
};

export async function POST(_request: Request, { params }: RecentSetRouteProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId } = await params;
  const trimmed = setId.trim();

  if (!trimmed) {
    return NextResponse.json({ error: "Invalid set id." }, { status: 400 });
  }

  await recordRecentSetVisit(trimmed);

  return NextResponse.json({ ok: true });
}
