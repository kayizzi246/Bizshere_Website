"use client";

import { useEffect, useRef } from "react";

/**
 * Drop inside a <form>: changing any dropdown submits the form straight away, so
 * filters apply without an "Apply" click. Without JavaScript the form's own button still works.
 */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (e: Event) => {
      const el = e.target as Element;
      // Dropdowns and checkboxes marked data-auto apply at once; fields inside [data-manual] wait for the Apply button.
      if (!el.matches("select, input[type=checkbox][data-auto]") || el.closest("[data-manual]")) return;
      // A select marked data-reset (e.g. "Search in") clears the other dropdowns, whose fields belong to the old choice.
      if (el.hasAttribute("data-reset")) form.querySelectorAll("select").forEach((s) => { if (s !== el) s.value = ""; });
      form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);
  return <span ref={ref} hidden />;
}
