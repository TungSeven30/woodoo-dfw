"use client";

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  CeilingHeightFt,
  CollectionSlug,
  FINISHES,
  FINISH_ORDER,
  FinishSlug,
  LayoutId,
  SITE_CONFIG,
  isValidFinishForCollection,
  resolveFinishForCollection,
} from "@/config/site";
import { LAYOUT_ORDER, ROOM_LAYOUTS } from "@/config/layouts";
import {
  WALL_SPECS,
  formatFeetInches,
  planRoom,
  resolveWalls,
  summarizePlan,
  wallsFromParams,
  wallsToParams,
  type WallKey,
} from "@/engine/kitchen-planner";
import { estimatePrice } from "@/config/pricing";
import type { StudioCanvasHandle } from "./StudioCanvas";
import type { StudioViewMode } from "@/engine/studio-engine";
import { markConfiguratorUsed, trackEvent } from "@/lib/analytics";

// Download names follow the brand setting, so a rename needs no code change.
const FILE_PREFIX = SITE_CONFIG.BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const StudioCanvas = dynamic(
  () => import("./StudioCanvas").then((m) => m.StudioCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "62vh",
          display: "grid",
          placeItems: "center",
          background: "#ebe6de",
          color: "#6f675e",
        }}
      >
        <span style={{ fontSize: "0.95rem" }}>Loading the studio…</span>
      </div>
    ),
  }
);

function parseLayout(raw: string | null): LayoutId {
  if (raw && raw in ROOM_LAYOUTS) return raw as LayoutId;
  return "l-shape";
}

function parseCollection(raw: string | null): CollectionSlug {
  if (raw && raw in COLLECTIONS) return raw as CollectionSlug;
  return "traditional-shaker";
}

function parseFinish(raw: string | null, col: CollectionSlug): FinishSlug {
  if (raw && raw in FINISHES) {
    return resolveFinishForCollection(col, raw as FinishSlug);
  }
  return COLLECTIONS[col].defaultFinish;
}

function parseCeiling(raw: string | null): CeilingHeightFt {
  if (raw === "8" || raw === "9" || raw === "10") return Number(raw) as CeilingHeightFt;
  return 9;
}

