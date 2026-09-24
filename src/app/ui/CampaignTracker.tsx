"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "entreluar_session_id";
const ATTRIBUTION_KEY = "entreluar_attribution";
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

export function getCampaignContext() {
  if (typeof window === "undefined") return {};
  return {
    sessionId: getSessionId(),
    path: `${window.location.pathname}${window.location.search}`,
    source: "site",
    ...readAttribution(),
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
