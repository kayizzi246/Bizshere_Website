import { redirect } from "next/navigation";

// Old checkout links: payment now happens in the pop-up, opened by ?onboard=pay (src/components/Onboarding.tsx).
export default function CheckoutPage() {
  redirect("/membership?onboard=pay&next=%2Fbusiness-ideas");
}
