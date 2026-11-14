"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ContentType } from "@prisma/client";
import { directoryFor, FREE_TYPES, FUNDER, isMemberOnly, MAIN, PROVIDER, RELATIONSHIP_TYPES, type Field } from "@/lib/content-fields";
import { saveContent, type ContentFormState } from "./actions";
import { UploadButton } from "@/components/UploadButton";
import { ProductPhotos } from "@/components/ProductPhotos";
import type { FormOptions } from "./load";
import { NewSupplierProducts } from "./NewSupplierProducts";

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
  const err = (k: string) => state?.errors?.[k];
  const v = (k: string) => values[k] ?? "";
  const lb = dir.labels ?? {};
  // What people need comes first, one screen of plain questions. Optional extras and the technical
  // settings fold away, and open by themselves when something inside needs fixing.
  const extraGroups = [...new Set(dir.fields.map((f) => f.group ?? "Details"))].filter((g) => g !== MAIN && g !== FUNDER && g !== PROVIDER);
  // A funding source's funder details sit with the fund provider choice, always open
  const funderFields = dir.fields.filter((f) => f.group === FUNDER);
  const mainFields = dir.fields.filter((f) => f.group === MAIN && !f.basics);
  const basicsFields = dir.fields.filter((f) => f.basics);
  // A machine's provider: its own section, always open, right after the main details
  const providerFields = dir.fields.filter((f) => f.group === PROVIDER);
  const slug = (g: string) => "s-" + g.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const field = (f: Field) => f.kind === "images"
    ? <ImagesField key={f.name} f={f} value={v(`f_${f.name}`)} />
    : <FieldInput key={f.name} f={f} value={values.id ? v(`f_${f.name}`) : v(`f_${f.name}`) || (f.initial ?? "")} error={err(f.name)} member={isMemberOnly(type, f)} options={f.ref === "supplier" ? options.suppliers : undefined} />;
  const mainTitle = lb.main ?? MAIN;
  const linkAdvanced = dir.link?.advanced;
  // A new supplier: their first products are typed right here and saved with the page
  const newSupplier = type === "SUPPLIER" && !values.id;
  const advancedOpen = Boolean(err("slug") || err("relations") || (linkAdvanced && err(dir.link!.field)));
  // Section menu, in form order.
  const nav: [string, string][] = [
    ["s-name", "Basics"],
    ...(dir.link && !linkAdvanced ? [["s-link", dir.link.label] as [string, string]] : []),
    ...(mainFields.length ? [[slug(MAIN), mainTitle] as [string, string]] : []),
    ...(providerFields.length ? [[slug(PROVIDER), "Provider"] as [string, string]] : []),
    ...(newSupplier ? [["s-products", "Products"] as [string, string]] : []),
    ...(dir.children ?? []).map((c) => [slug(c.label), c.label] as [string, string]),
    ...extraGroups.map((g) => [slug(g), g] as [string, string]),
    ["s-publish", "Who can see it"],
    ["s-advanced", "Advanced settings"],
  ];
  const linkSelect = dir.link ? <Select name={dir.link.field} label={dir.link.label} defaultValue={v(dir.link.field)} error={err(dir.link.field)} options={[{ value: "", label: values?.id ? "Keep the current one" : "Create a new one" }, ...options.link]} /> : null;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start">
      <nav aria-label="Form sections" className="hidden flex-col gap-0.5 lg:sticky lg:top-6 lg:flex">
        <span className="mb-1 px-2 text-[11px] font-bold uppercase tracking-widest text-ink-muted">On this form</span>
        {nav.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-md px-2 py-1.5 text-[13px] text-ink-soft hover:bg-surface hover:text-brand">{label}</a>)}
      </nav>
      <div className="flex min-w-0 flex-col gap-5">
      <input type="hidden" name="contentType" value={type} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state?.errors ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{err("form") ?? "Please fix the highlighted fields."}</p> : null}

      <Section id="s-name" title="Basics">
        <Row><Input name="title" label={`${lb.title ?? "Title"} *`} defaultValue={v("title")} error={err("title")} required /></Row>
        {type === "BUSINESS_TIP" || dir.hideShortSummary ? null : <TextArea name="shortSummary" label={lb.shortSummary ?? "Short summary"} help="One or two lines, shown on its card in the list." defaultValue={v("shortSummary")} rows={2} />}
        <TextArea name="overview" label={lb.overview ?? "Overview"} defaultValue={v("overview")} rows={type === "BUSINESS_TIP" ? 8 : 4} error={err("overview")} />
        <Row>
          <Select name="primaryCategoryId" label={lb.category ?? "Category"} defaultValue={v("primaryCategoryId")} options={[{ value: "", label: "Choose…" }, ...options.primaryCategories]} />
          <Input name="newCategory" label="Not in the list? Add a new category" error={err("newCategory")} help="Type its name. It is added and chosen when you save." maxLength={80} />
        </Row>
        {basicsFields.length ? <div className="flex flex-wrap gap-3.5">{basicsFields.map(field)}</div> : null}
      </Section>

      {dir.link && !linkAdvanced ? (
        <Section id="s-link" title={dir.link.label}>
          <Row>
            {linkSelect}
            {values?.id ? null : <Input name="linkNew" label={`New ${dir.link.label.toLowerCase()} name`} defaultValue="" help={`Leave empty to use the ${(lb.title ?? "title").toLowerCase()}.`} />}
          </Row>
          {funderFields.length ? (
            <>
              <p className="text-sm text-ink-muted">{values?.id ? "The funder's details. Shared by all its funds: a change here shows on each of them." : "The funder's details. Leave empty when you chose a funder above: what it already has is kept."}</p>
              <div className="flex flex-wrap gap-3.5">{funderFields.map(field)}</div>
            </>
          ) : null}
        </Section>
      ) : null}

      {mainFields.length ? (
        <Section id={slug(MAIN)} title={mainTitle} note={lb.mainNote ?? "Key facts at the top of the public page."}>
          <div className="flex flex-wrap gap-3.5">{mainFields.map(field)}</div>
        </Section>
      ) : null}

      {providerFields.length ? (
        <Section id={slug(PROVIDER)} title={PROVIDER} note="Shown to members under Where to buy. Link a supplier who is already on the site, or type the provider's details. Anything typed here is shown instead of the supplier's own.">
          <div className="flex flex-wrap gap-3.5">{providerFields.map(field)}</div>
        </Section>
      ) : null}

      {newSupplier ? (
        <Section id="s-products" title="Products they sell" note="Optional. Add their products now: a name is enough, the price, pack and photo can come later.">
          {err("products") ? <p role="alert" className="text-sm font-semibold text-bad-fg">{err("products")}</p> : null}
          <NewSupplierProducts />
        </Section>
      ) : null}

      {dir.children?.map((c) => (
        <Section key={c.key} id={slug(c.label)} title={c.label}>
          <TextArea name={`c_${c.key}`} label={c.label} help={c.help} defaultValue={v(`c_${c.key}`)} rows={8} error={err(c.key)} mono />
        </Section>
      ))}

      {extraGroups.map((g) => {
        const fields = dir.fields.filter((f) => (f.group ?? "Details") === g);
        return (
          <Fold key={g} id={slug(g)} title={g} note={lb.moreNote ?? "Optional. Shown under Full details on the public page when filled."} open={fields.some((f) => err(f.name))}>
            <div className="flex flex-wrap gap-3.5">{fields.map(field)}</div>
          </Fold>
        );
      })}

      {/* Free directories (news, useful websites, business tips) are always public: no access choice shown. */}
      {FREE_TYPES.has(type) ? null : (
        <Section id="s-publish" title="Who can see it" note="Live or draft is chosen next to Save, at the bottom of the screen.">
          <Row>
            <Select name="accessLevel" label="Who sees the full details?" defaultValue={v("accessLevel") || "PREVIEW"} error={err("accessLevel")} options={[
              { value: "PREVIEW", label: "Members only; everyone sees a preview" }, { value: "PUBLIC", label: "Everyone, free" }, { value: "MEMBERS", label: "Members only, with no preview" },
            ]} />
          </Row>
        </Section>
      )}

      <Fold id="s-advanced" title="Advanced settings" note="You can usually leave these alone." open={advancedOpen} hidden={dir.simpleForm}>
        <Row><Input name="slug" label="Web address (slug)" defaultValue={v("slug")} error={err("slug")} help="Leave empty to build it from the name." /></Row>
        {linkAdvanced ? <div className="flex flex-col gap-1"><Row>{linkSelect}</Row><span className="text-xs text-ink-muted">{linkAdvanced}</span></div> : null}
        <Row>
          <Input name="lastReviewedAt" label="Last reviewed" type="date" defaultValue={v("lastReviewedAt")} />
          <Input name="nextReviewDueAt" label="Next review due" type="date" defaultValue={v("nextReviewDueAt")} />
          <Input name="expiresAt" label="Expires" type="date" defaultValue={v("expiresAt")} />
        </Row>
        <Row><Input name="entitlements" label="Extra plan entitlements" defaultValue={v("entitlements")} help="Comma-separated, e.g. downloads" /></Row>
        <Checks name="categories" legend="Other categories and industries" options={options.categories} checked={multi?.categories ?? []} />
        <Checks name="businessStages" legend="Business stages" options={["IDEA", "STARTING", "GROWING", "ESTABLISHED"].map((s) => ({ value: s, label: s.toLowerCase() }))} checked={multi?.businessStages ?? []} />
        <Checks name="audiences" legend="Audiences" options={options.audiences} checked={multi?.audiences ?? []} />
        <Checks name="locations" legend="Applies to (not where the provider is located)" options={options.locations} checked={multi?.locations ?? []} />
        <TextArea name="coverageNotes" label="Coverage notes" defaultValue={v("coverageNotes")} rows={2} />
        <TextArea name="relations" label="Links to other pages" defaultValue={v("relations")} rows={4} error={err("relations")} mono
          help={`One per line: relationship page-slug. Relationships: ${RELATIONSHIP_TYPES.join(", ")}`} />
        {values.id ? <Row><Input name="revisionNote" label="What changed? (kept in the revision history)" /></Row> : null}
      </Fold>

      {/* Always in view at the bottom of the screen: where the page goes, and Save */}
      <div className="sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[0_-8px_24px_rgb(7_26_51/0.08)] backdrop-blur sm:mx-0">
        <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm font-bold text-heading">
          <span className="shrink-0">Show it:</span>
          <select name="publicationStatus" defaultValue={v("publicationStatus") || "PUBLISHED"} aria-invalid={Boolean(err("publicationStatus"))}
            className="input min-h-[46px] min-w-0 max-w-[280px] flex-1 font-semibold">
            <option value="PUBLISHED">Live on the website</option>
            <option value="DRAFT">Draft: not on the website</option>
            <option value="IN_REVIEW">Waiting for a check</option>
            <option value="ARCHIVED">Hidden</option>
          </select>
        </label>
        {state?.errors ? <span className="text-[13px] font-semibold text-bad-fg">Fix the fields in red first.</span> : null}
        <Submit />
      </div>
      </div>
    </form>
  );
}

