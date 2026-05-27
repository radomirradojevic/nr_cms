import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ButtonStatic,
  ImageStatic,
} from "@/app/dashboard/content/_builder/blocks/static";
import { buildResponsiveCss } from "@/app/dashboard/content/_builder/blocks/style/serialize";
import { resolveVideoEmbed } from "@/app/dashboard/content/_editors/video-shared";
import { sanitizeCmsHtml, sanitizeTiptapHtml } from "@/lib/content-sanitizer";
import {
  buildFormUploadOwner,
  isFormUploadOwner,
  legacyFormUploadOwner,
} from "@/lib/form-upload-security";
import { sanitizeHref, sanitizeMediaSrc } from "@/lib/url-safety";

test("URL safety helpers reject executable protocols", () => {
  assert.equal(sanitizeHref("javascript:alert(1)"), "#");
  assert.equal(sanitizeHref("data:text/html,<script>alert(1)</script>"), "#");
  assert.equal(sanitizeHref("/safe/path"), "/safe/path");
  assert.equal(
    sanitizeHref("https://example.com/page"),
    "https://example.com/page",
  );

  assert.equal(sanitizeMediaSrc("javascript:alert(1)"), "");
  assert.equal(sanitizeMediaSrc("//evil.example/image.png"), "");
  assert.equal(
    sanitizeMediaSrc("/api/files/11111111-1111-4111-8111-111111111111"),
    "/api/files/11111111-1111-4111-8111-111111111111",
  );
});

test("builder static renderers neutralize unsafe URLs", () => {
  const button = renderToStaticMarkup(
    createElement(ButtonStatic, {
      label: "Click",
      href: "javascript:alert(1)",
    }),
  );
  assert.match(button, /href="#"/);
  assert.doesNotMatch(button, /javascript:/i);

  const image = renderToStaticMarkup(
    createElement(ImageStatic, {
      src: "javascript:alert(1)",
      alt: "bad",
      sizing: "responsive",
      width: "",
      height: "",
    }),
  );
  assert.doesNotMatch(image, /<img/i);
  assert.doesNotMatch(image, /javascript:/i);
});

test("builder responsive CSS cannot break out of style tags", () => {
  const css = buildResponsiveCss(
    {
      responsive: {
        tablet: {
          typography: {
            fontSize: "16px;}</style><script>alert(1)</script><style>",
          },
          background: {
            image: 'x");}</style><script>alert(1)</script><style>',
          },
        },
      },
    } as never,
    "scope",
  );

  const cssText = css ?? "";
  assert.equal(cssText.includes("<script"), false);
  assert.equal(cssText.includes("</style"), false);
  assert.equal(cssText.includes("font-size"), false);
  assert.equal(cssText.includes("background-image"), false);

  const safeCss = buildResponsiveCss(
    {
      responsive: {
        tablet: {
          background: {
            image: "/api/files/11111111-1111-4111-8111-111111111111",
          },
        },
      },
    } as never,
    "scope",
  );
  assert.match(safeCss ?? "", /background-image: url\("\/api\/files\//);
});

test("video embeds only keep supported safe sources", () => {
  assert.equal(
    resolveVideoEmbed({ provider: "youtube", src: "javascript:alert(1)" }).src,
    "",
  );
  assert.equal(
    resolveVideoEmbed({ provider: "file", src: "javascript:alert(1)" }).src,
    "",
  );
  assert.equal(
    resolveVideoEmbed({
      provider: "youtube",
      src: "https://youtu.be/abc123_DEF",
    }).src,
    "https://www.youtube.com/embed/abc123_DEF",
  );
});

test("CMS sanitizers strip executable URLs without dropping ordinary markup", () => {
  const html = sanitizeCmsHtml(
    '<p class="lead">Hello</p><a href="javascript:alert(1)">bad</a><img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+" alt="bad"><svg viewBox="0 0 10 10"><a href="data:text/html,evil"><path d="M0 0h10v10z"></path></a></svg>',
  );

  assert.match(html, /class="lead"/);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /data:image\/svg/i);
  assert.doesNotMatch(html, /data:text\/html/i);

  const tiptap = sanitizeTiptapHtml(
    '<img src="data:text/html,<script>alert(1)</script>"><a href="tel:+15550100">call</a>',
  );
  assert.doesNotMatch(tiptap, /data:text\/html/i);
  assert.match(tiptap, /href="tel:\+15550100"/);
});

test("CMS sanitizer keeps safe decorative RawHtml image styles", () => {
  const html = sanitizeCmsHtml(
    '<div style="width:min(400px, 100%); aspect-ratio: 1 / 1; border-radius: 50%; box-shadow: rgba(52, 154, 238, 0) 0px 0px 4px, rgba(52, 154, 238, 0.533) 0px 0px 12px 12px, rgba(52, 154, 238, 0.2) 0px 0px 64px 24px;"><img alt="Night Raven Logo" src="/_next/image?url=%2Fnr%2Fimages%2Flogo.png&amp;w=828&amp;q=75" style="color: transparent; border-radius: 50%; width: 100%; height: 100%; object-fit: cover;"></div>',
  );

  assert.match(html, /width:min\(400px, 100%\)/);
  assert.match(html, /aspect-ratio:1 \/ 1/);
  assert.match(html, /border-radius:50%/);
  assert.match(html, /box-shadow:rgba\(52, 154, 238, 0\) 0px 0px 4px/);
  assert.match(html, /object-fit:cover/);
  assert.match(html, /color:transparent/);

  const unsafe = sanitizeCmsHtml(
    '<div style="box-shadow: url(javascript:alert(1)) 0 0 1px; background: url(javascript:alert(1)); border: 1px solid red;"></div>',
  );
  assert.doesNotMatch(unsafe, /javascript/i);
  assert.doesNotMatch(unsafe, /box-shadow/i);
  assert.doesNotMatch(unsafe, /background:/i);
});

test("form upload owner helpers accept current and legacy rows only for their form", () => {
  const formId = "11111111-1111-4111-8111-111111111111";
  const otherFormId = "22222222-2222-4222-8222-222222222222";
  const current = buildFormUploadOwner(formId, "hash");
  const legacy = legacyFormUploadOwner(formId);

  assert.equal(isFormUploadOwner(current, formId), true);
  assert.equal(isFormUploadOwner(legacy, formId), true);
  assert.equal(isFormUploadOwner(current, otherFormId), false);
  assert.equal(isFormUploadOwner("user_123", formId), false);
});
