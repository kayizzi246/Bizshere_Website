import { JoinForm } from "./JoinForm";
import { Check } from "@/components/Gate";

export const metadata = { title: "List your business" };

export default function JoinPage() {
  return (
    <div className="container-site flex flex-wrap items-start gap-7 py-9">
      <aside className="flex flex-[1_1_340px] flex-col gap-5 rounded-[20px] bg-brand-deep p-8 text-white">
        <span className="text-sm font-bold uppercase tracking-widest text-brand-mint">For businesses</span>
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">List your business on BizSphere-Ug</h1>
        <p className="leading-relaxed text-[#C9DDD0]">Reach people who are starting and growing businesses and are looking for what you sell.</p>
        <ul className="flex flex-col gap-3.5 text-[15px]">
          {["Appear on the business ideas that need your products", "Earn dated verification badges after our checks", "Receive enquiries and see who viewed your listing", "Update your own prices and offers any time"].map((t) => (
            <li key={t} className="flex gap-3 [&_svg]:stroke-brand-mint"><Check /> {t}</li>
          ))}
        </ul>
      </aside>
      <section className="card flex min-w-0 flex-[999_1_620px] flex-col gap-6 p-8">
        <JoinForm />
      </section>
    </div>
  );
}