export function ComposeStudio() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<StudioCanvasHandle | null>(null);

  const initialCol = parseCollection(searchParams.get("collection"));
  const [layout, setLayout] = useState<LayoutId>(() => parseLayout(searchParams.get("layout")));
  const [collection, setCollection] = useState<CollectionSlug>(() => initialCol);
  const [finish, setFinish] = useState<FinishSlug>(() =>
    parseFinish(searchParams.get("finish"), initialCol)
  );
  const [ceiling, setCeiling] = useState<CeilingHeightFt>(() =>
    parseCeiling(searchParams.get("ceiling"))
  );
  const [walls, setWalls] = useState<Record<WallKey, number>>(() =>
    wallsFromParams(parseLayout(searchParams.get("layout")), (k) => searchParams.get(k))
  );
  const [view, setView] = useState<StudioViewMode>("perspective");
  const savedRaw = useSyncExternalStore(subscribeSaved, getSavedSnapshot, () => "[]");
  const saved = useMemo(() => parseSaved(savedRaw), [savedRaw]);
  const setSaved = (list: SavedDesign[]) => writeSaved(list);
  // Neutral midday light by default, so the finishes read true, as in the photos.
  const [timeOfDay, setTimeOfDay] = useState<number>(0.5);
  const [savedToast, setSavedToast] = useState<string>("");
  const [liveStatus, setLiveStatus] = useState<string>("");
  const [exportingAr, setExportingAr] = useState(false);

  useEffect(() => {
    markConfiguratorUsed();
  }, []);

  const announce = (
    nextL: LayoutId,
    nextC: CollectionSlug,
    nextF: FinishSlug,
    nextCeil: CeilingHeightFt
  ) => {
    const msg = `${ROOM_LAYOUTS[nextL].name}, ${COLLECTIONS[nextC].name}, ${FINISHES[nextF].name}, ${nextCeil}-foot ceiling.`;
    setLiveStatus(msg);
    markConfiguratorUsed();
    trackEvent("configurator_change", {
      source: "compose",
      layout: nextL,
      collection: nextC,
      finish: nextF,
      ceiling: nextCeil,
    });
  };

  const shareQuery = useMemo(() => {
    const sp = new URLSearchParams({
      layout,
      collection,
      finish,
      ceiling: String(ceiling),
      ...wallsToParams(layout, walls),
    });
    return sp.toString();
  }, [layout, collection, finish, ceiling, walls]);

  // Keep browser URL cleanly in sync as user configures
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}?${shareQuery}`;
    window.history.replaceState(null, "", nextUrl);
  }, [shareQuery]);

  const flash = (msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => setSavedToast(""), 4500);
  };

  const shareUrl = () => `${window.location.origin}/compose?${shareQuery}`;

  const handleShare = async () => {
    const url = shareUrl();
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    trackEvent("configurator_share", { layout, collection, finish, ceiling });
    if (nav.share && window.matchMedia?.("(pointer: coarse)").matches) {
      try {
        await nav.share({ title: `${ROOM_LAYOUTS[layout].name} · ${SITE_CONFIG.BRAND_NAME}`, url });
        return;
      } catch {
        // cancelled: fall through to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied. Anyone with it sees this exact kitchen.");
    } catch {
      flash("The link is in your address bar.");
    }
  };

  const handleSaveHere = () => {
    const name = `${ROOM_LAYOUTS[layout].shortName}, ${WALL_SPECS[layout].map((w) => formatFeetInches(walls[w.key])).join(" × ")}`;
    const entry: SavedDesign = { name, query: shareQuery, finish, at: Date.now() };
    const next = [entry, ...saved.filter((d) => d.query !== shareQuery)].slice(0, 6);
    setSaved(next);
    trackEvent("configurator_save", { layout, collection, finish, ceiling });
    flash("Saved on this device.");
  };

  const handleDownloadImage = () => {
    const stillData = canvasRef.current?.exportStill();
    if (!stillData) return;
    const a = document.createElement("a");
    a.href = stillData;
    a.download = `${FILE_PREFIX}-${layout}-${collection}-${finish}-${ceiling}ft.png`;
    a.click();
    flash("Image downloaded.");
  };

  const handleExportAr = async () => {
    setExportingAr(true);
    try {
      const blob = await canvasRef.current?.exportGltf();
      if (blob) {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = `${FILE_PREFIX}-${layout}-${collection}-${finish}.glb`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
        setSavedToast("3D model downloaded (.glb).");
      }
    } finally {
      setExportingAr(false);
    }
  };

  const quoteUrl = `/showroom?${shareQuery}&from=compose`;
  const tradeQuoteUrl = `/trade/send-a-plan?${shareQuery}&from=compose`;

  const dayLabel =
    timeOfDay < 0.25 ? "Morning" : timeOfDay < 0.6 ? "Midday" : timeOfDay < 0.85 ? "Afternoon" : "Evening";

  const plan = useMemo(() => planRoom(layout, walls, ceiling), [layout, walls, ceiling]);
  const sched = useMemo(() => summarizePlan(plan), [plan]);
  const estimate = estimatePrice(plan.totals);
  const studioConfig = useMemo(
    () => ({ mode: "configurator" as const, layout, collection, finish, ceiling, view, timeOfDay, walls }),
    [layout, collection, finish, ceiling, view, timeOfDay, walls]
  );
  const finishOptions = FINISH_ORDER.filter((fSlug) => isValidFinishForCollection(collection, fSlug));

  return (
    <div className="cs">
      {/* The room. Sticky beside the options on desktop, pinned above them on phones. */}
      <div className="cs-stage">
        <StudioCanvas
          ref={canvasRef}
          config={studioConfig}
          style={{ height: "100%", minHeight: 0 }}
          ariaLabel={`Interactive 3D view of ${ROOM_LAYOUTS[layout].name} in ${COLLECTIONS[collection].name} ${FINISHES[finish].name} for a ${ceiling}-foot ceiling. Concept render.`}
        />
        <div className="cs-views" role="group" aria-label="Camera">
          {(
            [
              { id: "perspective", label: "Room" },
              { id: "walk-around", label: "Closer" },
              { id: "plan", label: "Plan" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              className="cs-view"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <aside className="cs-panel" aria-label="Kitchen options">
        <header className="cs-intro">
          <h1 className="cs-title">Compose your kitchen.</h1>
          <p className="cs-lede">
            Choose a room, a door and a finish. Drag the view to look around.
          </p>
        </header>

        <section className="cs-group" aria-labelledby="cs-layout">
          <h2 id="cs-layout" className="cs-h">
            Room. <span className="cs-q">Which layout are you planning?</span>
          </h2>
          <div className="cs-cards cs-cards-2">
            {LAYOUT_ORDER.map((lid) => (
              <button
                key={lid}
                type="button"
                id={`compose-layout-${lid}`}
                className="cs-card"
                aria-pressed={layout === lid}
                onClick={() => {
                  setLayout(lid);
                  setWalls((w) => resolveWalls(lid, w));
                  announce(lid, collection, finish, ceiling);
                }}
              >
                <span className="cs-card-name">{ROOM_LAYOUTS[lid].shortName}</span>
              </button>
            ))}
          </div>
          <p className="cs-note">{ROOM_LAYOUTS[layout].description}</p>
        </section>

        <section className="cs-group" aria-labelledby="cs-walls">
          <h2 id="cs-walls" className="cs-h">
            Walls. <span className="cs-q">Type your measurements.</span>
          </h2>
          {WALL_SPECS[layout].map((spec) => (
            <WallInput
              key={`${layout}-${spec.key}`}
              id={`compose-wall-${spec.key}`}
              label={spec.label}
              hint={spec.hint}
              min={spec.minIn}
              max={spec.maxIn}
              value={walls[spec.key]}
              onChange={(v) => setWalls((w) => resolveWalls(layout, { ...w, [spec.key]: v }))}
            />
          ))}
          <p className="cs-note">
            Cabinets refit in 3&quot; steps as you type, with fillers against the walls. Appliances keep
            their real openings.
          </p>
        </section>

        <section className="cs-group" aria-labelledby="cs-door">
          <h2 id="cs-door" className="cs-h">
            Door. <span className="cs-q">Which profile suits the room?</span>
          </h2>
          <div className="cs-cards">
            {COLLECTION_LIST.map((col) => (
              <button
                key={col.slug}
                type="button"
                id={`compose-collection-${col.slug}`}
                className="cs-card cs-card-row"
                aria-pressed={collection === col.slug}
                onClick={() => {
                  const nextFinish = resolveFinishForCollection(col.slug, finish);
                  setCollection(col.slug);
                  setFinish(nextFinish);
                  announce(layout, col.slug, nextFinish, ceiling);
                }}
              >
                <span className="cs-card-name">{col.name}</span>
                <span className="cs-card-sub">{DOOR_LINES[col.slug]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cs-group" aria-labelledby="cs-finish">
          <h2 id="cs-finish" className="cs-h">
            Finish. <span className="cs-q">{finishOptions.length} for this door.</span>
          </h2>
          <div className="cs-swatches" role="group" aria-label="Finish">
            {finishOptions.map((fSlug) => {
              const f = FINISHES[fSlug];
              return (
                <button
                  key={fSlug}
                  type="button"
                  id={`compose-finish-${fSlug}`}
                  className="cs-swatch"
                  aria-pressed={finish === fSlug}
                  aria-label={f.name}
                  title={f.name}
                  onClick={() => {
                    setFinish(fSlug);
                    announce(layout, collection, fSlug, ceiling);
                  }}
                >
                  <span style={{ backgroundImage: `url(${f.swatchImage})`, backgroundColor: f.swatchHex }} />
                </button>
              );
            })}
          </div>
          <p className="cs-finish-name">{FINISHES[finish].name}</p>
          <p className="cs-note">{FINISHES[finish].shortNote}</p>
        </section>

        <section className="cs-group" aria-labelledby="cs-ceiling">
          <h2 id="cs-ceiling" className="cs-h">
            Ceiling. <span className="cs-q">Wall cabinets stack to fit.</span>
          </h2>
          <div className="cs-segment" role="group" aria-label="Ceiling height">
            {([8, 9, 10] as CeilingHeightFt[]).map((ft) => (
              <button
                key={ft}
                type="button"
                id={`compose-ceiling-${ft}`}
                aria-pressed={ceiling === ft}
                onClick={() => {
                  setCeiling(ft);
                  announce(layout, collection, finish, ft);
                }}
              >
                {ft} ft
              </button>
            ))}
          </div>
        </section>

        <section className="cs-group" aria-labelledby="cs-light">
          <div className="cs-row">
            <h2 id="cs-light" className="cs-h">
              <label htmlFor="texas-light-slider">Light.</label>
            </h2>
            <span className="cs-q">{dayLabel}</span>
          </div>
          <input
            id="texas-light-slider"
            className="cs-range"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
          />
        </section>

        <section className="cs-summary" aria-label="Your kitchen">
          <p className="cs-summary-title">Your {ROOM_LAYOUTS[layout].roomType === "bath" ? "bath" : "kitchen"}</p>
          <p className="cs-summary-line">
            {ROOM_LAYOUTS[layout].shortName} · {COLLECTIONS[collection].name} · {FINISHES[finish].name} ·{" "}
            {ceiling} ft
          </p>

          <dl className="cs-figures">
            <div>
              <dt>Cabinets</dt>
              <dd>{sched.cabinetCount + sched.stackedUpperCount}</dd>
            </div>
            <div>
              <dt>Base run</dt>
              <dd>{formatFeetInches(plan.totals.baseRunIn)}</dd>
            </div>
            <div>
              <dt>{plan.totals.wallRunIn > 0 ? "Wall run" : "Counter"}</dt>
              <dd>{plan.totals.wallRunIn > 0 ? formatFeetInches(plan.totals.wallRunIn) : `${plan.totals.counterSqFt} sq ft`}</dd>
            </div>
          </dl>

          <div className="cs-estimate">
            <p className="cs-estimate-label">Estimate</p>
            {estimate ? (
              <p className="cs-estimate-value">
                ${estimate.low.toLocaleString("en-US")} to ${estimate.high.toLocaleString("en-US")}
                <span className="cs-q"> cabinets only</span>
              </p>
            ) : (
              <p className="cs-note">
                Priced from this exact list once a person checks your measurements. Send it below.
              </p>
            )}
          </div>

          <details className="cs-details">
            <summary>
              <span>Cabinet list</span>
              <span className="cs-q">{sched.cabinetCount + sched.stackedUpperCount} cabinets</span>
            </summary>
            <ul>
              {sched.items.map((item) => (
                <li key={`${item.code}-${item.role}-${item.dimensionsLabel}`}>
                  <span className="cs-code">
                    {item.quantity}× {item.code}
                  </span>
                  <span>
                    {item.role} · {item.dimensionsLabel}
                  </span>
                </li>
              ))}
              {sched.moldingRuns > 0 && (
                <li>
                  <span className="cs-code">Crown</span>
                  <span>3&quot; molding for {ceiling} ft</span>
                </li>
              )}
              {sched.appliances.map((a) => (
                <li key={a}>
                  <span className="cs-code">Opening</span>
                  <span>{a.replace(/ opening/, "")}</span>
                </li>
              ))}
            </ul>
            <p className="cs-note">
              Box sizes follow standard frameless proportions. A person checks every cabinet, filler
              and panel against your measurements before you get a price.
            </p>
          </details>

          <div className="cs-actions">
            <Link
              href={quoteUrl}
              id="compose-get-quoted"
              className="btn btn-primary cs-btn"
              onClick={() =>
                trackEvent("cta_click", { cta: "compose-get-quoted", layout, collection, finish, ceiling })
              }
            >
              Get a quote for this {ROOM_LAYOUTS[layout].roomType === "bath" ? "bath" : "kitchen"}
            </Link>
            <Link
              href={tradeQuoteUrl}
              id="compose-send-plan"
              className="btn cs-btn"
              onClick={() =>
                trackEvent("cta_click", { cta: "compose-send-plan", layout, collection, finish, ceiling })
              }
            >
              Send it with a plan
            </Link>
          </div>
          <div className="cs-links">
            <button type="button" id="compose-share-btn" className="pp-link cs-linkbtn" onClick={() => void handleShare()}>
              Share link
            </button>
            <button type="button" id="compose-save-btn" className="pp-link cs-linkbtn" onClick={handleSaveHere}>
              Save on this device
            </button>
            <button type="button" id="compose-image-btn" className="pp-link cs-linkbtn" onClick={handleDownloadImage}>
              Download image
            </button>
            <button
              type="button"
              id="compose-ar-export"
              className="pp-link cs-linkbtn"
              disabled={exportingAr}
              onClick={() => void handleExportAr()}
            >
              {exportingAr ? "Preparing model" : "Download 3D model"}
            </button>
          </div>
          {savedToast && (
            <p role="status" className="cs-toast">
              {savedToast}
            </p>
          )}
          {saved.length > 0 && (
            <div className="cs-saved">
              <p className="cs-estimate-label">Saved on this device</p>
              <ul>
                {saved.map((d) => (
                  <li key={d.query}>
                    <a href={`/compose?${d.query}`} className="cs-saved-link">
                      <span
                        className="cs-saved-dot"
                        style={{ backgroundColor: FINISHES[d.finish as FinishSlug]?.swatchHex ?? "#ccc" }}
                        aria-hidden="true"
                      />
                      {d.name}
                    </a>
                    <button
                      type="button"
                      className="cs-linkbtn cs-saved-x"
                      aria-label={`Remove ${d.name}`}
                      onClick={() => {
                        setSaved(saved.filter((x) => x.query !== d.query));
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveStatus}
        </div>
      </aside>
    </div>
  );
}

const DOOR_LINES: Record<CollectionSlug, string> = {
  "traditional-shaker": "Wide frame, recessed panel",
  "slim-shaker": "Narrow frame, recessed panel",
  flat: "One plain slab",
};

interface SavedDesign {
  name: string;
  query: string;
  finish: string;
  at: number;
}

const SAVED_KEY = "compose-saved-v1";

const SAVED_EVENT = "compose-saved-change";
let savedMemory = "[]";

function getSavedSnapshot(): string {
  try {
    return window.localStorage.getItem(SAVED_KEY) ?? savedMemory;
  } catch {
    return savedMemory;
  }
}

function subscribeSaved(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  window.addEventListener(SAVED_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SAVED_EVENT, cb);
  };
}

function parseSaved(raw: string): SavedDesign[] {
  try {
    const list = JSON.parse(raw) as SavedDesign[];
    return Array.isArray(list) ? list.filter((d) => d && typeof d.query === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeSaved(list: SavedDesign[]) {
  savedMemory = JSON.stringify(list);
  try {
    window.localStorage.setItem(SAVED_KEY, savedMemory);
  } catch {
    // private mode or storage full: kept for this visit only; the share link still works
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
}

/** One wall: a slider for quick sizing and feet + inches fields for an exact tape measurement. */
function WallInput({
  id,
  label,
  hint,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const ft = Math.floor(value / 12);
  const inch = Math.round((value - ft * 12) * 4) / 4;
  // While someone types, keep their text; otherwise show the current value.
  const [draft, setDraft] = useState<{ ft: string; inch: string } | null>(null);
  const ftText = draft?.ft ?? String(ft);
  const inText = draft?.inch ?? String(inch);
  const setFtText = (v: string) => setDraft({ ft: v, inch: inText });
  const setInText = (v: string) => setDraft({ ft: ftText, inch: v });
  const commit = (fRaw: string, iRaw: string) => {
    setDraft(null);
    const f = Number(fRaw);
    const i = Number(iRaw);
    if (!Number.isFinite(f) || !Number.isFinite(i)) return;
    onChange(f * 12 + i);
  };
  return (
    <div className="cs-wall">
      <div className="cs-row">
        <label className="cs-wall-label" htmlFor={`${id}-range`}>
          {label} <span className="cs-q">{hint}</span>
        </label>
        <span className="cs-wall-fields">
          <input
            id={`${id}-ft`}
            aria-label={`${label}, feet`}
            className="cs-num"
            type="number"
            inputMode="numeric"
            min={Math.floor(min / 12)}
            max={Math.floor(max / 12)}
            value={ftText}
            onChange={(e) => setFtText(e.target.value)}
            onBlur={() => commit(ftText, inText)}
            onKeyDown={(e) => e.key === "Enter" && commit(ftText, inText)}
          />
          <span aria-hidden="true">′</span>
          <input
            id={`${id}-in`}
            aria-label={`${label}, inches`}
            className="cs-num"
            type="number"
            inputMode="decimal"
            min={0}
            max={11.75}
            step={0.25}
            value={inText}
            onChange={(e) => setInText(e.target.value)}
            onBlur={() => commit(ftText, inText)}
            onKeyDown={(e) => e.key === "Enter" && commit(ftText, inText)}
          />
          <span aria-hidden="true">″</span>
        </span>
      </div>
      <input
        id={`${id}-range`}
        className="cs-range"
        type="range"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        aria-valuetext={formatFeetInches(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
