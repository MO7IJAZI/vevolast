import { PropsWithChildren } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function HasPermission({ permission, children }: PropsWithChildren<{ permission: string }>) {
  const { isAdmin, hasPermission } = useAuth();
  if (isAdmin || hasPermission(permission)) return <>{children}</>;
  return null;
}

export function HasAnyPermission({ permissions, children }: PropsWithChildren<{ permissions: string[] }>) {
  const { isAdmin, hasAnyPermission } = useAuth();
  if (isAdmin || hasAnyPermission(...permissions)) return <>{children}</>;
  return null;
}

export function HasResourcePermission({ resource, children }: PropsWithChildren<{ resource: string }>) {
  const { isAdmin, hasResourcePermission } = useAuth() as any;
  if (isAdmin || (hasResourcePermission && hasResourcePermission(resource))) return <>{children}</>;
  return null;
}
