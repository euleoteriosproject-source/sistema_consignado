"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  children: React.ReactNode;
  allowed: string[];
  redirect: string;
}

export function RoleGuard({ children, allowed, redirect }: Props) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  useEffect(() => {
    if (role && !allowed.includes(role)) {
      router.replace(redirect);
    }
  }, [role, allowed, redirect, router]);

  if (role && !allowed.includes(role)) return null;
  return <>{children}</>;
}
