/**
 * The name at the top of a supplier's or expert's page (client, 24 Nov 2026): weight 900, the last word in the logo
 * orange with an orange full stop, like the homepage titles. Inter, as Manrope stops at 800 (.profile-title in globals.css).
 */
export function ProfileTitle({ name }: { name: string }) {
  const words = name.trim().split(/ +/);
  const last = words.pop();
  return (
    <h1 className="text-hero profile-title text-[25px] sm:text-[35px]">
      {words.length ? `${words.join(" ")} ` : ""}<span className={words.length ? "text-accent" : ""}>{last}</span>{/[.!?]$/.test(name.trim()) ? null : <span aria-hidden className="text-accent">.</span>}
    </h1>
  );
}
