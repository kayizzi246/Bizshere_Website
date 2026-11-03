import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { PinLogin } from "@/components/PinLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier sign in", robots: { index: false } };

/**
 * /suppliers/login: sellers sign in with their phone and 4-digit PIN, then go to their portal
 * (/supplier). Already signed in as a seller: straight to the portal.
 */
export default async function SupplierLoginPage() {
  const session = await getSession();
  if (session?.user?.id) {
    const seller = await prisma.organizationMember.findFirst({ where: { userId: session.user.id, organization: { supplier: { isNot: null } } }, select: { userId: true } });
    if (seller) redirect("/supplier");
  }
  return (
    <div className="bg-page">
      <div className="container-site py-8 sm:py-12"><PinLogin kind="supplier" portal="/supplier" callPhone={site.contact.phone || null} /></div>
    </div>
  );
}
