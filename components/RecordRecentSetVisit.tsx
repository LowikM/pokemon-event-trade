"use client";

import { useEffect } from "react";

type RecordRecentSetVisitProps = {
  setId: string;
};

export function RecordRecentSetVisit({ setId }: RecordRecentSetVisitProps) {
  useEffect(() => {
    const trimmed = setId.trim();

    if (!trimmed) {
      return;
    }

    void fetch(`/api/sets/${encodeURIComponent(trimmed)}/recent`, {
      method: "POST",
    });
  }, [setId]);

  return null;
}
