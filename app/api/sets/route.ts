import { NextResponse } from "next/server";

import { PokemonTcgApiError, searchSets } from "@/lib/pokemon-tcg";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 250;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Query is too long." }, { status: 400 });
  }

  const pageSizeParam = searchParams.get("pageSize");
  const pageSize = pageSizeParam
    ? Number.parseInt(pageSizeParam, 10)
    : DEFAULT_PAGE_SIZE;

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return NextResponse.json(
      { error: `Invalid pageSize. Must be between 1 and ${MAX_PAGE_SIZE}.` },
      { status: 400 },
    );
  }

  try {
    const results = await searchSets(query, pageSize);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof PokemonTcgApiError) {
      console.error("[sets-search] upstream failure", {
        status: error.status,
        query,
      });
      return NextResponse.json(
        { error: "Set search is temporarily unavailable." },
        { status: 502 },
      );
    }

    throw error;
  }
}
