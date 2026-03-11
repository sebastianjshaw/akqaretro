import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign-in link has expired or was already used.",
  Default: "Something went wrong during sign-in.",
  OAuthAccountNotLinked: "This email is already linked to another sign-in method.",
  OAuthCallback: "Error in the OAuth callback. Check that your redirect URI in Google Cloud Console exactly matches your production URL.",
  OAuthCreateAccount: "Could not create account.",
  OAuthSignin: "Error starting the sign-in process.",
  SessionRequired: "Please sign in to continue.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default : ERROR_MESSAGES.Default;

  return (
    <div className="akqaretro-auth-error min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
      <div className="akqaretro-auth-error__box border border-[var(--akqa-border)] bg-[var(--akqa-white)] dark:bg-[#2a2a2a] p-8 max-w-md text-center">
        <h1 className="akqaretro-headline text-lg font-normal text-[var(--foreground)] mb-2">
          Sign-in error
        </h1>
        <p className="akqaretro-caption text-[var(--akqa-muted)] mb-6">{message}</p>
        {error === "Configuration" && (
          <div className="akqaretro-auth-error__config text-left mb-6 space-y-2">
            <p className="akqaretro-caption text-[var(--akqa-muted)]">
              On Vercel, open the project → <strong>Settings → Environment Variables</strong> and ensure these are set for <strong>Production</strong> (and redeploy after adding or changing them):
            </p>
            <ul className="akqaretro-caption text-[var(--akqa-muted)] list-disc list-inside space-y-1">
              <li><code className="text-xs">AUTH_SECRET</code> – required; e.g. run <code className="text-xs">npx auth secret</code> and paste the value</li>
              <li><code className="text-xs">AUTH_GOOGLE_ID</code> – from Google Cloud Console → Credentials → OAuth client ID</li>
              <li><code className="text-xs">AUTH_GOOGLE_SECRET</code> – from the same OAuth client</li>
            </ul>
            <p className="akqaretro-caption text-[var(--akqa-muted)]">
              If any are missing or wrong, fix them and trigger a new deployment.
            </p>
          </div>
        )}
        {error === "OAuthCallback" && (
          <p className="akqaretro-caption text-[var(--akqa-muted)] mb-4 text-left">
            In Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs, add exactly:{" "}
            <code className="block mt-2 p-2 bg-[var(--akqa-border)] text-xs break-all">
              https://your-production-domain.vercel.app/api/auth/callback/google
            </code>
            and set <code className="text-xs">AUTH_URL</code> in Vercel to{" "}
            <code className="text-xs break-all">https://your-production-domain.vercel.app</code>.
          </p>
        )}
        <Link
          href="/"
          className="akqaretro-auth-error__link inline-block text-sm text-[var(--akqa-dove)] dark:text-[var(--akqa-dusty)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
