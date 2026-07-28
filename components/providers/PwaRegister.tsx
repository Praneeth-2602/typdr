"use client";

import { useEffect } from "react";

/** Registers the service worker once on the client. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline registration failures are non-fatal
    });
  }, []);

  return null;
}
