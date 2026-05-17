import {
  BookmarkIcon as BookmarkOutline,
  BookOpenIcon as BookOpenOutline,
  ClipboardDocumentListIcon as ClipboardOutline,
} from "@heroicons/react/24/outline";
import {
  BookmarkIcon as BookmarkSolid,
  BookOpenIcon as BookOpenSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
} from "@heroicons/react/24/solid";
import { NavLink } from "react-router-dom";
import { trpc } from "../trpc";

interface Tab {
  to: string;
  label: string;
  outlineIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  solidIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const tabs: Tab[] = [
  {
    to: "/capture",
    label: "Capture",
    outlineIcon: BookOpenOutline,
    solidIcon: BookOpenSolid,
  },
  {
    to: "/review",
    label: "Review",
    outlineIcon: ClipboardOutline,
    solidIcon: ClipboardSolid,
  },
  {
    to: "/wordbank",
    label: "Word Bank",
    outlineIcon: BookmarkOutline,
    solidIcon: BookmarkSolid,
  },
];

export function BottomTabBar() {
  const pending = trpc.review.getPending.useQuery(undefined, {
    refetchInterval: 5_000,
  });

  const badgeCount =
    (pending.data?.sessionGroups.reduce(
      (acc, g) => acc + g.entries.length,
      0,
    ) ?? 0) + (pending.data?.oneOffs.length ?? 0);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-divider bg-surface"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className="flex flex-1">
          {({ isActive }) => {
            const Icon = isActive ? tab.solidIcon : tab.outlineIcon;
            return (
              <span
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-accent" : "text-dim"
                }`}
              >
                <span className="relative">
                  <Icon
                    className={isActive ? "h-6 w-6" : "h-6 w-6"}
                    aria-hidden="true"
                  />
                  {tab.to === "/review" && badgeCount > 0 && (
                    <span className="absolute -top-0.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white leading-none">
                      {badgeCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </span>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
