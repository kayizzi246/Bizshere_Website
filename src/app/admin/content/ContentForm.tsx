"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ContentType } from "@prisma/client";
import { directoryFor, MAIN, RELATIONSHIP_TYPES, type Field } from "@/lib/content-fields";
import { saveContent, type ContentFormState } from "./actions";
import type { FormOptions } from "./load";

type Props = {
  type: ContentType;
  options: FormOptions;
  values?: Record<string, string>;
  multi?: { businessStages: string[]; audiences: string[]; locations: string[]; categories: string[] };
};

/** One entry form for every directory, driven by src/lib/content-fields.ts. */
export function ContentForm({ type, options, values = {}, multi }: Props) {
  const dir = directoryFor(type)!;
  const [state, action] = useFormState<ContentFormState, FormData>(saveContent, {});
  const err = (k: string) => state.errors?.[k];
  const v = (k: string) => values[k] ?? "";
  const lb = dir.labels ?? {};
  // The client's field list comes first; the original blueprint's extra fields fold away below it.
  const extraGroups = [...new Set(dir.fields.map((f) => f.group ?? "Details"))].filter((g) => g !== MAIN);
  const mainFields = dir.fields.filter((f) => f.group === MAIN);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="contentType" value={type} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.errors ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{err("form") ?? "Please fix the highlighted fields."}</p> : null}

      <Section title="1. Name and publishing">
        <Row>
          <Input name="title" label={lb.title ?? "Title"} defaultValue={v("title")} error={err("title")} required />
          <Input name="slug" label="Web address (slug)" defaultValue={v("slug")} error={err("slug")} help="Leave empty to build it from the title" />
        </Row>
        <TextArea name="shortSummary" label={`${lb.shortSummary ?? "Short summary"} (shown on cards)`} defaultValue={v("shortSummary")} rows={2} />
        <TextArea name="overview" label={lb.overview ?? "Overview"} defaultValue={v("overview")} rows={5} />
        <Select name="primaryCategoryId" label={lb.category ?? "Primary category"} defaultValue={v("primaryCategoryId")} options={[{ value: "", label: "None" }, ...options.categories]} />
        <Row>
          <Select name="publicationStatus" label="Status" defaultValue={v("publicationStatus") || "DRAFT"} error={err("publicationStatus")} options={["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => ({ value: s, label: s.replace("_", " ").toLowerCase() }))} />
          <Select name="accessLevel" label="Access" defaultValue={v("accessLevel") || "PREVIEW"} error={err("accessLevel")} options={[{ value: "PUBLIC", label: "Public (all detail free)" }, { value: "PREVIEW", label: "Preview free, detail for members" }, { value: "MEMBERS", label: "Members only" }]} />
          <Input name="entitlements" label="Extra plan entitlements" defaultValue={v("entitlements")} help="Comma-separated, e.g. downloads" />
        </Row>
        <Row>
          <Input name="lastReviewedAt" label="Last reviewed" type="date" defaultValue={v("lastReviewedAt")} />
          <Input name="nextReviewDueAt" label="Next review due" type="date" defaultValue={v("nextReviewDueAt")} />
          <Input name="expiresAt" label="Expires" type="date" defaultValue={v("expiresAt")} />
        </Row>
      </Section>

      {dir.link ? (
        <Section title={`2. ${dir.link.label}`}>
          <Select name={dir.link.field} label={dir.link.label} defaultValue={v(dir.link.field)} error={err(dir.link.field)} options={[{ value: "", label: "Choose…" }, ...options.link]} />
          {options.link.length === 0 ? <p className="text-sm text-ink-muted">None exist yet. Create the organization first (Users and businesses).</p> : null}
        </Section>
      ) : null}

      {mainFields.length ? (
        <Section title={`${dir.link ? 3 : 2}. ${MAIN}`}>
          <p className="-mt-2 text-sm text-ink-muted">These are shown on the public page.</p>
          <div className="flex flex-wrap gap-3.5">
            {mainFields.map((f) => <FieldInput key={f.name} f={f} value={v(`f_${f.name}`)} error={err(f.name)} />)}
          </div>
        </Section>
      ) : null}

      {dir.children?.map((c) => (
        <Section key={c.key} title={c.label}>
          <TextArea name={`c_${c.key}`} label={c.label} help={c.help} defaultValue={v(`c_${c.key}`)} rows={8} error={err(c.key)} mono />
        </Section>
      ))}

      {extraGroups.length ? (
        <details className="card group p-6 [&_summary::-webkit-details-marker]:hidden" open={extraGroups.some((g) => dir.fields.some((f) => f.group === g && err(f.name)))}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="flex flex-col"><span className="text-lg font-extrabold">More fields (optional)</span><span className="text-sm text-ink-muted">Extra detail from the original blueprint. Not shown on the public page.</span></span>
            <span className="text-xl text-ink-muted transition group-open:rotate-45">+</span>
          </summary>
          <div className="mt-5 flex flex-col gap-6">
            {extraGroups.map((g) => (
              <div key={g} className="flex flex-col gap-3">
                <h3 className="font-extrabold">{g}</h3>
                <div className="flex flex-wrap gap-3.5">
                  {dir.fields.filter((f) => (f.group ?? "Details") === g).map((f) => <FieldInput key={f.name} f={f} value={v(`f_${f.name}`)} error={err(f.name)} />)}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <Section title="Classification and audience">
        <Checks name="categories" legend="Other categories and industries" options={options.categories} checked={multi?.categories ?? []} />
        <Checks name="businessStages" legend="Business stages" options={["IDEA", "STARTING", "GROWING", "ESTABLISHED"].map((s) => ({ value: s, label: s.toLowerCase() }))} checked={multi?.businessStages ?? []} />
        <Checks name="audiences" legend="Audiences" options={options.audiences} checked={multi?.audiences ?? []} />
        <Checks name="locations" legend="Applies to (not where the provider is located)" options={options.locations} checked={multi?.locations ?? []} />
        <TextArea name="coverageNotes" label="Coverage notes" defaultValue={v("coverageNotes")} rows={2} />
      </Section>

      <Section title="Connected resources">
        <TextArea name="relations" label="Links from this page" defaultValue={v("relations")} rows={5} error={err("relations")} mono
          help={`One per line: relationship page-slug. Relationships: ${RELATIONSHIP_TYPES.join(", ")}`} />
      </Section>

      <Section title="Save">
        <Input name="revisionNote" label="What changed? (kept in the revision history)" />
        <div className="flex justify-end"><Submit /></div>
      </Section>
    </form>
  );
}

function FieldInput({ f, value, error }: { f: Field; value: string; error?: string }) {
  const name = `f_${f.name}`;
  if (f.kind === "textarea" || f.kind === "json") return <div className="flex-[1_1_100%]"><TextArea name={name} label={f.label} defaultValue={value} help={f.help} error={error} rows={f.kind === "json" ? 3 : 3} mono={f.kind === "json"} /></div>;
  if (f.kind === "bool") return <Select name={name} label={f.label} defaultValue={value} error={error} options={[{ value: "", label: "Unknown" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]} />;
  if (f.kind === "enum") return <Select name={name} label={f.label} defaultValue={value} error={error} options={[{ value: "", label: "Choose…" }, ...(f.options ?? []).map((o) => ({ value: o, label: o.replace(/_/g, " ").toLowerCase() }))]} />;
  const type = f.kind === "date" ? "date" : f.kind === "url" ? "url" : "text";
  return <Input name={name} label={f.label} type={type} defaultValue={value} error={error} help={f.help} required={f.required} inputMode={f.kind === "int" || f.kind === "decimal" ? "decimal" : undefined} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card flex flex-col gap-4 p-6"><h2 className="text-lg font-extrabold">{title}</h2>{children}</section>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3.5">{children}</div>;
}
function Input({ name, label, error, help, ...rest }: { name: string; label: string; error?: string; help?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="label flex-[1_1_220px]">{label}
      <input name={name} aria-invalid={!!error} className={`input ${error ? "border-bad-fg" : ""}`} {...rest} />
      {help ? <span className="text-xs font-normal text-ink-muted">{help}</span> : null}
      {error ? <span role="alert" className="text-xs font-semibold text-bad-fg">{error}</span> : null}
    </label>
  );
}
function TextArea({ name, label, error, help, mono, ...rest }: { name: string; label: string; error?: string; help?: string; mono?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="label">{label}
      <textarea name={name} aria-invalid={!!error} className={`input py-2 ${mono ? "font-mono text-sm" : ""} ${error ? "border-bad-fg" : ""}`} {...rest} />
      {help ? <span className="text-xs font-normal text-ink-muted">{help}</span> : null}
      {error ? <span role="alert" className="text-xs font-semibold text-bad-fg">{error}</span> : null}
    </label>
  );
}
function Select({ name, label, options, error, defaultValue }: { name: string; label: string; options: { value: string; label: string }[]; error?: string; defaultValue?: string }) {
  return (
    <label className="label flex-[1_1_220px]">{label}
      <select name={name} defaultValue={defaultValue} aria-invalid={!!error} className={`input ${error ? "border-bad-fg" : ""}`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error ? <span role="alert" className="text-xs font-semibold text-bad-fg">{error}</span> : null}
    </label>
  );
}
function Checks({ name, legend, options, checked }: { name: string; legend: string; options: { value: string; label: string }[]; checked: string[] }) {
  if (!options.length) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-bold text-ink-soft">{legend}</legend>
      <div className="flex max-h-48 flex-wrap gap-x-5 gap-y-2 overflow-y-auto">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" name={name} value={o.value} defaultChecked={checked.includes(o.value)} className="h-4 w-4 accent-brand" />{o.label}</label>
        ))}
      </div>
    </fieldset>
  );
}
function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn-primary min-h-[50px] px-7">{pending ? "Saving…" : "Save"}</button>;
}
