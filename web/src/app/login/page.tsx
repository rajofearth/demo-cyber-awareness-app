import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const base = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(".cloud", ".site");
  let configured = false;
  try {
    const res = await fetch(`${base}/api/auth/configured`, { cache: "no-store" });
    configured = ((await res.json()) as { configured: boolean }).configured;
  } catch {
    configured = false;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bezel px-4 text-ink">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flag opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-flag" />
            </span>
            <span className="text-[13px] font-semibold">Permission Harvest</span>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            {configured
              ? "Session expires after 30 minutes of inactivity."
              : "First run — choose the password that protects this dashboard."}
          </p>
        </div>
        <div className="mat-float rounded-[16px] p-6">
          <LoginForm configured={configured} />
        </div>
      </div>
    </div>
  );
}
