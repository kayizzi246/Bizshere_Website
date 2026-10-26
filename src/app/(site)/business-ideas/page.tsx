import { DirectoryList } from "@/components/DirectoryList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Start a business" };
export default function Page() {
  return <DirectoryList types={["BUSINESS_IDEA"]} title="Business ideas" intro="Plans, startup budgets and the resources each idea needs." />;
}
