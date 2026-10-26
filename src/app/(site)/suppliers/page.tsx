import { DirectoryList } from "@/components/DirectoryList";
import { MACHINE_TABS } from "@/lib/format";
export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers" };
export default function Page() {
  return <DirectoryList types={["SUPPLIER"]} tabs={MACHINE_TABS} active="/suppliers" title="Suppliers" intro="Manufacturers, distributors and retailers, each with dated verification checks." />;
}