/** A multi-photo uploader for an "images" field (e.g. a machine's pictures): the main one plus extras. */
function ImagesField({ f, value }: { f: Field; value: string }) {
  let initial: string[] = [];
  try { initial = JSON.parse(value || "[]"); } catch { initial = []; }
  return (
    <div className="flex basis-full flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-soft">{f.label}</span>
      <ProductPhotos initial={initial} mainName={`f_${f.name}`} extraName={`f_${f.extra ?? "moreImages"}`} />
    </div>
  );
}

function FieldInput({ f: raw, value, error, member, options }: { f: Field; value: string; error?: string; member?: boolean; options?: { value: string; label: string }[] }) {
  // A * on every field that must be filled in, so nothing stops a save without saying why
  const f = { ...raw, label: `${raw.label}${raw.required ? " *" : ""}${member ? " (members only)" : ""}` };
  const name = `f_${f.name}`;
  // A link to an existing record (e.g. a supplier): choose it from the list
  if (f.ref) {
    return (
      <div className="flex min-w-0 flex-[1_1_100%] flex-col gap-1">
        <Select name={name} label={f.label} defaultValue={value} error={error} options={[{ value: "", label: options?.length ? "None" : "None (no suppliers on the site yet)" }, ...(options ?? [])]} />
        {f.help ? <span className="text-xs text-ink-muted">{f.help}</span> : null}
      </div>
    );
  }
  if (f.kind === "textarea" || f.kind === "json") return <div className="flex-[1_1_100%]"><TextArea name={name} label={f.label} defaultValue={value} help={f.help} error={error} rows={f.kind === "json" ? 3 : 3} mono={f.kind === "json"} /></div>;
  if (f.kind === "bool") return <Select name={name} label={f.label} defaultValue={value} error={error} options={[{ value: "", label: "Unknown" }, { value: "true", label: "Yes" }, { value: "false", label: "No" }]} />;
  if (f.kind === "enum") return <Select name={name} label={f.label} defaultValue={value} error={error} options={[...(f.required ? [] : [{ value: "", label: "Choose…" }]), ...(f.options ?? []).map((o) => ({ value: o, label: titleWord(o) }))]} />;
  // Files: paste a link or upload; the button fills the link in.
  if (f.upload) {
    return (
      // A wrapping row (not a column), so the field's flex-basis sets its width, not its height.
      <div className="flex min-w-0 flex-[1_1_100%] flex-wrap gap-2">
        <Input name={name} label={f.label} defaultValue={value} error={error} help={f.help ?? "Paste a link, or upload a file below."} />
        <div className="basis-full"><UploadButton target={name} kind={f.upload} /></div>
      </div>
    );
  }
  // URL fields are plain text so site paths (/ideas/…) are accepted; the server checks the format.
  const type = f.kind === "date" ? "date" : "text";
  return <Input name={name} label={f.label} type={type} defaultValue={value} error={error} help={f.help} required={f.required} inputMode={f.kind === "int" || f.kind === "decimal" ? "decimal" : undefined} />;
}

