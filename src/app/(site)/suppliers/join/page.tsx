import { PartnerJoin } from "@/components/PartnerJoin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Become a Supplier" };

export default function JoinPage({ searchParams }: { searchParams: { error?: string } }) {
  return <PartnerJoin kind="supplier" error={searchParams.error} />;
}
