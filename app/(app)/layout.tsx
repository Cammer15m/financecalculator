import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <a href="/dashboard" className="hover:underline">
            Dashboard
          </a>
          <a href="/calculators" className="hover:underline">
            Calculators
          </a>
          {user.role === "admin" && (
            <a href="/admin/users" className="hover:underline">
              Admin
            </a>
          )}
        </nav>
        <form action="/logout" method="post">
          <button type="submit" className="text-sm hover:underline">
            Sign out
          </button>
        </form>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
