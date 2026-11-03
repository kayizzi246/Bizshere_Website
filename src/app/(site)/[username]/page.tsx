import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { site } from "@/config/site";
import { pinAccount, portalOf, USERNAME } from "@/lib/pin-accounts";
import { PinLogin } from "@/components/PinLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

/**
 * Personal sign-in address for a seller or expert: the site address followed by their username
 * (e.g. bizsphere.ug/kampala-bakers), made when the team registers their login and sent in the
 * PIN text. It asks for the PIN only, then opens their dashboard. Real pages always win over
 * this address (Next.js matches fixed routes first, and usernames never take a page's name);
 * anything that isn't a seller's or expert's username is a 404. The page shows the business name only,
 * never the phone number (contacts are member detail).
 */
export default async function PersonalSignIn({ params }: { params: { username: string } }) {
  const login = decodeURIComponent(params.username).toLowerCase();
  if (!USERNAME.test(login)) notFound();
  const account = await pinAccount(login);
  if (!account || account.username !== login || !(account.isSupplier || account.isExpert)) notFound();
  const portal = portalOf(account);
  const session = await getSession();
  if (session?.user?.id === account.id) redirect(portal);
  return (
    <div className="bg-page">
      <div className="container-site py-8 sm:py-12">
        <PinLogin kind="any" portal={portal} callPhone={site.contact.phone || null} account={{ login, name: account.displayName, phoneHint: null }} />
      </div>
    </div>
  );
}
