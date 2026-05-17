import { useState } from "react";
import { trpc } from "../../trpc";
import { EntryCard } from "./EntryCard";
import { RejectedEntryCard } from "./RejectedEntryCard";

export function ReviewScreen() {
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const utils = trpc.useUtils();

  const pending = trpc.review.getPending.useQuery(undefined, {
    refetchInterval: 5_000,
  });

  const rejected = trpc.review.getRejected.useQuery(undefined, {
    refetchInterval: 5_000,
  });

  const approve = trpc.review.approve.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
    },
  });

  const approveAll = trpc.review.approveAll.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
    },
  });

  const reEnrich = trpc.review.reEnrich.useMutation({
    onSuccess: () => {
      utils.review.getPending.invalidate();
      utils.review.getRejected.invalidate();
    },
  });

  const groupCount = pending.data?.sessionGroups.length ?? 0;
  const oneOffCount = pending.data?.oneOffs.length ?? 0;
  const total =
    groupCount > 0 || oneOffCount > 0
      ? (pending.data?.sessionGroups ?? []).reduce(
          (acc, g) => acc + g.entries.length,
          0,
        ) + (pending.data?.oneOffs.length ?? 0)
      : 0;

  if (pending.isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center pb-16">
        <p className="font-ui text-dim">Loading…</p>
      </main>
    );
  }

  if (pending.isError || total === 0) {
    return (
      <main className="flex flex-1 items-center justify-center pb-16">
        <p className="font-ui text-dim">All caught up</p>
      </main>
    );
  }

  const rejectedCount = rejected.data?.length ?? 0;

  return (
    <main className="flex flex-1 flex-col pb-16">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="font-display text-lg font-bold text-ink">Review</h1>
        <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-semibold text-accent">
          {total}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-5">
        {/* Inline by design (2 uses). Extract at 3+ uses. See ADR 0006. */}
        {pending.data?.sessionGroups.map(group => (
          <section key={group.sessionId} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink">
                  {group.sourceName}
                </h2>
                <p className="text-xs text-dim">{group.sourceType}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  approveAll.mutate({
                    entryIds: group.entries.map(e => e.id),
                  })
                }
                disabled={approveAll.isPending}
                className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve all ({group.entries.length})
              </button>
            </div>

            {group.entries.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isApproving={approve.isPending}
                isRejecting={rejectingId === entry.id}
                onApprove={id => approve.mutate({ entryId: id })}
                onToggleReject={id =>
                  setRejectingId(rejectingId === id ? null : id)
                }
              />
            ))}
          </section>
        ))}

        {/* Inline by design (2 uses). Extract at 3+ uses. See ADR 0006. */}
        {pending.data && pending.data.oneOffs.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink">
                  One-offs
                </h2>
                <p className="text-xs text-dim">No source</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  approveAll.mutate({
                    entryIds: pending.data.oneOffs.map(e => e.id),
                  })
                }
                disabled={approveAll.isPending}
                className="rounded-button border border-accent px-2.5 py-1 text-xs font-medium text-accent cursor-pointer hover:bg-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve all ({pending.data.oneOffs.length})
              </button>
            </div>

            {pending.data.oneOffs.map(entry => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isApproving={approve.isPending}
                isRejecting={rejectingId === entry.id}
                onApprove={id => approve.mutate({ entryId: id })}
                onToggleReject={id =>
                  setRejectingId(rejectingId === id ? null : id)
                }
              />
            ))}
          </section>
        )}

        {/* Inline by design (1 use). Extract at 3+ uses. See ADR 0006. */}
        {rejectedCount > 0 && (
          <section className="mb-5">
            <button
              type="button"
              onClick={() => setShowRejected(!showRejected)}
              className="flex items-center gap-2 w-full text-left mb-2 p-2 rounded-button hover:bg-surface cursor-pointer"
            >
              <svg
                className={`h-3.5 w-3.5 text-dim transition-transform ${showRejected ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-display text-sm font-semibold text-dim">
                Rejected
              </span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                {rejectedCount}
              </span>
            </button>

            {showRejected &&
              rejected.data?.map(entry => (
                <RejectedEntryCard
                  key={entry.id}
                  entry={entry}
                  onReEnrich={id => reEnrich.mutate({ entryId: id })}
                />
              ))}
          </section>
        )}
      </div>
    </main>
  );
}
