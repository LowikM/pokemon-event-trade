import { NextResponse } from "next/server";

import { getCardsForSet, PokemonTcgApiError } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SetCardsRouteProps = {
  params: Promise<{ setId: string }>;
};

export async function GET(_request: Request, { params }: SetCardsRouteProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { setId } = await params;

  try {
    const cards = await getCardsForSet(setId);
    return NextResponse.json({ cards });
  } catch (error) {
    if (error instanceof PokemonTcgApiError) {
      console.error("[set-cards] upstream failure", {
        status: error.status,
        setId,
      });
      return NextResponse.json(
        { error: "Set cards are temporarily unavailable." },
        { status: 502 },
      );
    }

    throw error;
  }
}
