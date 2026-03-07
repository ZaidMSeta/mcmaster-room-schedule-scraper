import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { DoorOpen, Mail, Lock, User, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { useAuth } from "../data/auth-context";
import { AppFooter } from "./app-footer";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <div key={check.label} className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
              check.met
                ? "bg-[#e8f5e9] text-[#2e7d32]"
                : "bg-muted text-muted-foreground/40"
            }`}
          >
            <Check className="w-2.5 h-2.5" />
          </div>
          <span
            className={`text-[12px] ${
              check.met ? "text-[#2e7d32]" : "text-muted-foreground/60"
            }`}
          >
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isPasswordValid =
    password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password);
  const canSubmit =
    name.trim() && email.trim() && isPasswordValid && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setIsSubmitting(true);

    try {
      const success = await signup(name.trim(), email.trim(), password);
      if (success) {
        navigate("/");
      } else {
        setError("Something went wrong. Please try again.");
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
      <main className="flex-1 flex items-start justify-center pt-16 px-6">
        <div className="w-full max-w-[400px]">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-medium text-foreground tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Save your preferences and pick up where you left off.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[13px] text-muted-foreground mb-1.5 block">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors text-[14px]"
                  />
                </div>
              </div>

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
                <label className="text-[13px] text-muted-foreground mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
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
                <PasswordStrength password={password} />
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
                  "Create account"
                )}
              </button>
            </form>
          </div>

          {/* Terms note */}
          <p className="text-center mt-4 text-[12px] text-muted-foreground/60 max-w-[320px] mx-auto leading-relaxed">
            By creating an account you agree to our terms. Your data stays on this device.
          </p>

          {/* Login link */}
          <p className="text-center mt-5 text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in
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