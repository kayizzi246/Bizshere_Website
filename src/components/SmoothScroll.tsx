"use client";

// Smooth scrolling is the browser's own since 27 Nov 2026 (html { scroll-behavior } in globals.css). The Lenis script
// that used to drive every scroll frame in JavaScript was removed to make the site faster.

/** Glides back to the top of the page (the Back to top button in ScrollEffects). */
export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
