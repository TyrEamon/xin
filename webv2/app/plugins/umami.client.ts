import { defineNuxtPlugin, useRuntimeConfig } from "#app";

export default defineNuxtPlugin(() => {
  if (!import.meta.client) {
    return;
  }

  const cfg = useRuntimeConfig();
  const host = String(cfg.public.umamiHost || "").trim().replace(/\/$/, "");
  const websiteId = String(cfg.public.umamiWebsiteId || "").trim();
  if (!host || !websiteId) {
    return;
  }

  if (document.querySelector("script[data-umami-loader='1']")) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${host}/script.js`;
  script.setAttribute("data-website-id", websiteId);
  script.setAttribute("data-umami-loader", "1");
  document.head.appendChild(script);
});
