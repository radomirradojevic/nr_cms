import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider } from "@/components/i18n-provider";
import { CmsFormField } from "@/components/cms-form-field";
import { CmsFormRenderer } from "@/components/cms-form-renderer";
import {
  getPublicFormValidationError,
  PUBLIC_FORM_VALIDATION_ERRORS,
} from "@/lib/form-validation";
import { getPublicMessageText, publicMessage } from "@/lib/i18n/public-message";
import { en } from "@/lib/i18n/messages/en";
import { createTranslator } from "@/lib/i18n/translate";
import type { Messages } from "@/lib/i18n/types";
import type { FormDetail, FormFieldRow } from "@/lib/form-types";
import {
  PUBLIC_COMMENT_MAX_LENGTH,
  validatePublicCommentInput,
} from "@/lib/public-comment-validation";

const now = new Date("2026-01-01T00:00:00.000Z");

function withI18n(child: ReactNode, messages: Messages = en) {
  return createElement(
    I18nProvider,
    { language: "en", direction: "ltr", messages },
    child,
  );
}

function field(partial: Partial<FormFieldRow>): FormFieldRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    formId: "22222222-2222-4222-8222-222222222222",
    fieldKey: "name",
    fieldType: "text",
    label: "Authored name label",
    placeholder: "Authored placeholder",
    helpText: "Authored help text",
    required: true,
    position: 0,
    options: null,
    validation: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  } as FormFieldRow;
}

function formDetail(fields: FormFieldRow[]): FormDetail {
  return {
    form: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Authored form name",
      slug: "authored-form",
      description: null,
      status: "published",
      submitLabel: "Authored submit label",
      successMessage: "Authored success message",
      createdBy: "user_1",
      updatedBy: "user_1",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
    fields,
    settings: {
      formId: "22222222-2222-4222-8222-222222222222",
      enableEmailNotifications: false,
      notificationRecipients: [],
      notificationSubject: "New submission for {{form_name}}",
      replyToField: null,
      emailTemplate: "",
      redirectUrl: null,
      enableTurnstile: false,
      createdAt: now,
      updatedAt: now,
    },
  } as FormDetail;
}

test("public form validation returns stable codes with English fallback", () => {
  assert.equal(
    PUBLIC_FORM_VALIDATION_ERRORS.requiredField.code,
    "public.forms.errors.requiredField",
  );
  assert.equal(
    PUBLIC_FORM_VALIDATION_ERRORS.requiredField.message,
    "This field is required.",
  );
  assert.deepEqual(
    getPublicFormValidationError("Required"),
    PUBLIC_FORM_VALIDATION_ERRORS.requiredField,
  );
});

test("public message helper translates coded errors and preserves legacy strings", () => {
  const messages = {
    public: {
      forms: {
        errors: {
          requiredField: "Pflichtfeld.",
        },
      },
    },
  } as const satisfies Messages;
  const t = createTranslator(messages, en, "de");

  assert.equal(
    getPublicMessageText(
      publicMessage(
        "public.forms.errors.requiredField",
        "This field is required.",
      ),
      t,
    ),
    "Pflichtfeld.",
  );
  assert.equal(getPublicMessageText("Legacy error.", t), "Legacy error.");
});

test("public form field keeps authored label, placeholder, and help text", () => {
  const html = renderToStaticMarkup(
    withI18n(
      createElement(CmsFormField, {
        field: field({}),
        value: "",
        onChange: () => undefined,
      }),
    ),
  );

  assert.match(html, /Authored name label/);
  assert.match(html, /Authored placeholder/);
  assert.match(html, /Authored help text/);
});

test("public form renderer keeps authored submit label", () => {
  const html = renderToStaticMarkup(
    withI18n(
      createElement(CmsFormRenderer, {
        form: formDetail([field({ helpText: null })]),
      }),
    ),
  );

  assert.match(html, /Authored submit label/);
  assert.doesNotMatch(html, />Submit</);
});

test("public comment validation returns stable codes with fallback messages", () => {
  const empty = validatePublicCommentInput({
    body: "",
    isSignedIn: true,
  });
  const tooLong = validatePublicCommentInput({
    body: "x".repeat(PUBLIC_COMMENT_MAX_LENGTH + 1),
    isSignedIn: true,
  });

  assert.equal(empty?.code, "public.comments.errors.required");
  assert.equal(empty?.message, "Comment cannot be empty.");
  assert.equal(tooLong?.code, "public.comments.errors.tooLong");
  assert.deepEqual(tooLong?.values, { max: PUBLIC_COMMENT_MAX_LENGTH });
});

test("search result plural remains frontend-language aware", () => {
  const t = createTranslator(en, en, "en");

  assert.equal(t.plural("search.results", 1, { count: 1 }), "1 result");
  assert.equal(t.plural("search.results", 2, { count: 2 }), "2 results");
});
