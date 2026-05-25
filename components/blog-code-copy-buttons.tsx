"use client";

import { useEffect } from "react";

type Props = {
  scopeId: string;
};

const COPY_BUTTON_SELECTOR = "[data-code-copy-button]";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function BlogCodeCopyButtons({ scopeId }: Props) {
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(
      `[data-blog-content-root="${scopeId}"]`,
    );
    if (!scope) return;

    const timers: number[] = [];
    const buttons: HTMLButtonElement[] = [];

    scope.querySelectorAll<HTMLElement>("pre.cms-code-block").forEach((pre) => {
      if (pre.querySelector(COPY_BUTTON_SELECTOR)) return;

      const code = pre.querySelector("code");
      if (!code) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "cms-code-copy-button";
      button.dataset.codeCopyButton = "true";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");

      button.addEventListener("click", async () => {
        try {
          await copyText(code.textContent ?? "");
          button.textContent = "Copied";

          const timer = window.setTimeout(() => {
            button.textContent = "Copy";
          }, 1600);
          timers.push(timer);
        } catch {
          button.textContent = "Copy failed";

          const timer = window.setTimeout(() => {
            button.textContent = "Copy";
          }, 1600);
          timers.push(timer);
        }
      });

      pre.append(button);
      buttons.push(button);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      buttons.forEach((button) => button.remove());
    };
  }, [scopeId]);

  return null;
}
