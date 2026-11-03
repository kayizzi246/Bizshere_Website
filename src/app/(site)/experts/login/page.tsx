import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { PinLogin } from "@/components/PinLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expert sign in", robots: { index: false } };

/**
 * /experts/login: experts sign in with their phone and 4-digit PIN, then go to their portal
 * (/expert). Already signed in as an expert: straight to the portal.
 */
export default async function ExpertLoginPage() {
  const session = await getSession();
  if (session?.user?.id && (await prisma.consultant.count({ where: { ownerId: session.user.id } }))) redirect("/expert");
  return (
    <div className="bg-page">
      <div className="container-site py-8 sm:py-12"><PinLogin kind="expert" portal="/expert" callPhone={site.contact.phone || null} /></div>
    </div>
  );
}
