import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";

// Stand-in for mactrack's Layout (same header bar and theme toggle) so the page can be
// reviewed here as it will look there. Not carried over in the merge.
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-9 h-9" aria-label="Toggle theme">
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  const icons = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  };

  const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label = `Switch to ${nextTheme} mode`;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      className="text-white hover:bg-white/10 hover:text-[#ffc845] transition-colors w-9 h-9"
      aria-label={label}
      title={label}
    >
      {icons[theme as keyof typeof icons] ?? icons.system}
    </Button>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-[#5a0028] bg-[#7A003C] shadow-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-md">
              <span className="text-xl font-bold text-[#7A003C]">M</span>
            </div>
            <span className="font-bold text-lg text-white leading-tight">Room Radar</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
