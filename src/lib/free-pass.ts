/**
 * The free 24-hour pass.
 *
 * Someone who has signed in with their phone number (so we have a real, texted-to number) can open
 * everything once, for a day, without paying. It is the cheapest way to show what a membership is
 * worth: the person sees the real budgets, contacts and prices, and the pass ends by itself.
 *
 * One pass per person, ever (User.trialUsedAt), and never for someone who already has access.
 * The pass is an ordinary subscription with status TRIAL, so getViewer, the admin and the
 * renewal reminders all treat it like any other membership that ends on a date.
 */
import { prisma } from "./prisma";
import { grantDays, notifyMember } from "./membership";
import { getSetting } from "./settings";

/** How long the free pass lasts, in hours (Admin > Settings: freePass.hours; 0 turns it off). */
export const freePassHours = () => getSetting("freePass.hours", 24);

export type PassState = {
  /** The pass can be taken right now. */
  available: boolean;
  hours: number;
  /** Why it can't be taken, for the button's tooltip; null when it can. */
  reason: "off" | "member" | "used" | "signed-out" | null;
};

/** Whether this person may take the pass, for the pop-up and the paywall card. */
export async function passState(userId: string | null, isMember: boolean): Promise<PassState> {
  const hours = await freePassHours();
  if (hours <= 0) return { available: false, hours, reason: "off" };
  if (!userId) return { available: false, hours, reason: "signed-out" };
  if (isMember) return { available: false, hours, reason: "member" };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { trialUsedAt: true } });
  if (user?.trialUsedAt) return { available: false, hours, reason: "used" };
  return { available: true, hours, reason: null };
}

export type PassResult = { ok: true; until: string; hours: number } | { ok: false; message: string };

/**
 * Starts the pass. Safe to call twice: the second call finds trialUsedAt set and says so, because
 * the update that claims the pass only matches a row that has not used one.
 */
export async function takeFreePass(userId: string, isMember: boolean): Promise<PassResult> {
  const state = await passState(userId, isMember);
  if (!state.available) {
    return {
      ok: false,
      message:
        state.reason === "member" ? "You already have full access."
        : state.reason === "used" ? "You have already had your free day. Pick a plan to carry on."
        : "The free day isn't available just now. Pick a plan to open everything.",
    };
  }
  // Claims the pass first: two taps at once, and only one of them gets through here.
  const claimed = await prisma.user.updateMany({ where: { id: userId, trialUsedAt: null }, data: { trialUsedAt: new Date() } });
  if (!claimed.count) return { ok: false, message: "You have already had your free day. Pick a plan to carry on." };
  const until = await grantDays(userId, state.hours / 24, { status: "TRIAL", reason: "free-pass" });
  if (!until) {
    await prisma.user.updateMany({ where: { id: userId }, data: { trialUsedAt: null } });
    return { ok: false, message: "We couldn't start your free day. Please try again." };
  }
  // Told by SMS as well, so the pass carries the site's address into their phone.
  await notifyMember(userId, {
    title: `Your free ${state.hours} hours have started`,
    text: `Your free BizSphere-Ug day is open: full budgets, supplier contacts, funding terms and prices until ${until.toLocaleString("en-UG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "long" })}.`,
    link: "/business-ideas",
  }).catch(() => {});
  return { ok: true, until: until.toISOString(), hours: state.hours };
}
