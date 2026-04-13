import { login } from "./actions";

type Props = {
  searchParams: { reason?: string; next?: string; error?: string };
};

export default function LoginPage({ searchParams }: Props) {
  const { reason, next, error } = searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

      {reason === "disabled" && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          This account has been disabled. Contact an administrator.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <form action={login} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
