# Phase 05 - Public system messages i18n

## Goal

Migrate public-facing system messages to frontend-language translations.

This phase covers UI shown to site visitors that is not user-authored content:

- public forms runtime messages;
- comments system messages;
- search page and search widget messages not completed in Phase 03;
- unauthorized/restricted/unpublished states;
- upload/captcha/client-validation messages;
- public API responses where the response is intended for direct UI display.

## Non-goals

- Do not translate page/blog content.
- Do not translate form field labels/options/help text entered by admins.
- Do not translate menu item labels entered by admins.
- Do not translate file metadata entered by admins.
- Do not build multilingual content variants.
- Do not translate master license-server internals.

## Existing files to inspect first

Public forms:

- `components/cms-form-renderer.tsx`
- `components/cms-form-field.tsx`
- `components/contact-form.tsx`
- `app/api/forms/[id]/submit/route.ts`
- `app/api/forms/[id]/upload/route.ts`
- `lib/form-validation.ts`
- `lib/form-upload-security.ts`
- `lib/form-types.ts`

Comments:

- `components/blog-comments.tsx`
- `components/blog-comment-form.tsx`
- `components/blog-comment-thread.tsx`
- `app/dashboard/content/comment-actions.ts`
- `components/blog-post-template.tsx`

Public search and fallback:

- `components/site-search.tsx`
- `app/search/page.tsx`
- `components/content-unauthorized.tsx`
- `components/content-unpublished.tsx`
- `app/not-found.tsx`
- `app/page.tsx`

Other public renderers:

- `components/content-public-renderer.tsx`
- `components/page-template.tsx`
- `components/blog-category-template.tsx`
- `components/blog-post-template.tsx`
- `components/webshop-public-placeholder.tsx`

## Translation boundary

Translate CMS-owned public system text:

```text
This field is required.
Please fill in all required fields.
Please complete the captcha.
Please wait for file uploads to finish.
Upload failed.
Submitting...
Select date
Clear
Uploaded: {fileName}
No results found.
Read more
Access restricted
This content is not published yet
```

Do not translate user-authored public text:

```text
form.form.submitLabel
form.form.successMessage
field.label
field.placeholder
field.helpText
choice.label
content.title
content.excerpt
content.body
menu item label
footer custom HTML
```

## Public forms client migration

In `components/cms-form-renderer.tsx`:

1. Use `useI18n()`.
2. Replace hardcoded error strings with `t(...)`:

```text
public.forms.errors.captchaNotConfigured
public.forms.errors.completeCaptchaBeforeUpload
public.forms.errors.uploadFailed
public.forms.errors.requiredField
public.forms.errors.fillRequiredFields
public.forms.errors.completeCaptcha
public.forms.errors.waitForUploads
public.forms.errors.submissionFailed
public.forms.states.submitting
```

3. Keep `form.form.submitLabel` as authored content.
4. Keep `form.form.successMessage` as authored content.
5. If server returns a translatable error code, translate it. If server returns
   legacy string, display it as fallback.

In `components/cms-form-field.tsx`:

1. Translate fallback placeholder only:

```text
public.forms.fields.selectDate
public.forms.fields.selectOption
public.forms.fields.clear
public.forms.fields.uploaded
```

2. Keep `field.placeholder` as authored content.
3. Keep `field.label`, `field.helpText`, and choice labels as authored content.
4. Use interpolation for uploaded file:

```text
Uploaded: {fileName}
```

## Public form API migration

In `app/api/forms/[id]/submit/route.ts` and upload route:

1. Prefer response shape:

```ts
{
  error: {
    code: "public.forms.errors.fixHighlightedFields",
    message: "Please fix the highlighted fields.",
    values?: {}
  },
  fieldErrors?: Record<string, {
    code: TranslationKey;
    message: string;
    values?: Record<string, string | number>;
  }>
}
```

2. Keep `message` as English fallback for clients not migrated.
3. Client uses `code` when present.
4. For field errors, do not use field label in translation key. Use the field
   key only as the map key.
5. Turnstile and upload security errors should use stable codes where possible.

Avoid translating server logs.

## Comments migration

Migrate public comment UI:

- empty states;
- form labels that are CMS-owned;
- captcha messages;
- moderation notices;
- submit button states;
- reply/cancel labels;
- validation messages;
- "comments disabled" states.

Potential keys:

```text
public.comments.title
public.comments.empty
public.comments.reply
public.comments.cancelReply
public.comments.submit
public.comments.submitting
public.comments.nameLabel
public.comments.namePlaceholder
public.comments.commentLabel
public.comments.commentPlaceholder
public.comments.awaitingModeration
public.comments.errors.required
public.comments.errors.tooLong
public.comments.errors.signInRequired
public.comments.errors.captchaFailed
public.comments.errors.disabled
```

If a blog comment contains user-entered text, never pass it through
translation.

## Search page completion

If Phase 03 did not fully migrate search, finish:

- metadata title if possible;
- page heading;
- count text with plural helper;
- empty state;
- type labels;
- "Read more".

Do not translate query, result title, or snippet.

## Public fallback completion

Ensure these use frontend translations:

- `ContentUnauthorized`;
- `ContentUnpublished`;
- `app/not-found.tsx`;
- `app/page.tsx` fallback;
- `components/webshop-public-placeholder.tsx`.

## Metadata

Where Next metadata uses system strings:

```ts
export const metadata = { title: "Search" };
```

Switch to `generateMetadata` when needed:

```ts
export async function generateMetadata() {
  const t = await getTranslations("frontend");
  return { title: t("search.title") };
}
```

Remember Next.js 16 rule: `params` and `searchParams` are Promises in pages,
layouts, and route handlers. Await them.

## Validation messages

`lib/form-validation.ts` currently has generic messages such as `Required`.

Refactor public validation helpers to return codes:

```ts
type ValidationError = {
  code: TranslationKey;
  message: string;
  values?: Record<string, string | number>;
};
```

Keep English fallback message until all callers are migrated.

## Tests

Add or update tests for:

- public form required validation returns code and English fallback;
- client helper translates coded errors;
- field label remains authored text;
- submit label and success message remain authored text;
- comments validation errors return stable codes;
- search plural helper renders correct English.

Use pure helper tests where component tests are heavy.

## Manual QA

1. Create a form with custom field label in a non-English language.
2. Set frontend language to a pseudo/test language or change one dictionary key.
3. Submit empty form.
4. Confirm required errors translate.
5. Confirm field label remains the authored label.
6. Upload invalid file.
7. Confirm upload system error translates.
8. Open search page.
9. Confirm search system labels translate and result titles do not.
10. Open restricted/unpublished content states and confirm they use frontend
    language.

## Acceptance criteria

- Public system messages use frontend language.
- Public authored content remains unchanged.
- Form runtime validation is code-capable with English fallback.
- Comments runtime validation is code-capable with English fallback.
- Search and fallback pages use frontend i18n.
- Typecheck passes.
- Existing tests pass.

