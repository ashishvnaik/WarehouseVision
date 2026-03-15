import { useState } from "react";
import { Camera, Eye, EyeOff, ArrowLeft, Zap, BarChart3, Code2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

const ROLES: {
  value: Role;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  passwordRequired: boolean;
}[] = [
  { value: "operator",   label: "Operator",   description: "Upload and analyze warehouse images", icon: Zap,         passwordRequired: true },
  { value: "supervisor", label: "Supervisor",  description: "Manage inventory and review results",  icon: BarChart3,   passwordRequired: true },
  { value: "programmer", label: "Programmer",  description: "Configure AI models and prompts",      icon: Code2,       passwordRequired: true },
  { value: "superuser",  label: "SuperUser",   description: "Full system access",                   icon: ShieldCheck, passwordRequired: true },
];

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleClick = (role: (typeof ROLES)[number]) => {
    if (!role.passwordRequired) {
      setLocation("/upload");
      return;
    }
    setSelectedRole(role.value);
    setPassword("");
    setError("");
  };

  const handleBack = () => {
    setSelectedRole(null);
    setPassword("");
    setError("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError("");
    setIsLoading(true);
    try {
      await login(selectedRole, password);
    } catch {
      setError("Incorrect password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeRoleMeta = ROLES.find((r) => r.value === selectedRole);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-primary">
            <Camera className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">WarehouseVision</h1>
            <p className="text-sm text-muted-foreground">AI Inventory Management</p>
          </div>
        </div>

        {/* Role selection */}
        {!selectedRole && (
          <div className="space-y-4">
            <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Select your role
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleRoleClick(r)}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left group"
                  >
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{r.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{r.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Password step */}
        {selectedRole && activeRoleMeta && (
          <div className="space-y-5">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-primary bg-primary/5">
              <div className="p-2 rounded-lg bg-primary/10">
                <activeRoleMeta.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">{activeRoleMeta.label}</div>
                <div className="text-xs text-muted-foreground">{activeRoleMeta.description}</div>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
