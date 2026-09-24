"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "entreluar_session_id";
const ATTRIBUTION_KEY = "entreluar_attribution";
const TRAFFIC_SOURCE_KEY = "entreluar_traffic_source";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

type Attribution = Partial<Record<(typeof UTM_KEYS)[number], string>>;

function getSessionId() {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return "";
  }
}

function readAttribution() {
  const params = new URLSearchParams(window.location.search);
  const next = UTM_KEYS.reduce<Attribution>((values, key) => {
    const value = params.get(key)?.trim();
    if (value) values[key] = value.slice(0, 120);
    return values;
  }, {});

  try {
    if (Object.keys(next).length) {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
      return next;
    }
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    return stored ? JSON.parse(stored) as Attribution : {};
  } catch {
    return next;
  }
}

function detectTrafficSource(attribution: Attribution) {
  const referrer = document.referrer.toLowerCase();
  const source = attribution.utm_source?.toLowerCase() || "";
  const values = `${source} ${referrer}`;
  if (values.includes("instagram") || values.includes("l.instagram.com")) return "instagram";
  if (values.includes("facebook") || values.includes("fb.com") || values.includes("l.facebook.com")) return "facebook";
  if (!source && !referrer) return "direct";
  return "internet";
}

function getTrafficSource(attribution: Attribution) {
  try {
    const detected = detectTrafficSource(attribution);
    const stored = sessionStorage.getItem(TRAFFIC_SOURCE_KEY);
    if (detected !== "direct" || !stored) {
      sessionStorage.setItem(TRAFFIC_SOURCE_KEY, detected);
      return detected;
    }
    return stored;
  } catch {
    return detectTrafficSource(attribution);
  }
}

export function getCampaignContext() {
  if (typeof window === "undefined") return {};
  const attribution = readAttribution();
  return {
    sessionId: getSessionId(),
    path: `${window.location.pathname}${window.location.search}`,
    source: getTrafficSource(attribution),
    ...attribution,
  };
}

export default function CampaignTracker() {
  const pathname = usePathname();
  const lastTracked = useRef("");

  useEffect(() => {
    const path = `${window.location.pathname}${window.location.search}`;
    if (lastTracked.current === path) return;
    lastTracked.current = path;

    const payload = {
      ...getCampaignContext(),
      path,
      title: document.title,
      referrer: document.referrer,
      deviceType: window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop",
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
