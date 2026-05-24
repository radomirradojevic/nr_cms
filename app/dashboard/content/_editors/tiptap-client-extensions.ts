"use client";

import { ReactNodeViewRenderer } from "@tiptap/react";

import { tiptapExtensions } from "./tiptap-extensions";
import { GalleryNode } from "./gallery-extension";
import { CmsFormNode } from "./form-extension";
import { CmsFormSubmissionsNode } from "./form-submissions-extension";
import {
  CmsFormPreviewNodeView,
  FormSubmissionsPreviewNodeView,
  GalleryPreviewNodeView,
} from "./embed-preview-components";

const GalleryPreviewNode = GalleryNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(GalleryPreviewNodeView);
  },
});

const CmsFormPreviewNode = CmsFormNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CmsFormPreviewNodeView);
  },
});

const CmsFormSubmissionsPreviewNode = CmsFormSubmissionsNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(FormSubmissionsPreviewNodeView);
  },
});

export const tiptapClientExtensions = tiptapExtensions.map((extension) => {
  if (extension.name === GalleryNode.name) return GalleryPreviewNode;
  if (extension.name === CmsFormNode.name) return CmsFormPreviewNode;
  if (extension.name === CmsFormSubmissionsNode.name) {
    return CmsFormSubmissionsPreviewNode;
  }
  return extension;
});
