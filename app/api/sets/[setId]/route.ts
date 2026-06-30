import { NextResponse } from "next/server";

import { getSet, PokemonTcgApiError } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SetRouteProps = {
  params: Promise<{ setId: string }>;
};

export async function GET(_request: Request, { params }: SetRouteProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId } = await params;

  try {
    const set = await getSet(setId);

    if (!set) {
      return NextResponse.json({ error: "Set not found." }, { status: 404 });
    }

    return NextResponse.json({ set });
  } catch (error) {
    if (error instanceof PokemonTcgApiError) {
      console.error("[set-detail] upstream failure", {
        status: error.status,
        setId,
      });
      return NextResponse.json(
        { error: "Set lookup is temporarily unavailable." },
        { status: 502 },
      );
    }

    throw error;
  }
}
