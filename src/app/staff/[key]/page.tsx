import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import { StaffSignIn } from "@/components/StaffSignIn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff", robots: { index: false, follow: false } };

/**
 * The staff sign-in page lives at a private link: /staff/<ADMIN_LOGIN_KEY>.
 * Any other key (or no key set) is a plain 404, so the page can't be found by guessing.
 * The password is still what protects the admin; the link just keeps the form out of sight.
 */
function matches(key: string) {
  const secret = process.env.ADMIN_LOGIN_KEY ?? "";
  if (secret.length < 16) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default function StaffLoginPage({ params }: { params: { key: string } }) {
  if (!matches(decodeURIComponent(params.key))) notFound();
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4">
      <StaffSignIn />
    </main>
  );
}
