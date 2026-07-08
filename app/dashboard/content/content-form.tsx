"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarIcon,
  Clock,
  Eye,
  FolderTree,
  History as HistoryIcon,
  ImageIcon,
  Loader2,
  MessageSquare,
  Rocket,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { HelpInfo } from "@/components/ui/help-info";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, slugify } from "@/lib/utils";
import { getRoleLabelKey, hasRole, type Role } from "@/lib/roles";
import {
  CONTENT_CREATE_STATUSES,
  CONTENT_STATUSES,
  getContentStatusLabelKey,
  type ContentStatus,
} from "@/lib/content-status";
import {
  DEFAULT_VISIBILITY,
  VISIBILITY_ROLES,
  type ContentVisibility,
  type VisibilityRole,
} from "@/lib/content-visibility";
import dynamic from "next/dynamic";
import { BlogEditor } from "./_editors/blog-editor";
import { HeroSliderEditor } from "./_hero-slider/hero-slider-editor";
import { ImageInsertDialog } from "./_editors/image-insert-dialog";
import { emptyTiptapJson } from "./_editors/tiptap-extensions";
import {
  ROOT_NODE_ID,
  emptyBuilderData,
  isBuilderData,
  type BuilderData,
} from "./_builder/types";
import type {
  PageEditorSettingsPanels,
  PageEditorSettingsTab,
} from "./_builder/page-editor";
import {
  createDefaultHeroSlider,
  heroSliderToPlainText,
} from "@/lib/hero-slider";
import {
  getContentTypeDescriptionKey,
  getContentTypeLabelKey,
  type ContentType,
} from "@/lib/content-types";

// PageEditor is heavy and uses Craft.js + CodeMirror — load client-only.
const PageEditor = dynamic(
  () => import("./_builder/page-editor").then((m) => m.PageEditor),
  {
    ssr: false,
    loading: () => <div className="h-[600px] rounded-md border bg-muted/20" />,
  },
);
import {
  createContent,
  updateContent,
  type CreateContentInput,
  type UpdateContentInput,
} from "./actions";
import {
  ContentHistoryPanel,
  type ContentHistoryRevision,
} from "./content-history-panel";
import type { AppearanceSettings } from "@/lib/appearance";
import {
  AI_PROVIDER_DEFAULT_MODELS,
  AI_PROVIDER_LABELS,
  type AIProviderId,
  type AiProviderOption,
  type SessionSecuritySettings,
} from "@/lib/global-settings";
import {
  buildAiCostConfirmationMessage,
  getAiProviderModelCostWarning,
} from "@/lib/ai-model-cost-warnings";
import { useContentEditLockOptional } from "@/components/content-edit-lock-provider";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import {
  dateTimeLocalInputToUtc,
  formatDateTimeLocalInputValue,
} from "@/lib/regional-settings";
import type { TranslateFn } from "@/lib/i18n/translate";

export type ContentFormCategory = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  contentType: ContentType;
  categories: ContentFormCategory[];
  currentUserRoles: Role[];
  /** Appearance settings used by the page-builder preview. Defaults if omitted. */
  appearance?: AppearanceSettings;
  sessionSecurity: SessionSecuritySettings;
  aiWritingAssistantAvailable?: boolean;
  aiWritingAssistantProviders?: AiProviderOption[];
  aiWritingAssistantDefaultProvider?: AIProviderId;
  initialInspectorTab?: string;
  history?: {
    revisions: ContentHistoryRevision[];
    total: number;
    enabled: boolean;
  };
  initial?: {
    id: string;
    title: string;
    slug: string;
    categoryId: string;
    metaTitle: string | null;
    metaDescription: string | null;
    excerpt: string | null;
    coverImage: string | null;
    status: ContentStatus;
    homepage: boolean;
    enableComments: boolean;
    autoPublishComments: boolean;
    allowAnonymousComments: boolean;
    visibility: ContentVisibility;
    contentJson: unknown;
    publishAt: string | Date | null;
    unpublishAt: string | Date | null;
  };
};

type AiGeneratedField = "excerpt" | "metaTitle" | "metaDescription";
type AiAssistantSurface = "blogEditor" | "pageBuilder";
type InspectorTab = PageEditorSettingsTab | "comments";
const emptyWebshopContent = { version: 1 };

function InlineHelpLabel({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm" htmlFor={htmlFor}>
        {label}
      </Label>
      <HelpInfo title={label}>{children}</HelpInfo>
    </div>
  );
}

