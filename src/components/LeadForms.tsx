"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  FINISHES,
  FINISH_ORDER,
  SITE_CONFIG,
  isPlaceholderValue,
  isShowroomOpen,
} from "@/config/site";
import { ROOM_LAYOUTS } from "@/config/layouts";
import { WALL_SPECS, formatFeetInches, planRoom, summarizePlan, wallsFromParams } from "@/engine/kitchen-planner";
import type { CeilingHeightFt, LayoutId } from "@/config/site";
import {
  captureUtmParams,
  hasUsedConfigurator,
  trackEvent,
} from "@/lib/analytics";
import type { StudioCanvasHandle } from "./StudioCanvas";

const StudioCanvas = dynamic(
  () => import("./StudioCanvas").then((m) => m.StudioCanvas),
  { ssr: false }
);

interface ConfirmationResult {
  leadId: string;
  filesReceived?: number;
}

/** Shared Confirmation Screen with 3D Flat-Pack Assembling Into a Cabinet */
function LeadConfirmationCard({
  title,
  summary,
  result,
  onReset,
}: {
  title: string;
  summary: string;
  result: ConfirmationResult;
  onReset: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<StudioCanvasHandle | null>(null);
  const hasResponsePromise = !isPlaceholderValue(SITE_CONFIG.RESPONSE_PROMISE);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);

  return (
    <div
      ref={cardRef}
      className="arch-card"
      role="status"
      aria-live="polite"
      id="form-confirmation"
      style={{ scrollMarginTop: "calc(var(--header-h) + 2rem)" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.75rem",
          alignItems: "center",
        }}
      >
        <div style={{ height: "280px", border: "1px solid var(--border)", overflow: "hidden" }}>
          <StudioCanvas
            ref={animRef}
            config={{
              mode: "confirm-pack",
              layout: "l-shape",
              collection: "traditional-shaker",
              finish: "premium-oak",
              ceiling: 9,
              view: "perspective",
              timeOfDay: 0.78,
            }}
            style={{ height: "100%", minHeight: "280px" }}
            ariaLabel="Animated 3D flat-pack assembling into a complete cabinet confirming submission"
            showConceptLabel={false}
          />
        </div>
        <div>
          <p className="mono-label" style={{ color: "var(--accent)", marginBottom: "0.4rem" }}>
            Reference · {result.leadId}
          </p>
          <h3 className="h2-serif" style={{ marginBottom: "0.65rem" }}>
            {title}
          </h3>
          <p style={{ margin: "0 0 0.85rem", color: "var(--fg-muted)" }}>{summary}</p>
          {typeof result.filesReceived === "number" && result.filesReceived > 0 && (
            <p className="mono-label" style={{ marginBottom: "0.75rem" }}>
              Files received: {result.filesReceived}
            </p>
          )}
          {hasResponsePromise ? (
            <p style={{ margin: "0 0 1.1rem", fontWeight: 500 }}>
              {SITE_CONFIG.RESPONSE_PROMISE}
            </p>
          ) : (
            <p style={{ margin: "0 0 1.1rem", color: "var(--fg-muted)", fontSize: "0.9rem" }}>
              A person on our DFW team reviews every drawing and follows up directly.
            </p>
          )}
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => animRef.current?.replayConfirm()}
            >
              Replay assembly
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={onReset}>
              Submit another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reads attached /compose URL parameters if visitor clicked "Get this quoted" */
function useAttachedConfig() {
  const sp = useSearchParams();
  return useMemo(() => {
    const layout = sp.get("layout");
    const collection = sp.get("collection");
    const finish = sp.get("finish");
    const ceiling = sp.get("ceiling");
    if (!layout && !collection && !finish) return null;
    // Measured walls and the planned cabinet count, so the team sees the same list the visitor saw.
    let plan: string | undefined;
    if (layout && layout in ROOM_LAYOUTS) {
      const lid = layout as LayoutId;
      const ceil = (["8", "9", "10"].includes(ceiling ?? "") ? Number(ceiling) : 9) as CeilingHeightFt;
      const walls = wallsFromParams(lid, (k) => sp.get(k));
      const p = planRoom(lid, walls, ceil);
      const sched = summarizePlan(p);
      const wallText = WALL_SPECS[lid].map((w) => `${w.label.toLowerCase()} ${formatFeetInches(walls[w.key])}`).join(", ");
      plan = `${wallText}; ${sched.cabinetCount + sched.stackedUpperCount} cabinets, ${formatFeetInches(p.totals.baseRunIn)} of base cabinets`;
    }
    return {
      plan,
      layout: layout || undefined,
      collection: collection || undefined,
      finish: finish || undefined,
      ceiling: ceiling || undefined,
      shareUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/compose?${sp.toString()}`
          : undefined,
    };
  }, [sp]);
}

/**
 * 1. SEND A PLAN (Builders & Remodelers — Most Important Form on the Site)
 * Includes multi-file drag-and-drop/keyboard upload, rough 3D Plan-to-Preview massing (Stretch Goal),
 * Zod validation, honeypot spam guard, and 3D flat-pack confirmation assembly.
 */
export function SendAPlanForm() {
  const pathname = usePathname();
  const attachedConfig = useAttachedConfig();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startedRef = useRef(false);

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("Builder / General Contractor");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContact, setPreferredContact] = useState<"email" | "phone" | "text">("phone");
  const [projectZip, setProjectZip] = useState("");
  const [projectType, setProjectType] = useState("Remodel");
  const [kitchenCount, setKitchenCount] = useState("1");
  const [bathCount, setBathCount] = useState("1");
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [collectionPref, setCollectionPref] = useState(
    attachedConfig?.collection || "help-me-choose"
  );
  const [finishPref, setFinishPref] = useState(attachedConfig?.finish || "help-me-choose");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmed, setConfirmed] = useState<ConfirmationResult | null>(null);

  const markStart = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("form_start", { form: "send-a-plan", page: pathname });
    }
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    markStart();
    const list = Array.from(incoming);
    setFiles((prev) => [...prev, ...list].slice(0, 10));
    trackEvent("upload_success", { form: "send-a-plan", count: list.length });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      const payload = {
        formType: "send-a-plan" as const,
        audience: "builder-remodeler" as const,
        name,
        email,
        phone,
        company,
        role,
        preferredContact,
        projectZip,
        projectType,
        kitchenCount,
        bathCount,
        deliveryWindow,
        collectionPref,
        finishPref,
        notes,
        configuratorState: attachedConfig || undefined,
        sourcePage: pathname,
        usedConfigurator: hasUsedConfigurator() || Boolean(attachedConfig),
        utm: captureUtmParams(),
        website_url: honeypot,
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/leads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Please check your details and try again.");
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        return;
      }

      trackEvent("form_submit", {
        form: "send-a-plan",
        audience: "builder-remodeler",
        files: files.length,
        usedConfigurator: payload.usedConfigurator,
      });
      setConfirmed({ leadId: data.leadId, filesReceived: data.filesReceived });
    } catch {
      setError("Network error while sending your plan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <LeadConfirmationCard
        title="Plan received."
        summary="Your project package is in our DFW estimating queue. Our team checks every cabinet box, filler, panel, and trim item by hand before sending an itemized list."
        result={confirmed}
        onReset={() => {
          setConfirmed(null);
          setFiles([]);
        }}
      />
    );
  }

  // Stretch Goal: Instant rough 3D massing layout picked from kitchen count / preference when plans are attached
  const previewLayout = Number(kitchenCount) >= 2 ? "island" : "l-shape";
  const previewCollection =
    collectionPref in COLLECTIONS
      ? (collectionPref as keyof typeof COLLECTIONS)
      : "traditional-shaker";
  const previewFinish =
    finishPref in FINISHES ? (finishPref as keyof typeof FINISHES) : "premium-oak";

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Send a plan form">
      {attachedConfig && (
        <div className="arch-card" style={{ marginBottom: "1.5rem" }}>
          <span className="mono-label" style={{ color: "var(--accent)" }}>
            Attached from /compose
          </span>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.94rem" }}>
            {attachedConfig.layout && attachedConfig.layout in ROOM_LAYOUTS
              ? ROOM_LAYOUTS[attachedConfig.layout as keyof typeof ROOM_LAYOUTS].name
              : attachedConfig.layout}{" "}
            · {attachedConfig.collection} · {attachedConfig.finish} · {attachedConfig.ceiling} ft ceiling
            {attachedConfig.plan && <><br />{attachedConfig.plan}</>}
          </p>
        </div>
      )}

      {/* Step 1: Drag & Drop Plan Upload */}
      <div style={{ marginBottom: "1.75rem" }}>
        <p className="mono-label" style={{ marginBottom: "0.5rem" }}>
          01 · Drawings or hand sketches
        </p>
        <div
          className={`dropzone ${dragOver ? "is-dragover" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
        >
          <label htmlFor="plan-files-input" className="sr-only">
            Upload architectural drawings, PDFs, DWG, DXF, or photos of hand sketches
          </label>
          <input
            ref={fileInputRef}
            id="plan-files-input"
            type="file"
            multiple
            accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp,.heic"
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
          <p style={{ margin: "0 0 0.6rem", fontWeight: 500 }}>
            Drop architectural PDFs, DWG, DXF, or photos of hand sketches here
          </p>
          <p className="form-hint" style={{ margin: "0 0 1rem" }}>
            Up to 10 files (25 MB each). Keyboard accessible.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose files
          </button>

          {files.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                margin: "1.15rem 0 0",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
                textAlign: "left",
              }}
            >
              {files.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    fontSize: "0.88rem",
                  }}
                >
                  <span>
                    {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                  </span>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stretch Goal: Plan-to-Preview 3D Rough Massing when files are attached */}
        {files.length > 0 && (
          <div className="arch-card" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <span className="mono-label" style={{ color: "var(--accent)" }}>
                Plan-to-preview · Rough 3D cabinet massing
              </span>
              <span className="mono-label">No automated quote — our team will check every piece</span>
            </div>
            <div style={{ height: "220px", border: "1px solid var(--border)", overflow: "hidden" }}>
              <StudioCanvas
                config={{
                  mode: "configurator",
                  layout: previewLayout,
                  collection: previewCollection,
                  finish: previewFinish,
                  ceiling: 9,
                  view: "perspective",
                  timeOfDay: 0.74,
                }}
                style={{ height: "100%", minHeight: "220px" }}
                ariaLabel="Rough 3D cabinet massing preview. Concept render."
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Project Basics */}
      <p className="mono-label" style={{ marginBottom: "0.8rem" }}>
        02 · Project basics
      </p>
      <div className="form-grid" style={{ marginBottom: "1.75rem" }}>
        <div className="form-field">
          <label htmlFor="plan-zip" className="form-label">Project ZIP code</label>
          <input
            id="plan-zip"
            className="form-input"
            placeholder="75080"
            value={projectZip}
            onFocus={markStart}
            onChange={(e) => setProjectZip(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-type" className="form-label">Project type</label>
          <select
            id="plan-type"
            className="form-select"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            <option value="New build">New build</option>
            <option value="Remodel">Remodel</option>
            <option value="Multifamily">Multifamily</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="plan-kitchens" className="form-label">Number of kitchens</label>
          <input
            id="plan-kitchens"
            type="number"
            min="0"
            max="200"
            className="form-input"
            value={kitchenCount}
            onChange={(e) => setKitchenCount(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-baths" className="form-label">Number of baths</label>
          <input
            id="plan-baths"
            type="number"
            min="0"
            max="200"
            className="form-input"
            value={bathCount}
            onChange={(e) => setBathCount(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-window" className="form-label">Desired delivery window</label>
          <input
            id="plan-window"
            className="form-input"
            placeholder="e.g., March 2027 or flexible"
            value={deliveryWindow}
            onChange={(e) => setDeliveryWindow(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-collection" className="form-label">Collection preference</label>
          <select
            id="plan-collection"
            className="form-select"
            value={collectionPref}
            onChange={(e) => setCollectionPref(e.target.value)}
          >
            <option value="help-me-choose">Help me choose</option>
            {COLLECTION_LIST.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-field full">
          <label htmlFor="plan-finish" className="form-label">Finish preference</label>
          <select
            id="plan-finish"
            className="form-select"
            value={finishPref}
            onChange={(e) => setFinishPref(e.target.value)}
          >
            <option value="help-me-choose">Help me choose</option>
            {FINISH_ORDER.map((f) => (
              <option key={f} value={f}>{FINISHES[f].name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 3: Contact */}
      <p className="mono-label" style={{ marginBottom: "0.8rem" }}>
        03 · Contact details
      </p>
      <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="form-field">
          <label htmlFor="plan-name" className="form-label">Your name *</label>
          <input
            id="plan-name"
            required
            className="form-input"
            value={name}
            onFocus={markStart}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <span className="form-error">{fieldErrors.name[0]}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="plan-company" className="form-label">Company</label>
          <input
            id="plan-company"
            className="form-input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-role" className="form-label">Role</label>
          <input
            id="plan-role"
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-phone" className="form-label">Phone</label>
          <input
            id="plan-phone"
            type="tel"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="plan-email" className="form-label">Email *</label>
          <input
            id="plan-email"
            type="email"
            required
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <span className="form-error">{fieldErrors.email[0]}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="plan-contact-method" className="form-label">Preferred contact method</label>
          <select
            id="plan-contact-method"
            className="form-select"
            value={preferredContact}
            onChange={(e) => setPreferredContact(e.target.value as "email" | "phone" | "text")}
          >
            <option value="phone">Phone call</option>
            <option value="email">Email</option>
            <option value="text">Text message</option>
          </select>
        </div>

        <div className="form-field full">
          <label htmlFor="plan-notes" className="form-label">Notes, ceiling heights, or appliance callouts</label>
          <textarea
            id="plan-notes"
            className="form-textarea"
            placeholder="8, 9, or 10 ft ceilings, RTA flat-pack vs assembled preference, special clearances..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Honeypot Spam Field */}
      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor="plan-website-url">Website URL</label>
        <input
          id="plan-website-url"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {error && (
        <p className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <p className="form-hint" style={{ margin: 0 }}>
          Customers arrange their own installation. Your installer, your schedule.
        </p>
        <button type="submit" id="plan-submit-btn" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Sending plan..." : "Send plan for quote"}
        </button>
      </div>
    </form>
  );
}

/**
 * 2. BOOK A VISIT / PREVIEW LIST (Homeowners)
 * Until OPENING_DATE is set, offers virtual consultation & preview list only.
 */
export function BookVisitForm() {
  const pathname = usePathname();
  const attachedConfig = useAttachedConfig();
  const open = isShowroomOpen();
  const startedRef = useRef(false);

  const [visitType, setVisitType] = useState(
    open ? "Showroom visit" : "Join preview list (Be first through the doors)"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectZip, setProjectZip] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [roughDimensions, setRoughDimensions] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmed, setConfirmed] = useState<ConfirmationResult | null>(null);

  const markStart = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("form_start", { form: "book-visit", page: pathname });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const formType = visitType.toLowerCase().includes("preview")
        ? "preview-list"
        : "book-visit";
      const payload = {
        formType,
        audience: "homeowner" as const,
        name,
        email,
        phone,
        projectZip,
        visitType,
        requestedDate,
        roughDimensions,
        notes,
        configuratorState: attachedConfig || undefined,
        sourcePage: pathname,
        usedConfigurator: hasUsedConfigurator() || Boolean(attachedConfig),
        utm: captureUtmParams(),
        website_url: honeypot,
      };
      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/leads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Please check your details.");
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        return;
      }
      trackEvent("form_submit", {
        form: formType,
        audience: "homeowner",
        usedConfigurator: payload.usedConfigurator,
      });
      setConfirmed({ leadId: data.leadId, filesReceived: data.filesReceived });
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <LeadConfirmationCard
        title={open ? "Request received." : "You are on the preview list."}
        summary={
          open
            ? "We have your consultation request and room notes. Our DFW design team will confirm your appointment directly."
            : "We will invite preview-list homeowners first as soon as the Dallas–Fort Worth showroom doors open, and follow up on any virtual consultation notes."
        }
        result={confirmed}
        onReset={() => setConfirmed(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Book a visit or join preview list">
      {attachedConfig && (
        <div className="arch-card" style={{ marginBottom: "1.5rem" }} id="attached-compose-summary">
          <span className="mono-label" style={{ color: "var(--accent)" }}>
            Saved kitchen configuration attached
          </span>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem" }}>
            Layout:{" "}
            <strong>
              {attachedConfig.layout && attachedConfig.layout in ROOM_LAYOUTS
                ? ROOM_LAYOUTS[attachedConfig.layout as keyof typeof ROOM_LAYOUTS].name
                : attachedConfig.layout}
            </strong>{" "}
            · Door style: <strong>{attachedConfig.collection}</strong> · Finish:{" "}
            <strong>{attachedConfig.finish}</strong> · Ceiling:{" "}
            <strong>{attachedConfig.ceiling} ft</strong>
            {attachedConfig.plan && <><br />{attachedConfig.plan}</>}
          </p>
        </div>
      )}

      {open && SITE_CONFIG.CAL_BOOKING_URL && (
        <div className="arch-card" style={{ marginBottom: "1.5rem" }}>
          <p className="mono-label" style={{ marginBottom: "0.4rem" }}>Direct calendar</p>
          <p style={{ margin: "0 0 0.75rem", color: "var(--fg-muted)" }}>
            Prefer picking an exact slot immediately? Open our scheduling calendar, or request a time below.
          </p>
          <a
            href={SITE_CONFIG.CAL_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
          >
            Open booking calendar
          </a>
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="form-field full">
          <label htmlFor="visit-type" className="form-label">How would you like to meet?</label>
          <select
            id="visit-type"
            className="form-select"
            value={visitType}
            onFocus={markStart}
            onChange={(e) => setVisitType(e.target.value)}
          >
            {open ? (
              <>
                <option value="Showroom visit">Showroom visit</option>
                <option value="Design consultation">Design consultation</option>
                <option value="Virtual consultation">Virtual consultation</option>
              </>
            ) : (
              <>
                <option value="Join preview list (Be first through the doors)">
                  Join the preview list — Be first through the doors
                </option>
                <option value="Virtual consultation">
                  Book a virtual design consultation now
                </option>
              </>
            )}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="visit-name" className="form-label">Full name *</label>
          <input
            id="visit-name"
            required
            className="form-input"
            value={name}
            onFocus={markStart}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <span className="form-error">{fieldErrors.name[0]}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="visit-email" className="form-label">Email *</label>
          <input
            id="visit-email"
            type="email"
            required
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <span className="form-error">{fieldErrors.email[0]}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="visit-phone" className="form-label">Phone</label>
          <input
            id="visit-phone"
            type="tel"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="visit-zip" className="form-label">DFW city or ZIP</label>
          <input
            id="visit-zip"
            className="form-input"
            placeholder="Frisco, Plano, Richardson, 75034..."
            value={projectZip}
            onChange={(e) => setProjectZip(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="visit-date" className="form-label">Preferred timing</label>
          <input
            id="visit-date"
            className="form-input"
            placeholder="Weekday afternoon, Saturday morning..."
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="visit-photos" className="form-label">Room photos or sketch (optional)</label>
          <input
            id="visit-photos"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="form-input"
            style={{ paddingTop: "0.55rem" }}
            onChange={(e) => {
              const incoming = e.target.files ? Array.from(e.target.files) : [];
              setFiles(incoming);
              if (incoming.length > 0) {
                trackEvent("upload_success", { form: "book-visit", count: incoming.length });
              }
            }}
          />
        </div>

        <div className="form-field full">
          <label htmlFor="visit-dims" className="form-label">Rough room dimensions &amp; ceiling height</label>
          <input
            id="visit-dims"
            className="form-input"
            placeholder="e.g., 12 ft × 14 ft kitchen, 9 ft ceiling, replacing builder-grade cabinets"
            value={roughDimensions}
            onChange={(e) => setRoughDimensions(e.target.value)}
          />
        </div>

        <div className="form-field full">
          <label htmlFor="visit-notes" className="form-label">Project notes</label>
          <textarea
            id="visit-notes"
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor="visit-hp">Website</label>
        <input id="visit-hp" tabIndex={-1} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      {error && (
        <p className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      <button type="submit" id="visit-submit-btn" className="btn btn-primary" disabled={submitting}>
        {submitting
          ? "Submitting..."
          : open
            ? "Request appointment"
            : visitType.toLowerCase().includes("preview")
              ? "Join preview list"
              : "Request virtual consultation"}
      </button>
    </form>
  );
}

/**
 * 3. TRADE ACCOUNT / REFERRAL / DEALER FORM
 */
export function TradeAccountForm({
  mode = "trade-account",
}: {
  mode?: "trade-account" | "referral-partner" | "dealer-inquiry" | "contact";
}) {
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [tradeType, setTradeType] = useState(
    mode === "referral-partner"
      ? "Realtor / Referral partner"
      : mode === "dealer-inquiry"
        ? "Dealer / Reseller"
        : "Builder"
  );
  const [website, setWebsite] = useState("");
  const [projectVolume, setProjectVolume] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [confirmed, setConfirmed] = useState<ConfirmationResult | null>(null);

  const audience =
    mode === "referral-partner"
      ? "realtor-referral"
      : mode === "dealer-inquiry"
        ? "dealer"
        : mode === "contact"
          ? "general"
          : tradeType === "Designer" || tradeType === "Architect"
            ? "designer-architect"
            : "builder-remodeler";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const localErrors: Record<string, string[]> = {};
    if (!name.trim()) localErrors.name = ["Enter your name."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) localErrors.email = ["Enter an email address we can reply to."];
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setError("Check the highlighted fields.");
      const first = Object.keys(localErrors)[0];
      document.getElementById(`${mode}-${first}`)?.focus();
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        formType: mode,
        audience,
        name,
        email,
        phone,
        company,
        tradeType,
        website,
        projectVolume,
        notes,
        sourcePage: pathname,
        usedConfigurator: hasUsedConfigurator(),
        utm: captureUtmParams(),
        website_url: honeypot,
      };
      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/leads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setError(data.error || "Please complete required fields.");
        return;
      }
      trackEvent("form_submit", { form: mode, audience });
      setConfirmed({ leadId: data.leadId, filesReceived: data.filesReceived });
    } catch {
      setError("Unable to send right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <LeadConfirmationCard
        title="Submission received."
        summary="Your inquiry has been routed to our DFW team with your project details intact."
        result={confirmed}
        onReset={() => setConfirmed(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={`${mode} form`}>
      <div className="form-grid" style={{ marginBottom: "1.4rem" }}>
        <div className="form-field">
          <label htmlFor={`${mode}-name`} className="form-label">Full name *</label>
          <input
            id={`${mode}-name`}
            required
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? `${mode}-name-error` : undefined}
          />
          {fieldErrors.name && <span id={`${mode}-name-error`} className="form-error">{fieldErrors.name[0]}</span>}
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-email`} className="form-label">Email *</label>
          <input
            id={`${mode}-email`}
            type="email"
            required
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? `${mode}-email-error` : undefined}
          />
          {fieldErrors.email && <span id={`${mode}-email-error`} className="form-error">{fieldErrors.email[0]}</span>}
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-phone`} className="form-label">Phone</label>
          <input id={`${mode}-phone`} type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {mode !== "contact" && (
          <div className="form-field">
            <label htmlFor={`${mode}-company`} className="form-label">Company / Brokerage</label>
            <input id={`${mode}-company`} className="form-input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
        )}
        {mode === "trade-account" && (
          <>
            <div className="form-field">
              <label htmlFor="trade-type" className="form-label">Trade type</label>
              <select
                id="trade-type"
                className="form-select"
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value)}
              >
                <option value="Builder">Builder</option>
                <option value="Remodeler">Remodeler</option>
                <option value="Designer">Interior designer</option>
                <option value="Architect">Architect</option>
                {SITE_CONFIG.featureFlags.dealerChannel && (
                  <option value="Dealer">Dealer / Reseller</option>
                )}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="trade-website" className="form-label">Website</label>
              <input id="trade-website" className="form-input" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="trade-volume" className="form-label">Typical project volume</label>
              <input id="trade-volume" className="form-input" placeholder="e.g., 6–12 kitchens per year" value={projectVolume} onChange={(e) => setProjectVolume(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="trade-cert" className="form-label">License or Texas resale certificate (optional)</label>
              <input
                id="trade-cert"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="form-input"
                style={{ paddingTop: "0.55rem" }}
                onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
              />
            </div>
          </>
        )}
        <div className="form-field full">
          <label htmlFor={`${mode}-notes`} className="form-label">Message</label>
          <textarea id={`${mode}-notes`} className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="honeypot-field" aria-hidden="true">
        <label htmlFor={`${mode}-hp`}>Website</label>
        <input id={`${mode}-hp`} tabIndex={-1} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      {error && (
        <p className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      <button type="submit" id={`${mode}-submit-btn`} className="btn btn-primary" disabled={submitting}>
        {submitting
          ? "Sending..."
          : mode === "trade-account"
            ? "Apply for trade account"
            : mode === "referral-partner"
              ? "Become a referral partner"
              : mode === "dealer-inquiry"
                ? "Submit dealer inquiry"
                : "Send message"}
      </button>
    </form>
  );
}
