import { DirectoryList } from "@/components/DirectoryList";
export const dynamic = "force-dynamic";
export const metadata = { title: "Find an expert" };
export default function Page() {
  return <DirectoryList types={["CONSULTANT"]} title="Find an expert" intro="Consultants and professional services, with credential checks." />;
}
