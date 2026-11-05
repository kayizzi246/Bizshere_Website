import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { PinLogin } from "@/components/PinLogin";
import Link from "next/link";
import { PanelWords, SplitShell } from "@/components/SplitShell";

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
    <SplitShell foot={<>New here? <Link href="/experts/join" className="font-bold">Become an Expert</Link></>}
      panel={<PanelWords lead="Get found by the businesses that" accent="need you" text="Keep your details, services and jobs done up to date, so people can see what you do." chips={["My details", "Services", "Prices", "Jobs done"]} />}>
      <PinLogin kind="expert" portal="/expert" callPhone={site.contact.phone || null} />
    </SplitShell>
  );
}
