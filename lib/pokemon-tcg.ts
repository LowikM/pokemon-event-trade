const API_BASE_URL = "https://api.pokemontcg.io/v2";
const REQUEST_TIMEOUT_MS = 10_000;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;

const SEARCH_SELECT = "id,name,number,set,images";
const CARD_SELECT = "id,name,number,set,images";

export type PokemonTcgCardSet = {
  id: string;
  name: string;
};

export type PokemonTcgCardImages = {
  small: string;
  large?: string;
};

export type PokemonTcgCardSearchResult = {
  id: string;
  name: string;
  number: string;
  set: PokemonTcgCardSet;
  images: PokemonTcgCardImages;
};

export type PokemonTcgCard = PokemonTcgCardSearchResult & {
  images: PokemonTcgCardImages & {
    large: string;
  };
};

type PokemonTcgApiCard = {
  id: string;
  name: string;
  number: string;
  set?: {
    id?: string;
    name?: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
};

export class PokemonTcgApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PokemonTcgApiError";
    this.status = status;
  }
}

type SearchCacheEntry = {
  expiresAt: number;
  results: PokemonTcgCardSearchResult[];
};

const searchCache = new Map<string, SearchCacheEntry>();

const CARD_NUMBER_PATTERN = /^(\d+)\s*\/\s*(\d+)$/;
const EMBEDDED_CARD_NUMBER_PATTERN = /(\d+)\s*\/\s*(\d+)/;

const CARD_NAME_SUFFIXES = new Set([
  "ex",
  "v",
  "vmax",
  "vstar",
  "gx",
  "break",
  "prime",
  "c",
  "gl",
  "rr",
  "tg",
  "lvx",
  "vunion",
]);

function escapeLuceneTerm(value: string) {
  return value.replace(/([+\-!():^[\]{}~*?\\/"|&])/g, "\\$1");
}

function escapeLucenePhrase(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export type ParsedCardNumberQuery = {
  cardNumbers: string[];
  setTotal: string;
};

export type ParsedCollectorQuery = {
  cardName: string | null;
  setName: string | null;
  cardNumber: ParsedCardNumberQuery | null;
};

function parseCardNumberParts(
  rawNumber: string,
  setTotal: string,
): ParsedCardNumberQuery {
  const normalizedNumber = String(Number.parseInt(rawNumber, 10));
  const cardNumbers = new Set<string>([normalizedNumber, rawNumber]);

  if (normalizedNumber.length === 1) {
    cardNumbers.add(normalizedNumber.padStart(2, "0"));
  }

  return {
    cardNumbers: [...cardNumbers],
    setTotal,
  };
}

export function parseCardNumberQuery(query: string): ParsedCardNumberQuery | null {
  const match = query.trim().match(CARD_NUMBER_PATTERN);
  if (!match) {
    return null;
  }

  return parseCardNumberParts(match[1], match[2]);
}

function extractEmbeddedCardNumber(query: string): {
  remainder: string;
  cardNumber: ParsedCardNumberQuery;
} | null {
  const match = query.match(EMBEDDED_CARD_NUMBER_PATTERN);
  if (!match || match.index === undefined) {
    return null;
  }

  const remainder = (
    query.slice(0, match.index) + query.slice(match.index + match[0].length)
  )
    .replace(/\s+/g, " ")
    .trim();

  return {
    remainder,
    cardNumber: parseCardNumberParts(match[1], match[2]),
  };
}

function tokenizeCollectorQuery(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function isCardNameSuffix(token: string) {
  const normalized = token.toLowerCase().replace(/\./g, "");
  return CARD_NAME_SUFFIXES.has(normalized);
}

function hasCardNameSuffix(tokens: string[]) {
  return tokens.slice(1).some(isCardNameSuffix);
}

function parseNameAndSet(remainder: string): {
  cardName: string | null;
  setName: string | null;
  usePhrase: boolean;
  useDualNameSet: boolean;
} {
  const trimmed = remainder.trim();
  if (!trimmed) {
    return {
      cardName: null,
      setName: null,
      usePhrase: false,
      useDualNameSet: false,
    };
  }

  const tokens = tokenizeCollectorQuery(trimmed);

  if (tokens.length === 1) {
    return {
      cardName: tokens[0],
      setName: null,
      usePhrase: false,
      useDualNameSet: false,
    };
  }

  if (hasCardNameSuffix(tokens)) {
    return {
      cardName: trimmed,
      setName: null,
      usePhrase: true,
      useDualNameSet: false,
    };
  }

  if (tokens.length >= 3) {
    return {
      cardName: tokens[0],
      setName: tokens.slice(1).join(" "),
      usePhrase: false,
      useDualNameSet: false,
    };
  }

  return {
    cardName: tokens[0],
    setName: tokens[1],
    usePhrase: false,
    useDualNameSet: true,
  };
}

export function parseCollectorQuery(query: string): ParsedCollectorQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    return { cardName: null, setName: null, cardNumber: null };
  }

  const numberOnly = parseCardNumberQuery(trimmed);
  if (numberOnly) {
    return { cardName: null, setName: null, cardNumber: numberOnly };
  }

  const embedded = extractEmbeddedCardNumber(trimmed);
  const { cardName, setName } = parseNameAndSet(embedded?.remainder ?? trimmed);

  return {
    cardName,
    setName,
    cardNumber: embedded?.cardNumber ?? null,
  };
}

function buildSingleWordNameClause(term: string) {
  const escaped = escapeLuceneTerm(term);
  return `(name:${escaped} OR !name:${escaped} OR name:${escaped}*)`;
}

function buildPhraseNameClause(phrase: string) {
  return `name:"${escapeLucenePhrase(phrase)}"`;
}

function buildSetNameClause(setName: string) {
  return `set.name:"${escapeLucenePhrase(setName)}"`;
}

function buildNumberSearchQuery(parsed: ParsedCardNumberQuery) {
  const numberTerms = parsed.cardNumbers.map(
    (cardNumber) => `number:${escapeLuceneTerm(cardNumber)}`,
  );
  const numberClause =
    numberTerms.length > 1 ? `(${numberTerms.join(" OR ")})` : numberTerms[0];

  return `${numberClause} set.printedTotal:${escapeLuceneTerm(parsed.setTotal)}`;
}

function buildNameClause(
  cardName: string,
  options: { usePhrase: boolean; useDualNameSet: boolean; setName: string | null },
) {
  if (options.useDualNameSet && options.setName) {
    const phrase = buildPhraseNameClause(`${cardName} ${options.setName}`);
    const split = `(${buildSingleWordNameClause(cardName)} AND ${buildSetNameClause(options.setName)})`;
    return `(${phrase} OR ${split})`;
  }

  if (options.usePhrase || cardName.includes(" ")) {
    return buildPhraseNameClause(cardName);
  }

  return buildSingleWordNameClause(cardName);
}

export function buildCardSearchQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return "";
  }

  const numberOnly = parseCardNumberQuery(trimmed);
  if (numberOnly) {
    return buildNumberSearchQuery(numberOnly);
  }

  const embedded = extractEmbeddedCardNumber(trimmed);
  const parsed = parseNameAndSet(embedded?.remainder ?? trimmed);
  const clauses: string[] = [];

  if (parsed.cardName) {
    clauses.push(
      buildNameClause(parsed.cardName, {
        usePhrase: parsed.usePhrase,
        useDualNameSet: parsed.useDualNameSet,
        setName: parsed.setName,
      }),
    );
  } else if (parsed.setName) {
    clauses.push(buildSetNameClause(parsed.setName));
  }

  if (parsed.setName && !parsed.useDualNameSet && parsed.cardName) {
    clauses.push(buildSetNameClause(parsed.setName));
  }

  if (embedded?.cardNumber) {
    clauses.push(buildNumberSearchQuery(embedded.cardNumber));
  }

  if (clauses.length === 0) {
    return buildSingleWordNameClause(trimmed);
  }

  return clauses.join(" ");
}

/** @deprecated Use buildCardSearchQuery */
export function buildCardNameSearchQuery(query: string) {
  return buildCardSearchQuery(query);
}

function getApiHeaders() {
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  const apiKey = process.env.POKEMON_TCG_API_KEY?.trim();
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  return headers;
}

function normalizeSearchResult(card: PokemonTcgApiCard): PokemonTcgCardSearchResult {
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    set: {
      id: card.set?.id ?? "",
      name: card.set?.name ?? "",
    },
    images: {
      small: card.images?.small ?? "",
    },
  };
}

