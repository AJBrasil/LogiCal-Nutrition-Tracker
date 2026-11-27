import { BookOpen, BarChart2, LayoutDashboard, Target } from "lucide-react";

import type { Screen } from "../types";

interface TabBarProps {
  activeScreen: Screen;
  onTabChange: (screen: Screen) => void;
}

const tabs: { screen: Screen; label: string; Icon: typeof LayoutDashboard }[] = [
  { screen: "dashboard", label: "Log", Icon: LayoutDashboard },
  { screen:"foods",label:"Foods",Icon:BookOpen },
  { screen: "analytics", label: "Progress", Icon: BarChart2 },
  { screen: "goals", label: "Goals", Icon: Target },
];

export default function TabBar({ activeScreen, onTabChange, sidebar = false }: TabBarProps & { sidebar?: boolean }) {
  return (
    <nav aria-label="Main navigation"
      className={sidebar ? "desktop-tabs" : "mobile-tabs flex items-center px-4 pt-2 shrink-0"}
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      {tabs.map(({ screen, label, Icon }) => {
        const active = activeScreen === screen;

        return (
          <button
            aria-current={active ? "page" : undefined}
            key={screen}
            className="flex-1 flex flex-col items-center gap-1 py-1"
            onClick={() => onTabChange(screen)}
          >
            <Icon size={20} className={active ? undefined : "text-muted-foreground"} style={active ? { color: "#00D98A" } : undefined} />
            <span
              className={`text-[9px] tracking-wider uppercase${active ? "" : " text-muted-foreground"}`}
              style={{ color: active ? "#00D98A" : undefined, fontFamily: "Inter, sans-serif" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
