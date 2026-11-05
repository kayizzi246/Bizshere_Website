import { PartnerJoin } from "@/components/PartnerJoin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Become an Expert" };

export default function JoinPage({ searchParams }: { searchParams: { error?: string } }) {
  return <PartnerJoin kind="expert" error={searchParams.error} />;
}
