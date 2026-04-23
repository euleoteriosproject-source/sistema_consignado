"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed={["owner", "manager"]} redirect="/admin">
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
