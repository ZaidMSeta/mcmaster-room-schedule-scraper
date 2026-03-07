import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { DoorOpen, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../data/auth-context";
import { AppFooter } from "./app-footer";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = email.trim() && password.trim() && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setIsSubmitting(true);

    try {
      const success = await login(email.trim(), password);
      if (success) {
        navigate("/");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Content */}
      <main className="flex-1 flex items-start justify-center pt-20 px-6">
        <div className="w-full max-w-[400px]">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-medium text-foreground tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Sign in to access your preferences and recent searches.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-[13px] text-muted-foreground mb-1.5 block">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    autoComplete="email"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-[14px]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] text-muted-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors"
                    onClick={() => {}}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-[#ffebee] border border-[#ffcdd2] px-3.5 py-2.5">
                  <p className="text-[13px] text-[#c62828]">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-10 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 text-[14px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          {/* Sign up link */}
          <p className="text-center mt-6 text-[13px] text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>

          {/* Continue without account */}
          <div className="text-center mt-3 mb-12">
            <Link
              to="/"
              className="text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Continue without an account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}