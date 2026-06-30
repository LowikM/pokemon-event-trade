export const RECENT_SETS_COOKIE = "pet_recent_sets";
export const RECENT_SETS_MAX = 5;
export const RECENT_SETS_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export function parseRecentSetIds(raw: string | undefined) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return [
      ...new Set(
        parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].slice(0, RECENT_SETS_MAX);
  } catch {
    return [];
  }
}

export function pushRecentSetId(existing: string[], setId: string) {
  const trimmed = setId.trim();

  if (!trimmed) {
    return existing;
  }

  return [trimmed, ...existing.filter((id) => id !== trimmed)].slice(
    0,
    RECENT_SETS_MAX,
  );
}

export function mergeRecentSetIds(
  visitedSetIds: string[],
  activitySetIds: string[],
  limit = RECENT_SETS_MAX,
) {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const setId of [...visitedSetIds, ...activitySetIds]) {
    if (seen.has(setId)) {
      continue;
    }

    seen.add(setId);
    merged.push(setId);

    if (merged.length >= limit) {
      break;
    }
  }

  return merged;
}

export async function recordRecentSetVisit(setId: string) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const existing = parseRecentSetIds(cookieStore.get(RECENT_SETS_COOKIE)?.value);
  const next = pushRecentSetId(existing, setId);

  cookieStore.set(RECENT_SETS_COOKIE, JSON.stringify(next), {
    path: "/",
    maxAge: RECENT_SETS_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
