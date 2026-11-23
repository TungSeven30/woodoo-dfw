import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

export const LeadFormTypeEnum = z.enum([
  "send-a-plan",
  "book-visit",
  "preview-list",
  "trade-account",
  "referral-partner",
  "dealer-inquiry",
  "contact",
]);

export const AudienceEnum = z.enum([
  "builder-remodeler",
  "homeowner",
  "designer-architect",
  "realtor-referral",
  "dealer",
  "general",
]);

export const UploadedFileMetaSchema = z.object({
  name: z.string().min(1).max(240),
  size: z.number().int().nonnegative().max(25 * 1024 * 1024),
  type: z.string().max(120),
});

export const LeadSubmissionSchema = z.object({
  formType: LeadFormTypeEnum,
  audience: AudienceEnum,
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address.").max(160),
  phone: z.string().trim().max(40).optional().default(""),
  company: z.string().trim().max(140).optional().default(""),
  role: z.string().trim().max(80).optional().default(""),
  preferredContact: z.enum(["email", "phone", "text", ""]).optional().default("email"),
  // Project / form-specific fields
  projectZip: z.string().trim().max(20).optional().default(""),
  projectType: z.string().trim().max(80).optional().default(""),
  kitchenCount: z.string().trim().max(20).optional().default(""),
  bathCount: z.string().trim().max(20).optional().default(""),
  deliveryWindow: z.string().trim().max(80).optional().default(""),
  collectionPref: z.string().trim().max(80).optional().default(""),
  finishPref: z.string().trim().max(80).optional().default(""),
  visitType: z.string().trim().max(80).optional().default(""),
  requestedDate: z.string().trim().max(80).optional().default(""),
  roughDimensions: z.string().trim().max(400).optional().default(""),
  tradeType: z.string().trim().max(80).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  projectVolume: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  // Attached configurator state
  configuratorState: z
    .object({
      layout: z.string().optional(),
      collection: z.string().optional(),
      finish: z.string().optional(),
      ceiling: z.union([z.string(), z.number()]).optional(),
      shareUrl: z.string().optional(),
    })
    .optional(),
  files: z.array(UploadedFileMetaSchema).max(10).optional().default([]),
  // Attribution metadata
  sourcePage: z.string().trim().max(200).optional().default("/"),
  usedConfigurator: z.boolean().optional().default(false),
  utm: z
    .object({
      utm_source: z.string().max(120).optional(),
      utm_medium: z.string().max(120).optional(),
      utm_campaign: z.string().max(120).optional(),
      utm_term: z.string().max(120).optional(),
      utm_content: z.string().max(120).optional(),
    })
    .optional()
    .default({}),
  // Spam defenses (honeypot + optional Turnstile / hCaptcha token)
  website_url: z.string().max(200).optional().default(""),
  captchaToken: z.string().max(4096).optional().default(""),
});

export type LeadSubmission = z.infer<typeof LeadSubmissionSchema>;

export interface StoredLead extends LeadSubmission {
  id: string;
  receivedAt: string;
  adaptersDispatched: string[];
}

export interface LeadAdapter {
  name: string;
  isConfigured: () => boolean;
  send: (lead: StoredLead) => Promise<void>;
}

/**
 * Verifies Cloudflare Turnstile or hCaptcha if server secrets are configured.
 * Gracefully passes in local preview mode when secrets are not set.
 */
export async function verifySpamToken(token: string): Promise<boolean> {
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!token) return false;
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstileSecret, response: token }),
    });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  }

  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
  if (hcaptchaSecret) {
    if (!token) return false;
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: hcaptchaSecret, response: token }),
    });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  }

  return true;
}

/** Adapter 1: HubSpot CRM Contacts API (configured via HUBSPOT_ACCESS_TOKEN) */
export const HubSpotAdapter: LeadAdapter = {
  name: "hubspot",
  isConfigured: () => Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
  async send(lead: StoredLead) {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) return;
    const [firstname, ...rest] = lead.name.split(/\s+/);
    const lastname = rest.join(" ") || "-";
    const properties: Record<string, string> = {
      email: lead.email,
      firstname,
      lastname,
      phone: lead.phone || "",
      company: lead.company || "",
      hs_lead_status: "NEW",
      message: JSON.stringify({
        formType: lead.formType,
        audience: lead.audience,
        projectZip: lead.projectZip,
        projectType: lead.projectType,
        collectionPref: lead.collectionPref,
        finishPref: lead.finishPref,
        configuratorState: lead.configuratorState,
        files: lead.files,
        utm: lead.utm,
        sourcePage: lead.sourcePage,
        usedConfigurator: lead.usedConfigurator,
        notes: lead.notes,
      }),
    };
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`HubSpot error ${res.status}`);
    }
  },
};

/** Adapter 2: Resend Email Inbox Forwarding (configured via RESEND_API_KEY + LEAD_INBOX_EMAIL) */
export const ResendEmailAdapter: LeadAdapter = {
  name: "resend-email",
  isConfigured: () =>
    Boolean(process.env.RESEND_API_KEY && process.env.LEAD_INBOX_EMAIL),
  async send(lead: StoredLead) {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.LEAD_INBOX_EMAIL;
    const from = process.env.LEAD_FROM_EMAIL || "leads@dfw-preview.local";
    if (!apiKey || !to) return;

    const subject = `[DFW Lead · ${lead.formType}] ${lead.name}${lead.company ? ` (${lead.company})` : ""}`;
    const text = [
      `Lead ID: ${lead.id}`,
      `Form: ${lead.formType}`,
      `Audience: ${lead.audience}`,
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || "-"}`,
      `Company: ${lead.company || "-"}`,
      `Project ZIP: ${lead.projectZip || "-"}`,
      `Project Type: ${lead.projectType || "-"}`,
      `Used Configurator: ${lead.usedConfigurator ? "Yes" : "No"}`,
      `Configurator: ${lead.configuratorState ? JSON.stringify(lead.configuratorState) : "-"}`,
      `Uploaded Files: ${lead.files.map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(", ") || "-"}`,
      `Source Page: ${lead.sourcePage}`,
      `UTM: ${JSON.stringify(lead.utm)}`,
      `Notes: ${lead.notes || "-"}`,
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
      throw new Error(`Resend error ${res.status}`);
    }
  },
};

/** Adapter 3: Local Persistent NDJSON Inbox (always active for preview / audit / local inbox verification) */
export const LocalInboxAdapter: LeadAdapter = {
  name: "local-inbox",
  isConfigured: () => true,
  async send(lead: StoredLead) {
    const dir = path.join(process.cwd(), ".leads");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, "inbox.ndjson");
    await fs.appendFile(file, `${JSON.stringify(lead)}\n`, "utf8");
  },
};

const ALL_ADAPTERS: LeadAdapter[] = [
  LocalInboxAdapter,
  HubSpotAdapter,
  ResendEmailAdapter,
];

export async function dispatchLead(input: LeadSubmission): Promise<StoredLead> {
  const lead: StoredLead = {
    ...input,
    id: `LD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    receivedAt: new Date().toISOString(),
    adaptersDispatched: [],
  };

  for (const adapter of ALL_ADAPTERS) {
    if (!adapter.isConfigured()) continue;
    try {
      await adapter.send(lead);
      lead.adaptersDispatched.push(adapter.name);
    } catch (err) {
      console.error(`[LeadAdapter:${adapter.name}] failed:`, err);
    }
  }
  return lead;
}
