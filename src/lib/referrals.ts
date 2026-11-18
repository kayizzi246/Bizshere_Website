/**
 * Invites: "bring a friend, you both get free days".
 *
 * How it runs:
 *   1. Every member has an invite code (made the first time they look at /account) and a link,
 *      bizsphere.ug/?ref=CODE, to send on WhatsApp.
 *   2. Someone opening that link gets a cookie (REF_COOKIE, 30 days). The code is remembered, not
 *      acted on: nothing is given away for a click.
 *   3. When that person signs up, the cookie is turned into a Referral row (claimInvite).
 *   4. When they pay for the first time, both sides get the same number of free days added to the
 *      end of their membership (rewardInvite, called from settlePayment) and both are texted.
 *
 * So free days are only ever given after real money has come in, and only once per invited person
 * (Referral.inviteeId is unique). Self-invites and invites between staff accounts are ignored.
 */
import { prisma } from "./prisma";
import { grantDays, notifyMember } from "./membership";
import { getSetting } from "./settings";
import { site } from "@/config/site";

/** The cookie that remembers ?ref=CODE until the person signs up (set in the (site) layout). */
export const REF_COOKIE = "bz_ref";
export const REF_COOKIE_DAYS = 30;

/** How many free days each side gets (Admin > Settings: referral.days; 0 turns invites off). */
export const referralDays = () => getSetting("referral.days", 7);

/** No letters or digits that can be misread on a phone screen (0/O, 1/I). */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomCode = (n = 6) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

/** A code as it may be typed or pasted: upper case, letters and digits only. */
export const normalizeRef = (code: string) => code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);

/** This person's invite code, made on first use. Their link is `${site.url}/?ref=CODE`. */
export async function inviteCode(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (!user) return null;
  if (user.referralCode) return user.referralCode;
  // Three tries is plenty for a 32^6 space; a clash only means another person took that code first.
  for (let i = 0; i < 3; i++) {
    const code = randomCode();
    const taken = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (taken) continue;
    const saved = await prisma.user.update({ where: { id: userId }, data: { referralCode: code } }).catch(() => null);
    if (saved?.referralCode) return saved.referralCode;
    const again = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (again?.referralCode) return again.referralCode;
  }
  return null;
}

export const inviteLink = (code: string) => `${site.url}/?ref=${code}`;

/** What /account shows: the link, how many invites have paid, and the days earned so far. */
export async function inviteSummary(userId: string) {
  const [code, days, rows] = await Promise.all([
    inviteCode(userId),
    referralDays(),
    prisma.referral.findMany({
      where: { inviterId: userId },
      select: { rewardedAt: true, rewardDays: true, createdAt: true, invitee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return {
    code,
    link: code ? inviteLink(code) : null,
    days,
    joined: rows.length,
    paid: rows.filter((r) => r.rewardedAt).length,
    daysEarned: rows.reduce((s, r) => s + r.rewardDays, 0),
    people: rows.map((r) => ({ name: r.invitee.name, paid: Boolean(r.rewardedAt), at: r.createdAt })),
  };
}

/**
 * Someone has just signed up with a `ref` cookie: remember who invited them. Nothing is given
 * away here. Called from the sign-in code flow; any problem is ignored, as a missed invite must
 * never stop someone signing up.
 */
export async function claimInvite(inviteeId: string, rawCode: string | null | undefined) {
  const code = normalizeRef(rawCode ?? "");
  if (!code || !(await referralDays())) return;
  const inviter = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, isSuspended: true, role: true } });
  if (!inviter || inviter.isSuspended || inviter.id === inviteeId) return;
  await prisma.referral.create({ data: { inviterId: inviter.id, inviteeId } }).catch(() => {}); // already invited by someone
}

/**
 * The invited person has paid. Both sides get the free days, once. Called from settlePayment, so
 * it must never throw: a failed reward may not undo a payment.
 */
export async function rewardInvite(inviteeId: string) {
  const days = await referralDays();
  if (!days) return;
  const referral = await prisma.referral.findUnique({ where: { inviteeId }, select: { id: true, inviterId: true } });
  if (!referral) return;
  // Only one caller marks it rewarded, so the days are never given twice.
  const won = await prisma.referral.updateMany({ where: { id: referral.id, rewardedAt: null }, data: { rewardedAt: new Date(), rewardDays: days } });
  if (!won.count) return;
  const [inviterEnd, inviteeEnd] = await Promise.all([
    grantDays(referral.inviterId, days, { reason: `invite:${inviteeId}` }),
    grantDays(inviteeId, days, { reason: "invite-accepted" }),
  ]);
  const word = `${days} free day${days === 1 ? "" : "s"}`;
  await Promise.all([
    inviterEnd
      ? notifyMember(referral.inviterId, {
          title: `${word} for your invite`,
          text: `Someone you invited to BizSphere-Ug has joined as a member, so you have ${word} added to your membership. Keep inviting: every friend who pays adds ${word}.`,
          link: "/account#invite",
        }).catch(() => {})
      : null,
    inviteeEnd
      ? notifyMember(inviteeId, {
          title: `${word} added to your membership`,
          text: `Thank you for joining BizSphere-Ug through a friend's invite: ${word} have been added to your membership. Invite your own friends to earn more.`,
          link: "/account#invite",
        }).catch(() => {})
      : null,
  ]);
}

/** The remembered invite code out of a request's Cookie header (set in src/middleware.ts). */
export function refFromCookies(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const hit = cookieHeader.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${REF_COOKIE}=`));
  const code = hit ? normalizeRef(decodeURIComponent(hit.slice(REF_COOKIE.length + 1))) : "";
  return code || null;
}
