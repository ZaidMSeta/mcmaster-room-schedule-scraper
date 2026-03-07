import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BUILDINGS } from "./rooms";

export interface UserPreferences {
  defaultBuilding: string;
  showFreeFirst: boolean;
}

export interface RecentItem {
  id: string;
  label: string;
  timestamp: number;
}

export interface User {
  name: string;
  email: string;
  preferences: UserPreferences;
  recentViews: RecentItem[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  updateProfile: (data: { name?: string; email?: string }) => void;
  addRecentView: (item: RecentItem) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "roomfinder_user";

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = loadUser();
    setUser(stored);
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));
    const stored = loadUser();
    if (stored && stored.email === email) {
      setUser(stored);
      return true;
    }
    // For demo: auto-create on login if no account
    const newUser: User = {
      name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      preferences: {
        defaultBuilding: "All Buildings",
        showFreeFirst: true,
      },
      recentViews: [],
    };
    setUser(newUser);
    saveUser(newUser);
    return true;
  };

  const signup = async (name: string, email: string, _password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 600));
    const newUser: User = {
      name,
      email,
      preferences: {
        defaultBuilding: "All Buildings",
        showFreeFirst: true,
      },
      recentViews: [],
    };
    setUser(newUser);
    saveUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    saveUser(null);
  };

  const updatePreferences = (prefs: Partial<UserPreferences>) => {
    if (!user) return;
    const updated = { ...user, preferences: { ...user.preferences, ...prefs } };
    setUser(updated);
    saveUser(updated);
  };

  const updateProfile = (data: { name?: string; email?: string }) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    saveUser(updated);
  };

  const addRecentView = (item: RecentItem) => {
    if (!user) return;
    const filtered = user.recentViews.filter((r) => r.id !== item.id);
    const updated = {
      ...user,
      recentViews: [item, ...filtered].slice(0, 8),
    };
    setUser(updated);
    saveUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, updatePreferences, updateProfile, addRecentView }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
