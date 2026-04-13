import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <a href="/dashboard" className="hover:underline">
            ← App
          </a>
          <span className="text-gray-400">|</span>
          <a href="/admin/users" className="hover:underline">
            Users
          </a>
          <a href="/admin/logs" className="hover:underline">
            Logs
          </a>
          <a href="/admin/flags" className="hover:underline">
            Flags
          </a>
          <a href="/admin/settings" className="hover:underline">
            Settings
          </a>
        </nav>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