/** MANUFACTURER → Manufacturer, SERVICE_PROVIDER → Service provider */
const titleWord = (o: string) => { const w = o.replace(/_/g, " ").toLowerCase(); return w.charAt(0).toUpperCase() + w.slice(1); };

/** A section that stays closed until it is wanted. Its fields are sent with the form either way. */
function Fold({ id, title, note, open, hidden, children }: { id: string; title: string; note?: string; open?: boolean; hidden?: boolean; children: React.ReactNode }) {
  // `hidden`: the section is taken off the form visually, but its inputs still submit their current
  // values, so hiding "Advanced settings" never wipes the slug, dates or categories on save.
  return (
    <details id={id} open={open} hidden={hidden} className="group/fold scroll-mt-20 rounded-2xl border border-line bg-surface [&>summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-6 sm:py-5">
        <span className="flex flex-col gap-0.5"><span className="text-base font-extrabold text-heading">{title}</span>{note ? <span className="text-[13px] text-ink-muted">{note}</span> : null}</span>
        <span aria-hidden className="text-lg text-ink-muted transition group-open/fold:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-line p-4 sm:p-6">{children}</div>
    </details>
  );
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-0.5"><h2 className="text-base font-extrabold text-heading">{title}</h2>{note ? <p className="text-[13px] text-ink-muted">{note}</p> : null}</div>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3.5">{children}</div>;
}
function Input({ name, label, error, help, ...rest }: { name: string; label: string; error?: string; help?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="label min-w-0 flex-[1_1_220px]">{label}
      <input name={name} aria-invalid={!!error} className={`input w-full min-w-0 ${error ? "border-bad-fg" : ""}`} {...rest} />
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
    <label className="label min-w-0 flex-[1_1_220px]">{label}
      <select name={name} defaultValue={defaultValue} aria-invalid={!!error} className={`input w-full min-w-0 ${error ? "border-bad-fg" : ""}`}>
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
