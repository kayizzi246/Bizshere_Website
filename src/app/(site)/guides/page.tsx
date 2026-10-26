import { DirectoryList } from "@/components/DirectoryList";
import { GUIDE_TABS } from "@/lib/format";
export const dynamic = "force-dynamic";
export const metadata = { title: "Guides" };
export default function Page() {
  return <DirectoryList types={["GUIDE"]} tabs={GUIDE_TABS} active="/guides" title="Guides" intro="Step-by-step procedures for registration, tax, licences and running a business, linked to the official source." />;
}