function normalizeCard(card: PokemonTcgApiCard): PokemonTcgCard {
  const normalized = normalizeSearchResult(card);

  return {
    ...normalized,
    images: {
      small: normalized.images.small,
      large: card.images?.large ?? normalized.images.small,
    },
  };
}

async function fetchPokemonTcg<T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: getApiHeaders(),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[pokemon-tcg] upstream error", {
        status: response.status,
        url: url.toString(),
        body: body.slice(0, 500),
      });
      throw new PokemonTcgApiError(
        response.status,
        body || `Pokémon TCG API request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof PokemonTcgApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      console.error("[pokemon-tcg] request timed out", url.toString());
      throw new PokemonTcgApiError(504, "Pokémon TCG API request timed out");
    }

    console.error(
      "[pokemon-tcg] unexpected fetch error",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchCards(
  query: string,
  pageSize = 50,
): Promise<PokemonTcgCardSearchResult[]> {
  const q = buildCardSearchQuery(query);
  if (!q) {
    return [];
  }

  const normalizedPageSize = Math.min(Math.max(pageSize, 1), 250);
  const cacheKey = `${q}:${normalizedPageSize}`;
  const cached = searchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const response = await fetchPokemonTcg<{ data: PokemonTcgApiCard[] }>(
    "/cards",
    {
      q,
      pageSize: String(normalizedPageSize),
      orderBy: "-set.releaseDate,name",
      select: SEARCH_SELECT,
    },
  );

  const results = (response.data ?? []).map(normalizeSearchResult);

  searchCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    results,
  });

  return results;
}

export async function getCardById(
  tcgApiCardId: string,
): Promise<PokemonTcgCard | null> {
  const trimmedId = tcgApiCardId.trim();
  if (!trimmedId) {
    return null;
  }

  try {
    const response = await fetchPokemonTcg<{ data: PokemonTcgApiCard }>(
      `/cards/${encodeURIComponent(trimmedId)}`,
      {
        select: CARD_SELECT,
      },
    );

    if (!response.data) {
      return null;
    }

    return normalizeCard(response.data);
  } catch (error) {
    if (error instanceof PokemonTcgApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getCardImagesById(tcgApiCardId: string) {
  const card = await getCardById(tcgApiCardId);
  if (!card?.images?.small) {
    return null;
  }

  return {
    small: card.images.small,
    large: card.images.large ?? card.images.small,
  };
}
