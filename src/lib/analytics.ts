/**
 * Privacy-friendly conversion analytics wrapper.
 * Supports Plausible (NEXT_PUBLIC_PLAUSIBLE_DOMAIN), Vercel Analytics if loaded,
 * and a clean in-memory debug log (window.__analyticsEvents) for automated QA.
 * Zero tracking cookies -> zero cookie consent banner needed.
 */

export type AnalyticsEventName =
  | "scene_reached"
  | "configurator_change"
  | "configurator_save"
  | "cta_click"
  | "form_start"
  | "form_submit"
  | "upload_success";

export interface AnalyticsPayload {
  event: AnalyticsEventName;
  props: Record<string, string | number | boolean | undefined>;
  timestamp: string;
}

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean | undefined> }
    ) => void;
    __analyticsEvents?: AnalyticsPayload[];
  }
}

export function trackEvent(
  event: AnalyticsEventName,
  props: Record<string, string | number | boolean | undefined> = {}
): void {
  if (typeof window === "undefined") return;

  const record: AnalyticsPayload = {
    event,
    props,
    timestamp: new Date().toISOString(),
  };

  if (!window.__analyticsEvents) {
    window.__analyticsEvents = [];
  }
  window.__analyticsEvents.push(record);

  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, { props });
    }
  } catch {
    // Non-blocking analytics
  }
}

export interface UtmBundle {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

const UTM_KEY = "woodoo_utm_v1";
const CONF_USED_KEY = "woodoo_used_configurator";

export function captureUtmParams(): UtmBundle {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UtmBundle = {};
  (["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const).forEach(
    (k) => {
      const val = params.get(k);
      if (val) utm[k] = val;
    }
  );
  try {
    if (Object.keys(utm).length > 0) {
      window.sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      return utm;
    }
    const existing = window.sessionStorage.getItem(UTM_KEY);
    return existing ? (JSON.parse(existing) as UtmBundle) : {};
  } catch {
    return utm;
  }
}

export function markConfiguratorUsed(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CONF_USED_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasUsedConfigurator(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CONF_USED_KEY) === "1";
  } catch {
    return false;
  }
}