export function ContentForm({
  mode,
  contentType,
  categories,
  currentUserRoles,
  appearance,
  sessionSecurity,
  aiWritingAssistantAvailable = false,
  aiWritingAssistantProviders,
  aiWritingAssistantDefaultProvider,
  initialInspectorTab,
  history,
  initial,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const { timezone } = useRegionalSettings();
  const [pending, startTransition] = useTransition();
  const saveInFlightRef = useRef(false);
  const publishAtInputRef = useRef<HTMLInputElement>(null);
  const unpublishAtInputRef = useRef<HTMLInputElement>(null);
  const [saveInFlight, setSaveInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [staleVersion, setStaleVersion] = useState<number | null>(null);
  const [showFloatingSave, setShowFloatingSave] = useState(false);
  const lock = useContentEditLockOptional();
  const lockBlocksSave = mode === "edit" && lock !== null && !lock.isEditor;

  const isAdmin = hasRole(currentUserRoles, "admin");
  const isPublisher = hasRole(currentUserRoles, "publisher");
  const canChooseStatus = isAdmin || isPublisher;
  const hasHistoryPanel = mode === "edit" && Boolean(initial?.id);
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>(
    () =>
      normalizeInspectorTab({
        value: initialInspectorTab,
        contentType,
        hasHistory: hasHistoryPanel,
      }),
  );
  const aiProviderOptions = useMemo<AiProviderOption[]>(() => {
    if (aiWritingAssistantProviders !== undefined) {
      return aiWritingAssistantProviders;
    }

    return aiWritingAssistantAvailable
      ? [
          {
            id: "openai",
            label: AI_PROVIDER_LABELS.openai,
            defaultModel: AI_PROVIDER_DEFAULT_MODELS.openai,
            models: [
              {
                id: AI_PROVIDER_DEFAULT_MODELS.openai,
                label: AI_PROVIDER_DEFAULT_MODELS.openai,
              },
            ],
          },
        ]
      : [];
  }, [aiWritingAssistantAvailable, aiWritingAssistantProviders]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial?.metaDescription ?? "",
  );
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [status, setStatus] = useState<ContentStatus>(
    initial?.status ?? "draft",
  );
  const [publishAt, setPublishAt] = useState(() =>
    toDatetimeLocalValue(initial?.publishAt, timezone),
  );
  const [unpublishAt, setUnpublishAt] = useState(() =>
    toDatetimeLocalValue(initial?.unpublishAt, timezone),
  );
  const showDateTimePicker = useCallback((input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    input.focus();

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerInput.showPicker === "function") {
      try {
        pickerInput.showPicker();
      } catch {
        input.focus();
      }
    }
  }, []);
  const [aiProviderId, setAiProviderId] = useState<AIProviderId>(
    () =>
      aiWritingAssistantDefaultProvider ?? aiProviderOptions[0]?.id ?? "openai",
  );
  const effectiveAiProviderId = aiProviderOptions.some(
    (provider) => provider.id === aiProviderId,
  )
    ? aiProviderId
    : (aiProviderOptions[0]?.id ?? aiProviderId);
  const effectiveAiProvider = aiProviderOptions.find(
    (provider) => provider.id === effectiveAiProviderId,
  );
  const [aiModelId, setAiModelId] = useState<string>(() => {
    const provider =
      aiProviderOptions.find(
        (option) => option.id === aiWritingAssistantDefaultProvider,
      ) ?? aiProviderOptions[0];

    return provider?.defaultModel ?? provider?.models[0]?.id ?? "";
  });
  const effectiveAiModelId = effectiveAiProvider?.models.some(
    (model) => model.id === aiModelId,
  )
    ? aiModelId
    : (effectiveAiProvider?.defaultModel ??
      effectiveAiProvider?.models[0]?.id ??
      aiModelId);
  const [aiWritingAssistantActive, setAiWritingAssistantActive] =
    useState(false);
  const [aiGenerationField, setAiGenerationField] =
    useState<AiGeneratedField | null>(null);
  const [homepage, setHomepage] = useState(initial?.homepage ?? false);
  const [enableComments, setEnableComments] = useState(
    initial?.enableComments ?? false,
  );
  const [autoPublishComments, setAutoPublishComments] = useState(
    initial?.autoPublishComments ?? false,
  );
  const [allowAnonymousComments, setAllowAnonymousComments] = useState(
    initial?.allowAnonymousComments ?? false,
  );
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [visibilityPublic, setVisibilityPublic] = useState(
    initial?.visibility?.public ?? DEFAULT_VISIBILITY.public,
  );
  const [visibilityRoles, setVisibilityRoles] = useState<VisibilityRole[]>(
    initial?.visibility?.roles ?? [...DEFAULT_VISIBILITY.roles],
  );
  function toggleVisibilityRole(role: VisibilityRole, checked: boolean) {
    setVisibilityRoles((prev) =>
      checked
        ? Array.from(new Set([...prev, role]))
        : prev.filter((r) => r !== role),
    );
  }

  // Deep-clone initial.contentJson so we don't keep a reference to the
  // RSC-provided value. Otherwise round-tripping the same object back to a
  // server action turns it into a "temporary client reference" and reading
  // properties like `attrs.level` throws on the server.
  //
  // Held in a ref (not state) so that drag/drop and keystrokes inside the
  // editor never re-render this entire form. The PageEditor / BlogEditor
  // are uncontrolled and push their latest value via `registerGetValue`.
  const [editorDefaultValue] = useState<unknown>(() =>
    initial?.contentJson != null
      ? JSON.parse(JSON.stringify(initial.contentJson))
      : contentType === "page"
        ? emptyBuilderData
        : contentType === "hero_slider"
          ? createDefaultHeroSlider()
          : contentType === "webshop"
            ? emptyWebshopContent
            : emptyTiptapJson,
  );
  const contentJsonRef = useRef<unknown>(editorDefaultValue);
  const getEditorValueRef = useRef<(() => unknown) | null>(null);

  const getCurrentContentText = useCallback(() => {
    const latestContent = getEditorValueRef.current
      ? getEditorValueRef.current()
      : contentJsonRef.current;

    return (
      contentType === "page"
        ? builderDataToPlainText(latestContent)
        : contentType === "hero_slider"
          ? heroSliderToPlainText(latestContent)
          : contentType === "webshop"
            ? [title, excerpt].filter(Boolean).join("\n")
            : tiptapJsonToPlainText(latestContent)
    ).slice(0, 8_000);
  }, [contentType, excerpt, title]);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  const savedToastMessage = t("dashboard.content.form.saved", {
    type: t(getContentTypeLabelKey(contentType)),
  });
  const savePending = pending || saveInFlight;
  const primarySaveDisabled = savePending || lockBlocksSave;
  const primarySaveLabel =
    mode === "create"
      ? t("dashboard.content.form.create")
      : t("dashboard.content.form.save");
  const idleLogoutLabel = formatSessionMinutes(
    sessionSecurity.idleLogoutMinutes,
  );
  const maxSessionLabel = formatSessionMinutes(
    sessionSecurity.maxSessionDurationMinutes,
  );

  function confirmAiModelCost(
    providerId: AIProviderId,
    modelId: string,
    action: "enableAssistant" | "changeActiveModel",
  ) {
    const provider = aiProviderOptions.find(
      (option) => option.id === providerId,
    );
    const warning = getAiProviderModelCostWarning(providerId, modelId);
    if (!warning) return true;

    const providerLabel = provider?.label ?? AI_PROVIDER_LABELS[providerId];
    const modelLabel =
      provider?.models.find((model) => model.id === modelId)?.label ?? modelId;

    return window.confirm(
      buildAiCostConfirmationMessage({
        providerLabel,
        modelLabel,
        warning,
        action,
      }),
    );
  }

  function handleAiWritingAssistantActiveChange(active: boolean) {
    if (
      active &&
      effectiveAiModelId &&
      !confirmAiModelCost(
        effectiveAiProviderId,
        effectiveAiModelId,
        "enableAssistant",
      )
    ) {
      return;
    }

    setAiWritingAssistantActive(active);
  }

  function handleAiProviderIdChange(providerId: AIProviderId) {
    const provider = aiProviderOptions.find(
      (option) => option.id === providerId,
    );
    const nextModelId = provider?.defaultModel ?? provider?.models[0]?.id ?? "";
    if (
      aiWritingAssistantActive &&
      nextModelId &&
      !confirmAiModelCost(providerId, nextModelId, "changeActiveModel")
    ) {
      return;
    }

    setAiProviderId(providerId);
    setAiModelId(nextModelId);
  }

  function handleAiModelIdChange(modelId: string) {
    if (
      aiWritingAssistantActive &&
      !confirmAiModelCost(effectiveAiProviderId, modelId, "changeActiveModel")
    ) {
      return;
    }

    setAiModelId(modelId);
  }

  const updateInspectorTab = useCallback(
    (tab: InspectorTab) => {
      const nextTab = normalizeInspectorTab({
        value: tab,
        contentType,
        hasHistory: hasHistoryPanel,
      });

      setActiveInspectorTab(nextTab);
      persistInspectorTabInUrl(nextTab, contentType);
    },
    [contentType, hasHistoryPanel],
  );

  useEffect(() => {
    function updateFloatingSaveVisibility() {
      setShowFloatingSave(window.scrollY > 160);
    }

    updateFloatingSaveVisibility();
    window.addEventListener("scroll", updateFloatingSaveVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateFloatingSaveVisibility);
    };
  }, []);

  async function generateAiField(field: AiGeneratedField) {
    if (
      !aiWritingAssistantAvailable ||
      aiProviderOptions.length === 0 ||
      !effectiveAiModelId ||
      !aiWritingAssistantActive
    ) {
      return;
    }

    const context = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: getCurrentContentText().trim(),
    };
    const surface: AiAssistantSurface =
      contentType === "blog_post" ? "blogEditor" : "pageBuilder";
    const contextError = getAiFieldContextError(field, context, t, surface);
    if (contextError) {
      toast.error(contextError);
      return;
    }

    const currentValue =
      field === "excerpt"
        ? excerpt
        : field === "metaTitle"
          ? metaTitle
          : metaDescription;

    setAiGenerationField(field);
    try {
      const response = await fetch("/api/ai-writing-assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: effectiveAiProviderId,
          model: effectiveAiModelId,
          field,
          surface,
          title: context.title,
          excerpt: context.excerpt,
          content: context.content,
          currentValue,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        text?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : t("dashboard.content.form.aiGenerationFailed"),
        );
        return;
      }

      const text = typeof data?.text === "string" ? data.text.trim() : "";
      if (!text) {
        toast.error(t("dashboard.content.form.aiNoUsableText"));
        return;
      }

      if (field === "excerpt") {
        setExcerpt(text);
      } else if (field === "metaTitle") {
        setMetaTitle(text);
      } else {
        setMetaDescription(text);
      }

      toast.success(
        t("dashboard.content.form.generated", {
          field: getAiFieldLabel(field, t),
        }),
      );
    } catch {
      toast.error(t("dashboard.content.form.aiGenerationFailed"));
    } finally {
      setAiGenerationField(null);
    }
  }

  function submitPrimary() {
    if (mode === "create") {
      submit(true);
      return;
    }

    submit(false, true);
  }

  function failSave(message: string, showToast: boolean) {
    setError(message);
    if (showToast) toast.error(message);
  }

  async function openPreview() {
    if (mode !== "edit" || !initial?.id) {
      toast.error(t("dashboard.content.form.saveBeforePreview"));
      return;
    }

    setPreviewPending(true);
    try {
      const response = await fetch("/api/content-preview-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ contentId: initial.id }),
      });
      const data = (await response.json().catch(() => null)) as {
        previewUrl?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : t("dashboard.content.errors.previewLinkFailed"),
        );
        return;
      }

      const previewUrl =
        typeof data?.previewUrl === "string" ? data.previewUrl : "";
      if (!previewUrl) {
        toast.error(t("dashboard.content.errors.previewLinkFailed"));
        return;
      }

      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("dashboard.content.errors.previewLinkFailed"));
    } finally {
      setPreviewPending(false);
    }
  }

  function submit(
    shouldClose = true,
    showToast = false,
    statusOverride?: ContentStatus,
    scheduleOverride?: {
      publishAt?: string | null;
      unpublishAt?: string | null;
    },
  ) {
    if (saveInFlightRef.current || lockBlocksSave) return;

    setError(null);
    const effectiveStatus = statusOverride ?? status;
    const effectivePublishAt = scheduleOverride?.publishAt ?? publishAt;
    const effectiveUnpublishAt = scheduleOverride?.unpublishAt ?? unpublishAt;
    const effectivePublishAtIso = toIsoOrNull(effectivePublishAt, timezone);
    const effectiveUnpublishAtIso = toIsoOrNull(effectiveUnpublishAt, timezone);
    if (statusOverride) setStatus(statusOverride);
    if (scheduleOverride?.publishAt !== undefined) {
      setPublishAt(scheduleOverride.publishAt ?? "");
    }
    if (scheduleOverride?.unpublishAt !== undefined) {
      setUnpublishAt(scheduleOverride.unpublishAt ?? "");
    }
    if (!title.trim()) {
      return failSave(t("dashboard.content.form.titleRequired"), showToast);
    }
    if (!slug.trim()) {
      return failSave(t("dashboard.content.form.slugRequired"), showToast);
    }
    if (!categoryId) {
      return failSave(t("dashboard.content.form.categoryRequired"), showToast);
    }

    // Pull the freshest value directly from the editor (uncontrolled).
    // Falls back to the ref if the editor hasn't registered yet.
    const latestContent = getEditorValueRef.current
      ? getEditorValueRef.current()
      : contentJsonRef.current;

    const base = {
      categoryId,
      title: title.trim(),
      slug: slugify(slug),
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      excerpt: excerpt || null,
      coverImage: coverImage || null,
      // Always send a freshly-serialized plain object. Otherwise objects
      // that originated from a server component (or were produced by tiptap
      // paste handlers) can be tagged as "temporary client references" by
      // React Flight and crash with "Cannot access X on the server" when the
      // server action tries to read their attrs.
      contentJson: JSON.parse(JSON.stringify(latestContent ?? null)),
    };

    persistInspectorTabInUrl(activeInspectorTab, contentType);
    saveInFlightRef.current = true;
    setSaveInFlight(true);
    startTransition(async () => {
      try {
        if (mode === "create") {
          const input: CreateContentInput = {
            ...base,
            contentType,
            ...(canChooseStatus ? { status: effectiveStatus } : {}),
            ...(canChooseStatus
              ? {
                  publishAt: effectivePublishAtIso,
                  unpublishAt: effectiveUnpublishAtIso,
                }
              : {}),
            ...(isAdmin && contentType === "page" ? { homepage } : {}),
            visibility: { public: visibilityPublic, roles: visibilityRoles },
            ...(contentType === "blog_post"
              ? {
                  enableComments,
                  autoPublishComments,
                  allowAnonymousComments,
                }
              : {}),
          };
          const r = await createContent(input);
          if (r.error) failSave(r.error, showToast);
          else {
            if (showToast) toast.success(savedToastMessage);
            if (shouldClose) router.push("/dashboard/content");
          }
        } else {
          const input: UpdateContentInput = {
            ...base,
            id: initial!.id,
            ...(canChooseStatus || effectiveStatus !== initial!.status
              ? { status: effectiveStatus }
              : {}),
            ...(canChooseStatus
              ? {
                  publishAt: effectivePublishAtIso,
                  unpublishAt: effectiveUnpublishAtIso,
                }
              : {}),
            ...(isAdmin && contentType === "page" ? { homepage } : {}),
            visibility: { public: visibilityPublic, roles: visibilityRoles },
            ...(contentType === "blog_post"
              ? {
                  enableComments,
                  autoPublishComments,
                  allowAnonymousComments,
                }
              : {}),
            ...(lock
              ? {
                  lockClientId: lock.clientId,
                  expectedVersion: lock.contentVersion,
                }
              : {}),
          };
          const r = await updateContent(input);
          if (r.error) {
            failSave(r.error, showToast);
            if ("code" in r && r.code === "STALE_CONTENT") {
              setStaleVersion(
                "currentVersion" in r && typeof r.currentVersion === "number"
                  ? r.currentVersion
                  : null,
              );
            }
          } else {
            // Sync the bumped version back into the lock provider so the
            // NEXT save from this same session sends the up-to-date
            // expectedVersion and isn't rejected as stale.
            if (lock && typeof r.version === "number") {
              lock.syncVersionAfterSave(r.version);
            }
            setError(null);
            setStaleVersion(null);
            if (showToast) {
              if ("unchanged" in r && r.unchanged) {
                toast.info(t("dashboard.content.form.noChangesToSave"));
              } else {
                toast.success(savedToastMessage);
              }
            }
            if (shouldClose) router.push("/dashboard/content");
          }
        }
      } catch {
        failSave(t("dashboard.content.form.saveFailed"), showToast);
      } finally {
        saveInFlightRef.current = false;
        setSaveInFlight(false);
      }
    });
  }

  const statusOptions =
    mode === "create" ? CONTENT_CREATE_STATUSES : CONTENT_STATUSES;
  const canSubmitForReview =
    !canChooseStatus && mode === "edit" && status === "draft";
  const canReturnToDraft =
    !canChooseStatus && mode === "edit" && status === "in_review";
  const hasSchedule = Boolean(publishAt || unpublishAt);
  const publishAtIsFuture = publishAt
    ? (dateTimeLocalInputToUtc(publishAt, timezone)?.getTime() ?? 0) >
      Date.now()
    : false;
  const scheduleSummary = [
    publishAt
      ? t("dashboard.content.form.scheduleSummaryPublishAt", {
          date: publishAt.replace("T", " "),
        })
      : null,
    unpublishAt
      ? t("dashboard.content.form.scheduleSummaryUnpublishAt", {
          date: unpublishAt.replace("T", " "),
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const publishingSettings = (
    <div className="space-y-4">
      {canChooseStatus ? (
        <div className="space-y-2">
          <Label>{t("dashboard.common.table.status")}</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as typeof status)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(getContentStatusLabelKey(option))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("dashboard.content.form.currentStatus", {
              status: t(getContentStatusLabelKey(status)),
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            {canSubmitForReview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={primarySaveDisabled}
                onClick={() => submit(false, true, "in_review")}
              >
                {t("dashboard.content.actions.submitForReview")}
              </Button>
            )}
            {canReturnToDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={primarySaveDisabled}
                onClick={() => submit(false, true, "draft")}
              >
                {t("dashboard.content.actions.returnToDraft")}
              </Button>
            )}
          </div>
        </div>
      )}

      {canChooseStatus ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="publish-at">
                {t("dashboard.content.form.publishAt")}
              </Label>
              <div className="relative">
                <Input
                  id="publish-at"
                  ref={publishAtInputRef}
                  type="datetime-local"
                  className="datetime-local-picker-contrast pr-9"
                  step={60}
                  value={publishAt}
                  onChange={(event) => setPublishAt(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={t("dashboard.content.form.openPublishDatePicker")}
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => showDateTimePicker(publishAtInputRef.current)}
                >
                  <CalendarIcon aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unpublish-at">
                {t("dashboard.content.form.unpublishAt")}
              </Label>
              <div className="relative">
                <Input
                  id="unpublish-at"
                  ref={unpublishAtInputRef}
                  type="datetime-local"
                  className="datetime-local-picker-contrast pr-9"
                  step={60}
                  value={unpublishAt}
                  onChange={(event) => setUnpublishAt(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={t(
                    "dashboard.content.form.openUnpublishDatePicker",
                  )}
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    showDateTimePicker(unpublishAtInputRef.current)
                  }
                >
                  <CalendarIcon aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={primarySaveDisabled}
              onClick={() =>
                submit(false, true, "published", { publishAt: "" })
              }
            >
              {t("dashboard.content.actions.publishNow")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={primarySaveDisabled || !publishAt}
              onClick={() => submit(false, true, "approved")}
            >
              {t("dashboard.content.form.schedulePublish")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={primarySaveDisabled || !hasSchedule}
              onClick={() =>
                submit(false, true, undefined, {
                  publishAt: "",
                  unpublishAt: "",
                })
              }
            >
              {t("dashboard.content.form.clearSchedule")}
            </Button>
          </div>
          {homepage && unpublishAt && (
            <p className="text-xs text-muted-foreground">
              {t("dashboard.content.form.homepageUnpublishWarning")}
            </p>
          )}
        </div>
      ) : hasSchedule ? (
        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          {scheduleSummary}
        </div>
      ) : null}

      {isAdmin && contentType === "page" && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <InlineHelpLabel
              htmlFor="homepage"
              label={t("dashboard.content.actions.setHomepage")}
            >
              {t("dashboard.content.form.setAsHomepageHelp")}
            </InlineHelpLabel>
          </div>
          <Switch
            id="homepage"
            checked={homepage}
            onCheckedChange={setHomepage}
            disabled={status !== "published" || publishAtIsFuture}
          />
        </div>
      )}
    </div>
  );

  const visibilitySettings = (
    <div className="space-y-4">
      <InlineHelpLabel label={t("dashboard.content.form.visibility")}>
        {t("dashboard.content.form.visibilityHelp")}
      </InlineHelpLabel>
      <div className="space-y-3">
        <label className="flex items-start gap-3">
          <Checkbox
            id="visibility-public"
            checked={visibilityPublic}
            onCheckedChange={(v) => setVisibilityPublic(!!v)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <span className="text-sm font-medium">
              {t("dashboard.content.form.public")}
            </span>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.content.form.publicVisibilityHelp")}
            </p>
          </div>
        </label>
        {VISIBILITY_ROLES.map((role) => (
          <label key={role} className="flex items-center gap-3 pl-1">
            <Checkbox
              id={`visibility-${role}`}
              checked={visibilityRoles.includes(role)}
              onCheckedChange={(v) => toggleVisibilityRole(role, !!v)}
            />
            <span className="text-sm capitalize">
              {t(getRoleLabelKey(role))}
              {role === "viewer" && (
                <span className="ms-2 text-xs normal-case text-muted-foreground">
                  {t("dashboard.content.form.viewerDefaultRole")}
                </span>
              )}
            </span>
          </label>
        ))}
        <label className="flex items-center gap-3 pl-1">
          <Checkbox id="visibility-admin" checked disabled />
          <span className="text-sm capitalize text-muted-foreground">
            {t(getRoleLabelKey("admin"))}
            <span className="ms-2 text-xs">
              {t("dashboard.content.form.adminsAlwaysAccess")}
            </span>
          </span>
        </label>
      </div>
    </div>
  );

  const categorySettings = (
    <div className="space-y-4">
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger>
          <SelectValue
            placeholder={t("dashboard.content.form.selectCategory")}
          />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categories.length === 0 && (
        <p className="text-xs text-destructive">
          {t("dashboard.content.form.noCategories")}
        </p>
      )}
    </div>
  );

  const aiFieldsEnabled =
    aiWritingAssistantAvailable &&
    aiProviderOptions.length > 0 &&
    Boolean(effectiveAiModelId) &&
    aiWritingAssistantActive;

  const seoSettings = (
    <div className="space-y-4">
      <AiTextAssistField
        id="meta-title"
        label={t("dashboard.content.form.metaTitle")}
        field="metaTitle"
        value={metaTitle}
        onChange={setMetaTitle}
        aiEnabled={aiFieldsEnabled}
        title={title}
        excerpt={excerpt}
        contentProvider={getCurrentContentText}
        onGenerate={generateAiField}
        generating={aiGenerationField === "metaTitle"}
        aiProviderId={effectiveAiProviderId}
        aiModelId={effectiveAiModelId}
        suggestionsEnabled={contentType === "blog_post"}
      />
      <AiTextAssistField
        id="meta-desc"
        label={t("dashboard.content.form.metaDescription")}
        field="metaDescription"
        value={metaDescription}
        onChange={setMetaDescription}
        aiEnabled={aiFieldsEnabled}
        title={title}
        excerpt={excerpt}
        contentProvider={getCurrentContentText}
        onGenerate={generateAiField}
        generating={aiGenerationField === "metaDescription"}
        aiProviderId={effectiveAiProviderId}
        aiModelId={effectiveAiModelId}
        suggestionsEnabled={contentType === "blog_post"}
        multiline
        rows={3}
      />
    </div>
  );

  const commentsSettings = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <InlineHelpLabel
            htmlFor="enable-comments"
            label={t("dashboard.content.form.enableComments")}
          >
            {t("dashboard.content.form.enableCommentsHelp")}
          </InlineHelpLabel>
        </div>
        <Switch
          id="enable-comments"
          checked={enableComments}
          onCheckedChange={setEnableComments}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <InlineHelpLabel
            htmlFor="auto-publish-comments"
            label={t("dashboard.content.form.autoPublishComments")}
          >
            {t("dashboard.content.form.autoPublishCommentsHelp")}
          </InlineHelpLabel>
        </div>
        <Switch
          id="auto-publish-comments"
          checked={autoPublishComments}
          onCheckedChange={setAutoPublishComments}
          disabled={!enableComments}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <InlineHelpLabel
            htmlFor="allow-anon-comments"
            label={t("dashboard.content.form.allowAnonymous")}
          >
            {t("dashboard.content.form.allowAnonymousHelp")}
          </InlineHelpLabel>
        </div>
        <Switch
          id="allow-anon-comments"
          checked={allowAnonymousComments}
          onCheckedChange={setAllowAnonymousComments}
          disabled={!enableComments}
        />
      </div>
      {mode === "edit" && initial?.id && (
        <div className="pt-2 border-t">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/dashboard/content/${initial.id}/comments`}>
              {t("dashboard.content.form.manageComments")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );

  const historyPanel =
    mode === "edit" && initial?.id ? (
      <ContentHistoryPanel
        contentId={initial.id}
        revisions={history?.revisions ?? []}
        total={history?.total ?? 0}
        contentHistoryEnabled={history?.enabled ?? true}
        current={{
          slug: slugify(slug),
          status,
          homepage,
          publishAt: toIsoOrNull(publishAt, timezone),
          unpublishAt: toIsoOrNull(unpublishAt, timezone),
        }}
        expectedVersion={lock?.contentVersion}
        lockClientId={lock?.clientId}
        restoreDisabled={primarySaveDisabled}
        onRestored={(version) => {
          lock?.syncVersionAfterSave(version);
          setError(null);
          setStaleVersion(null);
        }}
        onStaleVersion={setStaleVersion}
      />
    ) : null;

  const pageEditorSettingsPanels: PageEditorSettingsPanels = {
    publishing: <div className="p-3">{publishingSettings}</div>,
    visibility: <div className="p-3">{visibilitySettings}</div>,
    category: <div className="p-3">{categorySettings}</div>,
    seo: <div className="p-3">{seoSettings}</div>,
    ...(historyPanel
      ? { history: <div className="p-3">{historyPanel}</div> }
      : {}),
  };

  return (
    <div className="space-y-6">
      <div
        className={[
          "fixed end-4 bottom-[calc(var(--sticky-footer-h,0px)+1rem+env(safe-area-inset-bottom,0px))] z-[60] transition-all duration-200 sm:end-6 sm:bottom-[calc(var(--sticky-footer-h,0px)+1.5rem+env(safe-area-inset-bottom,0px))]",
          showFloatingSave
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        ].join(" ")}
      >
        <Button
          type="button"
          size="lg"
          onClick={submitPrimary}
          disabled={primarySaveDisabled}
          className="h-11 rounded-full px-4 shadow-lg shadow-black/15"
          aria-label={
            savePending
              ? mode === "create"
                ? t("dashboard.content.form.creating")
                : t("dashboard.common.actions.saving")
              : mode === "create"
                ? t("dashboard.content.form.createContent")
                : t("dashboard.content.form.saveContent")
          }
          title={
            lockBlocksSave ? t("dashboard.content.form.saveLocked") : undefined
          }
        >
          {savePending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {savePending
              ? mode === "create"
                ? t("dashboard.content.form.creating")
                : t("dashboard.common.actions.saving")
              : primarySaveLabel}
          </span>
          <span className="sm:hidden">
            {savePending
              ? mode === "create"
                ? t("dashboard.content.form.creating")
                : t("dashboard.common.actions.saving")
              : primarySaveLabel}
          </span>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "create"
              ? t("dashboard.content.form.create")
              : t("dashboard.content.form.edit")}{" "}
            {t(getContentTypeLabelKey(contentType))}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t(getContentTypeDescriptionKey(contentType))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "create" ? (
            <Button onClick={submitPrimary} disabled={primarySaveDisabled}>
              {savePending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("dashboard.content.form.create")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={openPreview}
                disabled={previewPending || status === "archived"}
                title={
                  status === "archived"
                    ? t("dashboard.content.form.previewDisabledArchived")
                    : t("dashboard.content.form.previewTitle")
                }
              >
                {previewPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="me-2 h-4 w-4" />
                )}
                {t("dashboard.content.form.preview")}
              </Button>
              <Button
                onClick={submitPrimary}
                disabled={primarySaveDisabled}
                title={
                  lockBlocksSave
                    ? t("dashboard.content.form.saveLocked")
                    : undefined
                }
              >
                {savePending && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {t("dashboard.content.form.save")}
              </Button>
              <Button
                onClick={() => submit(true)}
                disabled={primarySaveDisabled}
                variant="secondary"
                title={
                  lockBlocksSave
                    ? t("dashboard.content.form.saveLocked")
                    : undefined
                }
              >
                {savePending && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {t("dashboard.content.form.saveAndClose")}
              </Button>
            </>
          )}
          <Button variant="outline" asChild disabled={savePending}>
            <Link href="/dashboard/content">
              {t("dashboard.common.actions.cancel")}
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
          {staleVersion !== null && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.refresh()}
              >
                {t("dashboard.content.form.refresh")}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-950 dark:text-cyan-100">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">
            {t("dashboard.content.form.sessionSecurity")}
          </p>
          <p className="text-cyan-900/80 dark:text-cyan-100/80">
            {t("dashboard.content.form.sessionSecurityDescription", {
              idle: idleLogoutLabel,
              max: maxSessionLabel,
            })}
          </p>
        </div>
      </div>

      <fieldset
        disabled={lockBlocksSave}
        className={
          lockBlocksSave
            ? contentType === "page"
              ? "grid grid-cols-1 gap-6 opacity-70 pointer-events-none"
              : "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24%)] gap-6 opacity-70 pointer-events-none"
            : contentType === "page"
              ? "grid grid-cols-1 gap-6"
              : "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24%)] gap-6"
        }
      >
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {contentType === "hero_slider"
                ? t("dashboard.content.form.name")
                : t("dashboard.content.form.title")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("dashboard.content.form.titlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("dashboard.content.form.slug")}</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              onBlur={() => setSlug(slugify(slug))}
              placeholder={t("dashboard.content.form.slugPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("dashboard.content.form.publicUrl")}{" "}
              <Link
                href={`/${slug || "your-slug"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary underline-offset-4 hover:underline"
              >
                /{slug || "your-slug"}
              </Link>
            </p>
          </div>

          {contentType === "blog_post" && (
            <>
              <AiTextAssistField
                id="excerpt"
                label={t("dashboard.content.form.excerpt")}
                field="excerpt"
                value={excerpt}
                onChange={setExcerpt}
                aiEnabled={aiFieldsEnabled}
                title={title}
                excerpt={excerpt}
                contentProvider={getCurrentContentText}
                onGenerate={generateAiField}
                generating={aiGenerationField === "excerpt"}
                aiProviderId={effectiveAiProviderId}
                aiModelId={effectiveAiModelId}
                multiline
                rows={3}
                placeholder={t("dashboard.content.form.excerptPlaceholder")}
              />
              <div className="space-y-2">
                <Label htmlFor="cover">
                  {t("dashboard.content.form.coverImageUrl")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cover"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCoverPickerOpen(true)}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {t("dashboard.content.form.browse")}
                  </Button>
                </div>
                {coverImage && (
                  <div className="rounded-md border bg-muted/20 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt={t("dashboard.content.form.coverPreviewAlt")}
                      className="max-h-40 rounded object-contain"
                    />
                  </div>
                )}
                <ImageInsertDialog
                  open={coverPickerOpen}
                  onOpenChange={setCoverPickerOpen}
                  onInsert={({ src }) => setCoverImage(src)}
                />
              </div>
            </>
          )}

          {contentType === "hero_slider" && (
            <AiTextAssistField
              id="excerpt"
              label={t("dashboard.content.form.description")}
              field="excerpt"
              value={excerpt}
              onChange={setExcerpt}
              aiEnabled={false}
              title={title}
              excerpt={excerpt}
              contentProvider={getCurrentContentText}
              onGenerate={generateAiField}
              generating={false}
              suggestionsEnabled={false}
              multiline
              rows={3}
              placeholder={t("dashboard.content.form.descriptionPlaceholder")}
            />
          )}

          {contentType !== "webshop" && (
            <div className="space-y-2">
              <Label>
                {contentType === "hero_slider"
                  ? t("dashboard.content.form.slides")
                  : t("dashboard.content.form.content")}
              </Label>
              {contentType === "page" ? (
                <PageEditor
                  defaultValue={editorDefaultValue}
                  appearance={appearance}
                  settingsPanels={pageEditorSettingsPanels}
                  activeSettingsTab={toPageEditorSettingsTab(
                    activeInspectorTab,
                  )}
                  onActiveSettingsTabChange={updateInspectorTab}
                  pageTitle={title}
                  registerGetValue={(getValue) => {
                    getEditorValueRef.current = getValue;
                  }}
                  onChange={(d: BuilderData) => {
                    contentJsonRef.current = d;
                  }}
                  aiAssistantAvailable={
                    aiWritingAssistantAvailable && aiProviderOptions.length > 0
                  }
                  aiAssistantActive={aiWritingAssistantActive}
                  onAiAssistantActiveChange={
                    handleAiWritingAssistantActiveChange
                  }
                  onAiSeoGenerated={(seo) => {
                    if (seo.metaTitle && !metaTitle.trim()) {
                      setMetaTitle(seo.metaTitle);
                    }
                    if (seo.metaDescription && !metaDescription.trim()) {
                      setMetaDescription(seo.metaDescription);
                    }
                  }}
                  aiProviderOptions={aiProviderOptions}
                  aiProviderId={effectiveAiProviderId}
                  onAiProviderIdChange={handleAiProviderIdChange}
                  aiModelId={effectiveAiModelId}
                  onAiModelIdChange={handleAiModelIdChange}
                />
              ) : contentType === "hero_slider" ? (
                <HeroSliderEditor
                  defaultValue={editorDefaultValue}
                  registerGetValue={(getValue) => {
                    getEditorValueRef.current = getValue;
                  }}
                  onChange={(value) => {
                    contentJsonRef.current = value;
                  }}
                />
              ) : (
                <BlogEditor
                  defaultValue={editorDefaultValue as never}
                  aiWritingAssistantAvailable={
                    aiWritingAssistantAvailable && aiProviderOptions.length > 0
                  }
                  aiWritingAssistantActive={aiWritingAssistantActive}
                  onAiWritingAssistantActiveChange={
                    handleAiWritingAssistantActiveChange
                  }
                  aiProviderOptions={aiProviderOptions}
                  aiProviderId={effectiveAiProviderId}
                  onAiProviderIdChange={handleAiProviderIdChange}
                  aiModelId={effectiveAiModelId}
                  onAiModelIdChange={handleAiModelIdChange}
                  title={title}
                  excerpt={excerpt}
                  registerGetValue={(getValue) => {
                    getEditorValueRef.current = getValue;
                  }}
                  onChange={(j) => {
                    contentJsonRef.current = j;
                  }}
                />
              )}
            </div>
          )}
        </div>

        {contentType !== "page" && (
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-[var(--sticky-header-h,0px)] lg:self-start">
            <Tabs
              value={toSidebarSettingsTab(activeInspectorTab, contentType)}
              onValueChange={(value) =>
                updateInspectorTab(value as InspectorTab)
              }
              className="gap-0 rounded-lg border bg-background"
            >
              <TabsList className="m-2 w-auto flex-wrap overflow-x-visible">
                <TabsTrigger
                  value="publishing"
                  className="min-w-0 px-2 text-xs"
                >
                  <Rocket className="h-4 w-4" />
                  <span className="truncate">
                    {t("dashboard.content.form.publishing")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="visibility"
                  className="min-w-0 px-2 text-xs"
                >
                  <Eye className="h-4 w-4" />
                  <span className="truncate">
                    {t("dashboard.content.form.visibility")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="category" className="min-w-0 px-2 text-xs">
                  <FolderTree className="h-4 w-4" />
                  <span className="truncate">
                    {t("dashboard.content.form.category")}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="seo" className="min-w-0 px-2 text-xs">
                  <Search className="h-4 w-4" />
                  <span className="truncate">
                    {t("dashboard.content.form.seo")}
                  </span>
                </TabsTrigger>
                {contentType === "blog_post" && (
                  <TabsTrigger
                    value="comments"
                    className="min-w-0 px-2 text-xs"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">
                      {t("dashboard.content.form.comments")}
                    </span>
                  </TabsTrigger>
                )}
                {historyPanel && (
                  <TabsTrigger value="history" className="min-w-0 px-2 text-xs">
                    <HistoryIcon className="h-4 w-4" />
                    <span className="truncate">
                      {t("dashboard.content.form.history")}
                    </span>
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="publishing" className="m-0 p-4 pt-2">
                {publishingSettings}
              </TabsContent>
              <TabsContent value="visibility" className="m-0 p-4 pt-2">
                {visibilitySettings}
              </TabsContent>
              <TabsContent value="category" className="m-0 p-4 pt-2">
                {categorySettings}
              </TabsContent>
              <TabsContent value="seo" className="m-0 p-4 pt-2">
                {seoSettings}
              </TabsContent>
              {contentType === "blog_post" && (
                <TabsContent value="comments" className="m-0 p-4 pt-2">
                  {commentsSettings}
                </TabsContent>
              )}
              {historyPanel && (
                <TabsContent value="history" className="m-0 p-4 pt-2">
                  {historyPanel}
                </TabsContent>
              )}
            </Tabs>
          </aside>
        )}
      </fieldset>
    </div>
  );
}

function getAiFieldLabel(field: AiGeneratedField, t: TranslateFn) {
  if (field === "excerpt") return t("dashboard.content.form.excerpt");
  if (field === "metaTitle") return t("dashboard.content.form.metaTitle");
  return t("dashboard.content.form.metaDescription");
}

function getDefaultInspectorTab(
  contentType: Props["contentType"],
): InspectorTab {
  return contentType === "page" ? "properties" : "publishing";
}

function normalizeInspectorTab(input: {
  value: string | undefined;
  contentType: Props["contentType"];
  hasHistory: boolean;
}): InspectorTab {
  const allowed = new Set<InspectorTab>(
    input.contentType === "page"
      ? ["properties", "publishing", "visibility", "category", "seo"]
      : ["publishing", "visibility", "category", "seo"],
  );

  if (input.contentType === "blog_post") allowed.add("comments");
  if (input.hasHistory) allowed.add("history");

  return input.value && allowed.has(input.value as InspectorTab)
    ? (input.value as InspectorTab)
    : getDefaultInspectorTab(input.contentType);
}

function persistInspectorTabInUrl(
  tab: InspectorTab,
  contentType: Props["contentType"],
) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (tab === getDefaultInspectorTab(contentType)) {
    url.searchParams.delete("inspector");
  } else {
    url.searchParams.set("inspector", tab);
  }
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function toPageEditorSettingsTab(tab: InspectorTab): PageEditorSettingsTab {
  return tab === "comments" ? "properties" : tab;
}

function toSidebarSettingsTab(
  tab: InspectorTab,
  contentType: Props["contentType"],
) {
  if (tab === "properties") return "publishing";
  if (tab === "comments" && contentType !== "blog_post") return "publishing";
  return tab;
}

function toDatetimeLocalValue(
  value: string | Date | null | undefined,
  timeZone: string,
) {
  return formatDateTimeLocalInputValue(value, timeZone);
}

function toIsoOrNull(value: string | null | undefined, timeZone: string) {
  if (!value) return null;
  return dateTimeLocalInputToUtc(value, timeZone)?.toISOString() ?? null;
}

type AiTextAssistFieldProps = {
  id: string;
  label: string;
  field: AiGeneratedField;
  value: string;
  onChange: (value: string) => void;
  aiEnabled: boolean;
  title: string;
  excerpt: string;
  contentProvider: () => string;
  onGenerate: (field: AiGeneratedField) => void;
  generating: boolean;
  aiProviderId?: AIProviderId;
  aiModelId?: string;
  suggestionsEnabled?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
};

function AiTextAssistField({
  id,
  label,
  field,
  value,
  onChange,
  aiEnabled,
  title,
  excerpt,
  contentProvider,
  onGenerate,
  generating,
  aiProviderId,
  aiModelId,
  suggestionsEnabled = true,
  multiline = false,
  rows,
  placeholder,
}: AiTextAssistFieldProps) {
  const t = useTranslations();
  const controlRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );
  const selectionRef = useRef({ start: value.length, end: value.length });
  const requestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focused, setFocused] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    requestRef.current?.abort();
    requestRef.current = null;

    if (!aiEnabled || !suggestionsEnabled || !focused) return;

    const control = controlRef.current;
    if (!control || document.activeElement !== control) return;

    const start = control.selectionStart ?? value.length;
    const end = control.selectionEnd ?? value.length;
    selectionRef.current = { start, end };

    if (start !== end) return;

    const before = value.slice(0, start);
    const after = value.slice(end);
    if (before.trim().length < 3) return;

    const content = contentProvider().trim();
    if (getAiFieldContextError(field, { title, excerpt, content }, t)) return;

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      requestRef.current = controller;

      try {
        const response = await fetch("/api/ai-writing-assistant/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: aiProviderId,
            model: aiModelId,
            field,
            title,
            excerpt: field === "excerpt" ? value : excerpt,
            content,
            before,
            after,
          }),
          signal: controller.signal,
        });

        if (!response.ok || requestId !== requestIdRef.current) return;

        const data = (await response.json()) as { suggestion?: unknown };
        const nextSuggestion =
          typeof data.suggestion === "string" ? data.suggestion : "";

        if (!nextSuggestion || requestId !== requestIdRef.current) return;

        const latest = controlRef.current;
        if (
          !latest ||
          document.activeElement !== latest ||
          (latest.selectionStart ?? value.length) !== start ||
          latest.selectionEnd !== end
        ) {
          return;
        }

        setSuggestion(nextSuggestion);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (requestId === requestIdRef.current) {
          requestRef.current = null;
        }
      }
    }, 750);
  }, [
    aiEnabled,
    aiModelId,
    aiProviderId,
    contentProvider,
    excerpt,
    field,
    focused,
    suggestionsEnabled,
    title,
    value,
  ]);

  function syncSelection(control: HTMLInputElement | HTMLTextAreaElement) {
    selectionRef.current = {
      start: control.selectionStart ?? value.length,
      end: control.selectionEnd ?? value.length,
    };
  }

  function acceptSuggestion() {
    if (!suggestion) return;

    const control = controlRef.current;
    const start = control?.selectionStart ?? selectionRef.current.start;
    const end = control?.selectionEnd ?? selectionRef.current.end;
    const nextValue = value.slice(0, start) + suggestion + value.slice(end);
    const nextPosition = start + suggestion.length;

    onChange(nextValue);
    setSuggestion("");

    requestAnimationFrame(() => {
      const latest = controlRef.current;
      if (!latest) return;
      latest.focus();
      latest.setSelectionRange(nextPosition, nextPosition);
      selectionRef.current = { start: nextPosition, end: nextPosition };
    });
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    syncSelection(event.currentTarget);
    setSuggestion("");
    onChange(event.currentTarget.value);
  }

  function handleFocus(
    event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setFocused(true);
    syncSelection(event.currentTarget);
  }

  function handleBlur() {
    setFocused(false);
    setSuggestion("");
  }

  function handleSelect(
    event: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    syncSelection(event.currentTarget);
    setSuggestion("");
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (event.key === "Tab" && suggestion) {
      event.preventDefault();
      acceptSuggestion();
      return;
    }

    if (event.key === "Escape" && suggestion) {
      event.preventDefault();
      setSuggestion("");
    }
  }

  const sharedProps = {
    id,
    value,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onSelect: handleSelect,
    onKeyDown: handleKeyDown,
    placeholder,
    "aria-describedby": suggestion ? `${id}-ai-suggestion` : undefined,
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-6 items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {aiEnabled && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-primary hover:text-primary"
                  disabled={generating}
                  aria-label={t("dashboard.content.form.generateWithAi", {
                    field: label,
                  })}
                  onClick={() => onGenerate(field)}
                >
                  {generating ? (
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles aria-hidden className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("dashboard.content.form.generateWithAi", { field: label })}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {multiline ? (
        <Textarea
          {...sharedProps}
          ref={controlRef as Ref<HTMLTextAreaElement>}
          rows={rows}
        />
      ) : (
        <Input {...sharedProps} ref={controlRef as Ref<HTMLInputElement>} />
      )}
      {aiEnabled && suggestionsEnabled && suggestion && (
        <button
          id={`${id}-ai-suggestion`}
          type="button"
          aria-label={t("dashboard.content.form.acceptAiSuggestion", {
            suggestion,
          })}
          className={cn(
            "flex max-w-full items-start gap-1.5 text-start text-xs",
            "text-muted-foreground transition hover:text-foreground",
          )}
          onMouseDown={(event) => event.preventDefault()}
          onClick={acceptSuggestion}
        >
          <Sparkles
            aria-hidden
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
          />
          <span className="min-w-0">
            <span className="break-words">{suggestion}</span>
          </span>
        </button>
      )}
    </div>
  );
}

function getAiFieldContextError(
  field: AiGeneratedField,
  context: { title: string; excerpt: string; content: string },
  t: TranslateFn,
  surface: AiAssistantSurface = "blogEditor",
) {
  if (!context.title.trim()) {
    return field === "excerpt"
      ? t("dashboard.content.form.aiNeedsTitleForExcerpt")
      : t("dashboard.content.form.aiNeedsTitleForSeo");
  }

  if (surface === "pageBuilder") {
    return null;
  }

  if (
    field !== "excerpt" &&
    !context.excerpt.trim() &&
    !context.content.trim()
  ) {
    return t("dashboard.content.form.aiNeedsExcerptOrContentForSeo");
  }

  return null;
}

function builderDataToPlainText(value: unknown) {
  if (!isBuilderData(value)) return "";

  const builderData = value;
  const parts: string[] = [];
  const visited = new Set<string>();

  function visitNode(id: string) {
    if (visited.has(id)) return;
    visited.add(id);

    const node = builderData.nodes[id];
    if (!node || node.hidden) return;

    collectBuilderPropsText(node.props, parts);

    for (const childId of node.nodes ?? []) {
      visitNode(childId);
    }

    for (const linkedNodeId of Object.values(node.linkedNodes ?? {})) {
      visitNode(linkedNodeId);
    }
  }

  visitNode(ROOT_NODE_ID);

  return normalizePlainText(parts.join("\n"));
}

function collectBuilderPropsText(
  props: Record<string, unknown>,
  parts: string[],
) {
  for (const [key, propValue] of Object.entries(props)) {
    if (
      key === "content" ||
      key === "title" ||
      key === "subtitle" ||
      key === "label"
    ) {
      const text =
        typeof propValue === "string"
          ? propValue
          : tiptapJsonToPlainText(propValue);
      if (text.trim()) parts.push(text);
    }

    if (key === "html" && typeof propValue === "string") {
      const text = propValue.replace(/<[^>]*>/g, " ");
      if (text.trim()) parts.push(text);
    }
  }
}

function tiptapJsonToPlainText(value: unknown) {
  const parts: string[] = [];
  collectTiptapText(value, parts);

  return normalizePlainText(parts.join(""));
}

function normalizePlainText(value: string) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectTiptapText(value: unknown, parts: string[]) {
  if (typeof value !== "object" || value === null) return;

  const node = value as {
    type?: unknown;
    text?: unknown;
    content?: unknown;
  };

  const type = typeof node.type === "string" ? node.type : "";
  const isBlock = isTiptapBlockNode(type);

  if (isBlock && parts.length > 0 && parts.at(-1) !== "\n") {
    parts.push("\n");
  }

  if (typeof node.text === "string") {
    parts.push(node.text);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectTiptapText(child, parts);
    }
  }

  if (isBlock && parts.at(-1) !== "\n") {
    parts.push("\n");
  }
}

function isTiptapBlockNode(type: string) {
  return (
    type === "paragraph" ||
    type === "heading" ||
    type === "blockquote" ||
    type === "listItem" ||
    type === "codeBlock" ||
    type === "tableRow" ||
    type === "tableCell" ||
    type === "tableHeader"
  );
}

function formatSessionMinutes(totalMinutes: number) {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(" ");
}
