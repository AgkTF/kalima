import {
  BookmarkIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { NavLink } from "react-router-dom";

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const tabs: Tab[] = [
  { to: "/capture", label: "Capture", icon: BookOpenIcon },
  { to: "/review", label: "Review", icon: ClipboardDocumentListIcon },
  { to: "/wordbank", label: "Word Bank", icon: BookmarkIcon },
];

export function BottomTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-divider bg-surface"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? "text-accent" : "text-dim"
            }`
          }
        >
          <tab.icon className="h-6 w-6" aria-hidden="true" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
