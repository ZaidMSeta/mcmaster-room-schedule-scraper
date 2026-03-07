import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  DoorOpen,
  Clock,
  ArrowLeft,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Check,
  Building2,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { BUILDINGS, CURRENT_HOUR, CURRENT_MIN, formatTime, rooms } from "../data/rooms";
import { useAuth } from "../data/auth-context";
import { AppFooter } from "./app-footer";

export function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, updatePreferences, updateProfile } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [showSaved, setShowSaved] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/60 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <DoorOpen className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <span className="text-[17px] font-medium text-foreground tracking-tight">
                RoomFinder
              </span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-start justify-center pt-24 px-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <h1 className="text-[22px] font-medium text-foreground tracking-tight mb-2">
              Not signed in
            </h1>
            <p className="text-[14px] text-muted-foreground mb-6 max-w-[300px] mx-auto">
              Sign in to save your preferences and see recently viewed rooms.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/login"
                className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors inline-flex items-center gap-2 text-[14px]"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="h-10 px-5 bg-card hover:bg-accent border border-border text-foreground rounded-lg transition-colors inline-flex items-center gap-2 text-[14px]"
              >
                Create account
              </Link>
            </div>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSaveName = () => {
    if (editName.trim() && editName.trim() !== user.name) {
      updateProfile({ name: editName.trim() });
      flashSaved();
    }
    setIsEditingName(false);
  };

  const flashSaved = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleBuildingChange = (value: string) => {
    updatePreferences({ defaultBuilding: value });
    flashSaved();
  };

  const handleSortToggle = () => {
    updatePreferences({ showFreeFirst: !user.preferences.showFreeFirst });
    flashSaved();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <DoorOpen className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-[15px] font-medium text-foreground">RoomFinder</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(CURRENT_HOUR, CURRENT_MIN)}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        {/* Saved indicator */}
        {showSaved && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-[13px] font-medium">
            <Check className="w-3.5 h-3.5" />
            Saved
          </div>
        )}

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-[18px] font-medium text-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setEditName(user.name);
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="h-9 px-3 rounded-lg border border-primary/30 bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-[15px]"
                />
                <button
                  onClick={handleSaveName}
                  className="h-9 px-3 bg-primary text-primary-foreground rounded-lg text-[13px] hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditName(user.name);
                  setIsEditingName(true);
                }}
                className="text-[18px] font-medium text-foreground tracking-tight hover:text-primary transition-colors text-left"
              >
                {user.name}
              </button>
            )}
            <p className="text-[13px] text-muted-foreground mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Preferences section */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-[12px] text-muted-foreground uppercase tracking-wide">
              Preferences
            </h2>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
            {/* Default building */}
            <div className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] text-foreground">Default building</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Pre-fill building when searching
                </p>
              </div>
              <div className="relative flex-shrink-0">
                <select
                  value={user.preferences.defaultBuilding}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="h-9 pl-3 pr-8 rounded-lg border border-border bg-input-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-[13px] min-w-[160px]"
                >
                  {BUILDINGS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Sort preference */}
            <div className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] text-foreground">Show available first</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Sort results by availability by default
                </p>
              </div>
              <button
                onClick={handleSortToggle}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  user.preferences.showFreeFirst
                    ? "bg-primary"
                    : "bg-switch-background"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    user.preferences.showFreeFirst
                      ? "translate-x-[22px]"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Recent views */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-[12px] text-muted-foreground uppercase tracking-wide">
              Recently viewed
            </h2>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm">
            {user.recentViews.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">
                  Rooms you view will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {user.recentViews.map((item) => {
                  const room = rooms.find((r) => r.id === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(`/results?room=${item.label.split(" ")[1] || ""}`);
                      }}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[14px] text-foreground">{item.label}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {room?.building || ""}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Sign out */}
        <section className="mb-12">
          <button
            onClick={handleLogout}
            className="w-full bg-card rounded-xl border border-border shadow-sm px-4 py-3.5 flex items-center gap-3 hover:bg-accent/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#ffebee] flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5 text-[#c62828]" />
            </div>
            <div className="text-left">
              <p className="text-[14px] text-foreground">Sign out</p>
              <p className="text-[12px] text-muted-foreground">
                Your preferences are saved on this device
              </p>
            </div>
          </button>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}