import { changeMyPin } from "@/app/actions/pin";

/** Shown instead of the seller or expert portal until they replace the PIN they were texted. */
export function ChoosePin({ back, error }: { back: "/supplier" | "/expert"; error: boolean }) {
  const pinInput = "input min-h-[46px] w-full text-center text-[18px] tracking-[0.5em]";
  return (
    <div className="bg-page">
      <div className="container-site py-8 sm:py-12">
        <form action={changeMyPin} className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <input type="hidden" name="back" value={back} />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-heading">Choose your PIN</h1>
            <p className="text-[14px] text-ink-muted">You signed in with the PIN we texted you. Choose your own 4-digit PIN to keep your account safe.</p>
          </div>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">New 4-digit PIN
            <input name="password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" placeholder="••••" className={pinInput} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">Repeat it
            <input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" placeholder="••••" className={pinInput} />
          </label>
          {error ? <p role="alert" className="text-sm font-semibold text-bad-fg">Enter the same 4 digits in both boxes.</p> : null}
          <button className="btn-primary min-h-[48px] w-full text-[15px]">Save my PIN</button>
        </form>
      </div>
    </div>
  );
}
