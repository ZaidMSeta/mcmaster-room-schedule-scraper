import { DoorOpen } from "lucide-react";

const links = [
  { label: "About", href: "#" },
  { label: "How it works", href: "#" },
  { label: "Feedback", href: "#" },
  { label: "GitHub", href: "#" },
];

export function AppFooter() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-[13px] font-medium text-muted-foreground">
                RoomFinder
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground/60 max-w-xs leading-relaxed">
              Results are generated from published timetable data and may not
              reflect real-time room occupancy.
            </p>
          </div>

          <nav className="flex items-center gap-4 flex-shrink-0">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
