import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBuilderDataFromAiPagePlan,
  parseAiPagePlanOutput,
  type AiPagePlan,
} from "@/app/dashboard/content/_builder/ai-page-plan";
import { ROOT_NODE_ID } from "@/app/dashboard/content/_builder/types";

test("parses fenced AI JSON and builds a valid Craft tree", () => {
  const parsed = parseAiPagePlanOutput(`\`\`\`json
{
  "blocks": [
    {
      "block": "Hero",
      "title": "DevOps without deployment drama",
      "subtitle": "We help teams ship faster with stable infrastructure.",
      "variant": "contrast"
    },
    {
      "block": "Section",
      "variant": "muted",
      "children": [
        { "block": "Heading", "level": "2", "text": "Services" },
        {
          "block": "Layout",
          "preset": "3-col",
          "columns": [
            [{ "block": "Text", "text": "CI/CD pipelines" }],
            [{ "block": "Text", "text": "Cloud automation" }],
            [{ "block": "Button", "label": "Talk to us", "href": "#contact" }]
          ]
        }
      ]
    }
  ],
  "seo": {
    "metaTitle": "DevOps Consulting",
    "metaDescription": "DevOps consulting for reliable cloud delivery."
  }
}
\`\`\``);

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const builderData = buildBuilderDataFromAiPagePlan(parsed.plan);
  const root = builderData.nodes[ROOT_NODE_ID];
  assert.equal(builderData.version, 1);
  assert.equal(resolvedName(root.type), "Root");
  assert.equal(root.nodes.length, 2);

  const section = builderData.nodes[root.nodes[1]];
  assert.equal(resolvedName(section.type), "Section");
  assert.equal(typeof section.linkedNodes.content, "string");

  const sectionSlot = builderData.nodes[section.linkedNodes.content];
  assert.equal(resolvedName(sectionSlot.type), "SectionSlot");
  assert.equal(sectionSlot.parent, root.nodes[1]);

  const layoutId = sectionSlot.nodes.find(
    (nodeId) => resolvedName(builderData.nodes[nodeId]?.type) === "Layout",
  );
  assert.ok(layoutId);
  const layout = builderData.nodes[layoutId];
  assert.equal(layout.props.preset, "3-col");
  assert.deepEqual(Object.keys(layout.linkedNodes), [
    "slot-1",
    "slot-2",
    "slot-3",
  ]);
});

test("rejects unsafe block names before conversion", () => {
  const parsed = parseAiPagePlanOutput(
    JSON.stringify({
      blocks: [{ block: "RawHtml", html: "<script>alert(1)</script>" }],
    }),
  );

  assert.equal(parsed.ok, false);
});

test("sanitizes generated links and media sources", () => {
  const plan: AiPagePlan = {
    blocks: [
      { block: "Button", label: "Bad link", href: "javascript:alert(1)" },
      { block: "Image", alt: "Bad image", src: "javascript:alert(1)" },
    ],
  };

  const builderData = buildBuilderDataFromAiPagePlan(plan);
  const [buttonId, imageId] = builderData.nodes[ROOT_NODE_ID].nodes;

  assert.equal(builderData.nodes[buttonId].props.href, "#");
  assert.equal(builderData.nodes[imageId].props.src, "");
});

function resolvedName(type: { resolvedName: string } | string | undefined) {
  return typeof type === "string" ? type : type?.resolvedName;
}
