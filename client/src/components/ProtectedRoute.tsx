import { Redirect } from "wouter";
import { useAuth, type Role } from "@/contexts/AuthContext";
import { ShieldX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <ShieldX className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Access Denied</h1>
      <p className="text-muted-foreground max-w-sm">
        Your role does not have permission to access this page.
      </p>
    </div>
  );
}

interface ProtectedRouteProps {
  component: React.ComponentType;
  allowedRoles: Role[];
}

export function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!role) return <Redirect to="/login" />;
  if (!allowedRoles.includes(role)) return <ForbiddenPage />;
  return <Component />;
}
