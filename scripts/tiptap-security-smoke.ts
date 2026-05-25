import assert from "node:assert/strict";
import { renderTiptapHtml } from "@/app/dashboard/content/_editors/render-tiptap-html";
import { sanitizeTiptapHtml } from "@/app/dashboard/content/_editors/sanitize-tiptap-html";

const codePayload = `<script>alert("xss")</script><img src=x onerror=alert(1)>`;
const codeHtml = renderTiptapHtml({
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language: "html" },
      content: [{ type: "text", text: codePayload }],
    },
  ],
});

assert.match(codeHtml, /&lt;[\s\S]*script/);
assert.doesNotMatch(codeHtml, /<script/i);
assert.doesNotMatch(codeHtml, /<img/i);

const linkHtml = renderTiptapHtml({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "bad link",
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
        },
      ],
    },
  ],
});

assert.doesNotMatch(linkHtml, /javascript:/i);

const languageHtml = renderTiptapHtml({
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language: `typescript" onclick="alert(1)` },
      content: [{ type: "text", text: "const ok = true;" }],
    },
  ],
});

assert.doesNotMatch(languageHtml, /onclick/i);
assert.doesNotMatch(languageHtml, /typescript&quot;/i);

const highlightedHtml = renderTiptapHtml({
  type: "doc",
  content: [
    {
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [{ type: "text", text: "const ok: boolean = true;" }],
    },
  ],
});

assert.match(highlightedHtml, /hljs-/);

const sanitizedFallback = sanitizeTiptapHtml(`
  <script>alert(1)</script>
  <img src=x onerror=alert(1)>
  <a href="javascript:alert(1)" onclick="alert(2)">link</a>
  <iframe srcdoc="<script>alert(3)</script>" src="https://evil.example/embed/x"></iframe>
`);

assert.doesNotMatch(sanitizedFallback, /<script/i);
assert.doesNotMatch(sanitizedFallback, /onerror|onclick|srcdoc|javascript:/i);
assert.doesNotMatch(sanitizedFallback, /<iframe/i);

const safeYouTube = sanitizeTiptapHtml(
  `<iframe src="https://www.youtube.com/embed/abc123" data-video-provider="youtube"></iframe>`,
);

assert.match(safeYouTube, /youtube\.com\/embed\/abc123/);
assert.match(safeYouTube, /data-video-provider="youtube"/);
assert.match(safeYouTube, /allowfullscreen="true"/);

const videoHtml = renderTiptapHtml({
  type: "doc",
  content: [
    {
      type: "video",
      attrs: {
        provider: "youtube",
        src: "https://www.youtube.com/embed/abc123",
        width: "100%",
        alignment: "center",
      },
    },
    {
      type: "video",
      attrs: {
        provider: "file",
        src: "/api/files/44444444-4444-4444-8444-444444444444",
        width: "100%",
        alignment: "center",
      },
    },
  ],
});

assert.match(videoHtml, /<iframe/);
assert.match(videoHtml, /src="https:\/\/www\.youtube\.com\/embed\/abc123"/);
assert.match(videoHtml, /allowfullscreen="true"/);
assert.match(videoHtml, /<video/);
assert.match(
  videoHtml,
  /src="\/api\/files\/44444444-4444-4444-8444-444444444444"/,
);
assert.match(videoHtml, /controls="true"/);

const embedsHtml = renderTiptapHtml({
  type: "doc",
  content: [
    {
      type: "gallery",
      attrs: {
        galleryId: "11111111-1111-4111-8111-111111111111",
        galleryName: "Gallery <script>bad</script>",
      },
    },
    {
      type: "cmsForm",
      attrs: {
        formId: "22222222-2222-4222-8222-222222222222",
        formName: "Form",
      },
    },
    {
      type: "cmsFormSubmissions",
      attrs: {
        formId: "33333333-3333-4333-8333-333333333333",
        formName: "Submissions",
        displayMode: "table",
        pageSize: 5,
        hideId: true,
        hideSubmitted: true,
      },
    },
  ],
});

assert.match(
  embedsHtml,
  /data-gallery-id="11111111-1111-4111-8111-111111111111"/,
);
assert.match(
  embedsHtml,
  /data-cms-form-id="22222222-2222-4222-8222-222222222222"/,
);
assert.match(
  embedsHtml,
  /data-cms-form-submissions-id="33333333-3333-4333-8333-333333333333"/,
);
assert.match(embedsHtml, /data-cms-form-submissions-hide-submitted="true"/);
assert.doesNotMatch(embedsHtml, /<script/i);

const unknownDataAttr = sanitizeTiptapHtml(
  `<div data-gallery-id="11111111-1111-4111-8111-111111111111" data-evil="x"></div>`,
);

assert.match(unknownDataAttr, /data-gallery-id=/);
assert.doesNotMatch(unknownDataAttr, /data-evil=/);

console.log("TipTap security smoke checks passed");
