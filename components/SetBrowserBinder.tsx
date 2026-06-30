"use client";

import type { PokemonTcgSetCard } from "@/lib/pokemon-tcg";
import type { BinderPageSummary, SetCardFilter } from "@/lib/set-browser";
import { SetBrowserCard } from "@/components/SetBrowserCard";

type SetBrowserBinderProps = {
  setId: string;
  ownedIds: ReadonlySet<string>;
  wantedIds: ReadonlySet<string>;
  selectedIds: ReadonlySet<string>;
  onToggleCard: (cardId: string, checked: boolean) => void;
  currentPage: number;
  pageCount: number;
  pageSummaries: BinderPageSummary[];
  pageCards: PokemonTcgSetCard[];
  statusFilter: SetCardFilter;
  onPageChange: (page: number) => void;
  pagesDrawerOpen: boolean;
  onPagesDrawerOpenChange: (open: boolean) => void;
};

const toolbarButtonClassName =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function PageOverviewList({
  pageSummaries,
  currentPage,
  onPageChange,
}: {
  pageSummaries: BinderPageSummary[];
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <ul className="space-y-1">
      {pageSummaries.map((summary) => {
        const isActive = summary.page === currentPage;

        return (
          <li key={summary.page}>
            <button
              type="button"
              onClick={() => onPageChange(summary.page)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                isActive
                  ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
                  : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Page {summary.page}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {summary.completionPercent}%
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {summary.owned} / {summary.total} owned
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SetBrowserBinder({
  setId,
  ownedIds,
  wantedIds,
  selectedIds,
  onToggleCard,
  currentPage,
  pageCount,
  pageSummaries,
  pageCards,
  statusFilter,
  onPageChange,
  pagesDrawerOpen,
  onPagesDrawerOpenChange,
}: SetBrowserBinderProps) {
  function handleJumpToPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const raw = formData.get("page");

    if (typeof raw !== "string") {
      return;
    }

    const parsed = Number.parseInt(raw, 10);

    if (!Number.isInteger(parsed)) {
      return;
    }

    onPageChange(parsed);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="hidden w-56 shrink-0 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 lg:block">
        <h3 className="mb-3 text-sm font-medium">Pages</h3>
        <PageOverviewList
          pageSummaries={pageSummaries}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={toolbarButtonClassName}
            >
              Previous page
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className={toolbarButtonClassName}
            >
              Next page
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {currentPage} / {pageCount}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPagesDrawerOpenChange(true)}
              className={`${toolbarButtonClassName} lg:hidden`}
            >
              Pages
            </button>
            <form
              onSubmit={handleJumpToPage}
              className="flex items-center gap-2"
            >
              <label htmlFor="binder-jump-page" className="sr-only">
                Jump to page
              </label>
              <input
                id="binder-jump-page"
                name="page"
                type="number"
                min={1}
                max={pageCount}
                defaultValue={currentPage}
                key={currentPage}
                className={`${inputClassName} w-20`}
              />
              <button type="submit" className={toolbarButtonClassName}>
                Go
              </button>
            </form>
          </div>
        </div>

        {statusFilter !== "all" ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Binder pages always show the full set. Cards that do not match the
            current filter appear as empty slots.
          </p>
        ) : null}

        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {pageCards.map((card) => (
            <li key={card.id}>
              <SetBrowserCard
                card={card}
                setId={setId}
                ownedIds={ownedIds}
                wantedIds={wantedIds}
                isSelected={selectedIds.has(card.id)}
                onSelectChange={(checked) => onToggleCard(card.id, checked)}
                mode="binder"
                statusFilter={statusFilter}
              />
            </li>
          ))}
        </ul>
      </div>

      {pagesDrawerOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close pages overview"
            className="absolute inset-0 bg-black/40"
            onClick={() => onPagesDrawerOpenChange(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-sm font-medium">Pages</h3>
              <button
                type="button"
                onClick={() => onPagesDrawerOpenChange(false)}
                className={toolbarButtonClassName}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PageOverviewList
                pageSummaries={pageSummaries}
                currentPage={currentPage}
                onPageChange={(page) => {
                  onPageChange(page);
                  onPagesDrawerOpenChange(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
