/** Load Plausible when VITE_PLAUSIBLE_DOMAIN is set at build time. */
export function initPlausible(): void {
  if (typeof document === "undefined") return;

  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
  if (!domain) return;

  if (document.querySelector('script[data-plausible-init="true"]')) return;

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = domain;
  script.dataset.plausibleInit = "true";
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}
