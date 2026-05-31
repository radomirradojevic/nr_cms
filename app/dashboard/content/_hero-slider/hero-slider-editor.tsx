"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Film,
  ImageIcon,
  Layers3,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageInsertDialog } from "@/app/dashboard/content/_editors/image-insert-dialog";
import { VideoInsertDialog } from "@/app/dashboard/content/_editors/video-insert-dialog";
import { HeroSliderRenderer } from "@/components/hero-slider-renderer";
import {
  HERO_SLIDE_BLOCK_OPTIONS,
  HERO_SLIDER_TEMPLATE_OPTIONS,
  createDefaultHeroSlider,
  createHeroSlide,
  createHeroSlideBlock,
  createHeroSliderTemplate,
  makeHeroSliderId,
  normalizeHeroSliderContent,
  type HeroSlide,
  type HeroSlideBlock,
  type HeroSlideBlockType,
  type HeroSliderBreakpoint,
  type HeroSliderContent,
  type HeroSliderTemplate,
} from "@/lib/hero-slider";
import { cn } from "@/lib/utils";

type Props = {
  defaultValue: unknown;
  registerGetValue?: (getValue: () => HeroSliderContent) => void;
  onChange?: (value: HeroSliderContent) => void;
};

type MediaTarget =
  | { kind: "slide-image"; slideId: string }
  | { kind: "slide-poster"; slideId: string }
  | { kind: "block-image"; blockId: string };

const BREAKPOINTS: HeroSliderBreakpoint[] = ["desktop", "tablet", "mobile"];

export function HeroSliderEditor({
  defaultValue,
  registerGetValue,
  onChange,
}: Props) {
  const [data, setData] = useState<HeroSliderContent>(() =>
    normalizeHeroSliderContent(defaultValue ?? createDefaultHeroSlider()),
  );
  const dataRef = useRef(data);
  const [activeSlideId, setActiveSlideId] = useState(
    () => data.slides[0]?.id ?? "",
  );
  const [newBlockType, setNewBlockType] =
    useState<HeroSlideBlockType>("heading");
  const [imageTarget, setImageTarget] = useState<MediaTarget | null>(null);
  const [videoTargetSlideId, setVideoTargetSlideId] = useState<string | null>(
    null,
  );
  const [template, setTemplate] = useState<HeroSliderTemplate>("saas");
  const [uploading, startUpload] = useTransition();

  useEffect(() => {
    dataRef.current = data;
    onChange?.(data);
  }, [data, onChange]);

  useEffect(() => {
    registerGetValue?.(() => dataRef.current);
  }, [registerGetValue]);

  const activeSlide = useMemo(
    () =>
      data.slides.find((slide) => slide.id === activeSlideId) ?? data.slides[0],
    [activeSlideId, data.slides],
  );

  function updateData(mutator: (draft: HeroSliderContent) => void) {
    setData((current) => {
      const draft = clone(current);
      mutator(draft);
      return normalizeHeroSliderContent(draft);
    });
  }

  function updateSettings<K extends keyof HeroSliderContent["settings"]>(
    key: K,
    value: HeroSliderContent["settings"][K],
  ) {
    updateData((draft) => {
      draft.settings[key] = value;
    });
  }

  function updateSlide(slideId: string, mutator: (slide: HeroSlide) => void) {
    updateData((draft) => {
      const slide = draft.slides.find((item) => item.id === slideId);
      if (slide) mutator(slide);
    });
  }

  function addSlide() {
    const slide = createHeroSlide(`Slide ${data.slides.length + 1}`);
    updateData((draft) => {
      draft.slides.push(slide);
    });
    setActiveSlideId(slide.id);
  }

  function duplicateSlide(slideId: string) {
    const source = data.slides.find((slide) => slide.id === slideId);
    if (!source) return;
    const copySlide = remapSlideIds(clone(source));
    copySlide.name = `${source.name || "Slide"} copy`;
    updateData((draft) => {
      const index = draft.slides.findIndex((slide) => slide.id === slideId);
      draft.slides.splice(index + 1, 0, copySlide);
    });
    setActiveSlideId(copySlide.id);
  }

  function moveSlide(slideId: string, direction: -1 | 1) {
    updateData((draft) => {
      const index = draft.slides.findIndex((slide) => slide.id === slideId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= draft.slides.length)
        return;
      const [slide] = draft.slides.splice(index, 1);
      draft.slides.splice(nextIndex, 0, slide);
    });
  }

  function deleteSlide(slideId: string) {
    if (data.slides.length <= 1) {
      toast.error("A hero slider needs at least one slide.");
      return;
    }
    const nextSlides = data.slides.filter((slide) => slide.id !== slideId);
    updateData((draft) => {
      draft.slides = nextSlides;
    });
    if (activeSlideId === slideId) setActiveSlideId(nextSlides[0]?.id ?? "");
  }

  function addBlock(slideId: string) {
    updateSlide(slideId, (slide) => {
      slide.blocks.push(createHeroSlideBlock(newBlockType));
    });
  }

  function updateBlocks(slideId: string, blocks: HeroSlideBlock[]) {
    updateSlide(slideId, (slide) => {
      slide.blocks = blocks;
    });
  }

  function applyTemplate() {
    const next = createHeroSliderTemplate(template);
    setData(next);
    setActiveSlideId(next.slides[0]?.id ?? "");
  }

  function uploadFile(
    file: File,
    onUploaded: (args: { src: string; alt: string }) => void,
  ) {
    startUpload(async () => {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/files", {
          method: "POST",
          body,
        });
        const payload = (await response.json().catch(() => null)) as {
          results?: Array<
            | {
                ok: true;
                file: { id: string; filename: string; alt?: string | null };
              }
            | { ok: false; error: string }
          >;
          error?: string;
        } | null;
        if (!response.ok) {
          toast.error(payload?.error ?? "Upload failed.");
          return;
        }
        const result = payload?.results?.[0];
        if (!result) {
          toast.error("Upload failed.");
          return;
        }
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        onUploaded({
          src: `/api/files/${result.file.id}`,
          alt: result.file.alt ?? result.file.filename,
        });
        toast.success("Media uploaded.");
      } catch {
        toast.error("Upload failed.");
      }
    });
  }

  function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    target: MediaTarget,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    uploadFile(file, (uploaded) => applyMediaTarget(target, uploaded));
  }

  function handleVideoUpload(
    event: ChangeEvent<HTMLInputElement>,
    slideId: string,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    uploadFile(file, (uploaded) => {
      updateSlide(slideId, (slide) => {
        slide.video.src = uploaded.src;
      });
    });
  }

  function applyMediaTarget(
    target: MediaTarget,
    media: { src: string; alt: string },
  ) {
    if (target.kind === "slide-image") {
      updateSlide(target.slideId, (slide) => {
        slide.image.src = media.src;
        if (!slide.image.alt) slide.image.alt = media.alt;
      });
      return;
    }
    if (target.kind === "slide-poster") {
      updateSlide(target.slideId, (slide) => {
        slide.video.poster = media.src;
      });
      return;
    }
    updateAllBlocks((block) => {
      if (block.id !== target.blockId) return block;
      return {
        ...block,
        props: {
          ...block.props,
          src: media.src,
          alt:
            typeof block.props.alt === "string" ? block.props.alt : media.alt,
        },
      };
    });
  }

  function updateAllBlocks(mapper: (block: HeroSlideBlock) => HeroSlideBlock) {
    updateData((draft) => {
      draft.slides = draft.slides.map((slide) => ({
        ...slide,
        blocks: mapBlocksDeep(slide.blocks, mapper),
      }));
    });
  }

  if (!activeSlide) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No slides available.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border bg-background p-4">
      <Tabs defaultValue="slides" className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-3 p-1 sm:w-[520px]">
          <TabsTrigger value="slides">
            <Layers3 className="h-4 w-4" />
            Slides
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SlidersHorizontal className="h-4 w-4" />
            Slider Settings
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Plus className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slides" className="m-0">
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-3">
              <Button type="button" onClick={addSlide} className="w-full">
                <Plus className="h-4 w-4" />
                Add slide
              </Button>
              <div className="space-y-2">
                {data.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlideId(slide.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition hover:bg-accent",
                      slide.id === activeSlide.id && "border-primary bg-accent",
                    )}
                  >
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="min-w-0 flex-1 truncate">
                      {slide.name || "Slide"}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveSlide(activeSlide.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveSlide(activeSlide.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => duplicateSlide(activeSlide.id)}
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteSlide(activeSlide.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>

              <SlidePanel
                slide={activeSlide}
                uploading={uploading}
                onUpdate={(mutator) => updateSlide(activeSlide.id, mutator)}
                onImageUpload={(event, target) =>
                  handleImageUpload(event, target)
                }
                onVideoUpload={(event) =>
                  handleVideoUpload(event, activeSlide.id)
                }
                onOpenImagePicker={setImageTarget}
                onOpenVideoPicker={() => setVideoTargetSlideId(activeSlide.id)}
              />

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px] flex-1 space-y-1">
                    <Label className="text-xs">Add content block</Label>
                    <Select
                      value={newBlockType}
                      onValueChange={(value) =>
                        setNewBlockType(value as HeroSlideBlockType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HERO_SLIDE_BLOCK_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={() => addBlock(activeSlide.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Add block
                  </Button>
                </div>
                <BlockEditorList
                  blocks={activeSlide.blocks}
                  onChange={(blocks) => updateBlocks(activeSlide.id, blocks)}
                  onOpenImagePicker={(blockId) =>
                    setImageTarget({ kind: "block-image", blockId })
                  }
                />
              </div>

              <div className="overflow-hidden rounded-md border">
                <HeroSliderRenderer
                  data={{ ...data, slides: [activeSlide] }}
                  preview
                />
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <SliderSettingsPanel data={data} onUpdate={updateSettings} />
        </TabsContent>

        <TabsContent value="templates" className="m-0">
          <div className="max-w-xl space-y-3 rounded-md border p-4">
            <div className="space-y-2">
              <Label>Starter preset</Label>
              <Select
                value={template}
                onValueChange={(value) =>
                  setTemplate(value as HeroSliderTemplate)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HERO_SLIDER_TEMPLATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={applyTemplate}>
              Apply preset
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <ImageInsertDialog
        open={!!imageTarget}
        onOpenChange={(open) => {
          if (!open) setImageTarget(null);
        }}
        mode="insert"
        onInsert={(image) => {
          if (imageTarget) applyMediaTarget(imageTarget, image);
          setImageTarget(null);
        }}
      />
      <VideoInsertDialog
        open={!!videoTargetSlideId}
        onOpenChange={(open) => {
          if (!open) setVideoTargetSlideId(null);
        }}
        onInsert={(video) => {
          if (!videoTargetSlideId) return;
          if (video.provider !== "file") {
            toast.error("Background videos must be uploaded video files.");
            return;
          }
          updateSlide(videoTargetSlideId, (slide) => {
            slide.video.src = video.src;
          });
          setVideoTargetSlideId(null);
        }}
      />
    </div>
  );
}

function SliderSettingsPanel({
  data,
  onUpdate,
}: {
  data: HeroSliderContent;
  onUpdate: <K extends keyof HeroSliderContent["settings"]>(
    key: K,
    value: HeroSliderContent["settings"][K],
  ) => void;
}) {
  const settings = data.settings;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Playback">
        <SwitchField
          label="Autoplay"
          checked={settings.autoplay}
          onChange={(value) => onUpdate("autoplay", value)}
        />
        <NumberField
          label="Autoplay delay"
          value={settings.autoplayDelayMs}
          min={1000}
          step={250}
          suffix="ms"
          onChange={(value) => onUpdate("autoplayDelayMs", value)}
        />
        <SwitchField
          label="Infinite loop"
          checked={settings.infiniteLoop}
          onChange={(value) => onUpdate("infiniteLoop", value)}
        />
        <SwitchField
          label="Pause on hover"
          checked={settings.pauseOnHover}
          onChange={(value) => onUpdate("pauseOnHover", value)}
        />
        <SwitchField
          label="Pause when not visible"
          checked={settings.pauseWhenNotVisible}
          onChange={(value) => onUpdate("pauseWhenNotVisible", value)}
        />
      </Panel>

      <Panel title="Transition">
        <Field label="Transition type">
          <Select
            value={settings.transitionType}
            onValueChange={(value) =>
              onUpdate("transitionType", value as "slide" | "fade")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="fade">Fade</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <NumberField
          label="Transition speed"
          value={settings.transitionSpeedMs}
          min={100}
          step={50}
          suffix="ms"
          onChange={(value) => onUpdate("transitionSpeedMs", value)}
        />
      </Panel>

      <Panel title="Controls">
        <SwitchField
          label="Show arrows"
          checked={settings.showArrows}
          onChange={(value) => onUpdate("showArrows", value)}
        />
        <SwitchField
          label="Show pagination dots"
          checked={settings.showDots}
          onChange={(value) => onUpdate("showDots", value)}
        />
        <SwitchField
          label="Keyboard navigation"
          checked={settings.keyboardNavigation}
          onChange={(value) => onUpdate("keyboardNavigation", value)}
        />
        <SwitchField
          label="Swipe support"
          checked={settings.swipeSupport}
          onChange={(value) => onUpdate("swipeSupport", value)}
        />
        <SwitchField
          label="Mouse drag support"
          checked={settings.mouseDragSupport}
          onChange={(value) => onUpdate("mouseDragSupport", value)}
        />
      </Panel>

      <Panel title="Canvas">
        <SwitchField
          label="Full width mode"
          checked={settings.fullWidth}
          onChange={(value) => onUpdate("fullWidth", value)}
        />
        <SwitchField
          label="Full height mode"
          checked={settings.fullHeight}
          onChange={(value) => onUpdate("fullHeight", value)}
        />
        <TextField
          label="Custom height"
          value={settings.customHeight}
          onChange={(value) => onUpdate("customHeight", value)}
        />
        <TextField
          label="Overlay color"
          value={settings.overlayColor}
          onChange={(value) => onUpdate("overlayColor", value)}
        />
        <NumberField
          label="Overlay opacity"
          value={settings.overlayOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => onUpdate("overlayOpacity", value)}
        />
        <TextField
          label="ARIA label"
          value={settings.ariaLabel}
          onChange={(value) => onUpdate("ariaLabel", value)}
        />
      </Panel>
    </div>
  );
}

function SlidePanel({
  slide,
  uploading,
  onUpdate,
  onImageUpload,
  onVideoUpload,
  onOpenImagePicker,
  onOpenVideoPicker,
}: {
  slide: HeroSlide;
  uploading: boolean;
  onUpdate: (mutator: (slide: HeroSlide) => void) => void;
  onImageUpload: (
    event: ChangeEvent<HTMLInputElement>,
    target: MediaTarget,
  ) => void;
  onVideoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenImagePicker: (target: MediaTarget) => void;
  onOpenVideoPicker: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Slide">
        <TextField
          label="Slide name"
          value={slide.name}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.name = value;
            })
          }
        />
      </Panel>

      <Panel title="Background Image">
        <TextField
          label="Image URL"
          value={slide.image.src}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.image.src = value;
            })
          }
        />
        <TextField
          label="Alt text"
          value={slide.image.alt}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.image.alt = value;
            })
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onOpenImagePicker({ kind: "slide-image", slideId: slide.id })
            }
          >
            <ImageIcon className="h-4 w-4" />
            Media Library
          </Button>
          <UploadButton
            accept="image/*"
            disabled={uploading}
            onChange={(event) =>
              onImageUpload(event, {
                kind: "slide-image",
                slideId: slide.id,
              })
            }
          />
        </div>
        <TextField
          label="Tablet image URL"
          value={slide.image.tabletSrc ?? ""}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.image.tabletSrc = value;
            })
          }
        />
        <TextField
          label="Mobile image URL"
          value={slide.image.mobileSrc ?? ""}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.image.mobileSrc = value;
            })
          }
        />
      </Panel>

      <Panel title="Background Video">
        <TextField
          label="Video URL"
          value={slide.video.src}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.video.src = value;
            })
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenVideoPicker}
          >
            <Film className="h-4 w-4" />
            Media Library
          </Button>
          <UploadButton
            accept="video/mp4,video/webm,video/quicktime"
            disabled={uploading}
            onChange={onVideoUpload}
          />
        </div>
        <TextField
          label="Poster image"
          value={slide.video.poster}
          onChange={(value) =>
            onUpdate((draft) => {
              draft.video.poster = value;
            })
          }
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onOpenImagePicker({ kind: "slide-poster", slideId: slide.id })
          }
        >
          <ImageIcon className="h-4 w-4" />
          Choose poster
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <SwitchField
            label="Autoplay"
            checked={slide.video.autoplay}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.video.autoplay = value;
              })
            }
          />
          <SwitchField
            label="Loop"
            checked={slide.video.loop}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.video.loop = value;
              })
            }
          />
          <SwitchField
            label="Muted"
            checked={slide.video.muted}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.video.muted = value;
              })
            }
          />
        </div>
      </Panel>

      <Panel title="Layout Controls">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Content width">
            <Select
              value={slide.layout.contentWidth}
              onValueChange={(value) =>
                onUpdate((draft) => {
                  draft.layout.contentWidth = value as "contained" | "full";
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contained">Contained</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <TextField
            label="Max width"
            value={slide.layout.maxWidth}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layout.maxWidth = value;
              })
            }
          />
          <AlignSelect
            label="Horizontal alignment"
            value={slide.layout.horizontalAlign}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layout.horizontalAlign = value;
              })
            }
          />
          <Field label="Vertical alignment">
            <Select
              value={slide.layout.verticalAlign}
              onValueChange={(value) =>
                onUpdate((draft) => {
                  draft.layout.verticalAlign = value as
                    | "top"
                    | "center"
                    | "bottom";
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <AlignSelect
            label="Text alignment"
            value={slide.layout.textAlign}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layout.textAlign = value;
              })
            }
          />
          <TextField
            label="Padding"
            value={slide.layout.padding}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layout.padding = value;
              })
            }
          />
          <TextField
            label="Margin"
            value={slide.layout.margin}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layout.margin = value;
              })
            }
          />
        </div>
      </Panel>

      <Panel title="Layers">
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label="Background"
            value={slide.layers.backgroundZIndex}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layers.backgroundZIndex = value;
              })
            }
          />
          <NumberField
            label="Overlay"
            value={slide.layers.overlayZIndex}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layers.overlayZIndex = value;
              })
            }
          />
          <NumberField
            label="Content"
            value={slide.layers.contentZIndex}
            onChange={(value) =>
              onUpdate((draft) => {
                draft.layers.contentZIndex = value;
              })
            }
          />
        </div>
      </Panel>

      <Panel title="Responsive Controls">
        <div className="grid gap-3 md:grid-cols-3">
          {BREAKPOINTS.map((breakpoint) => (
            <div key={breakpoint} className="space-y-2 rounded-md border p-2">
              <SwitchField
                label={`Hide ${breakpoint}`}
                checked={!!slide.responsive[breakpoint].hidden}
                onChange={(value) =>
                  onUpdate((draft) => {
                    draft.responsive[breakpoint].hidden = value;
                  })
                }
              />
              <TextField
                label="Max width"
                value={slide.responsive[breakpoint].maxWidth ?? ""}
                onChange={(value) =>
                  onUpdate((draft) => {
                    draft.responsive[breakpoint].maxWidth = value;
                  })
                }
              />
              <TextField
                label="Padding"
                value={slide.responsive[breakpoint].padding ?? ""}
                onChange={(value) =>
                  onUpdate((draft) => {
                    draft.responsive[breakpoint].padding = value;
                  })
                }
              />
              <AlignSelect
                label="Text"
                value={slide.responsive[breakpoint].textAlign ?? "left"}
                onChange={(value) =>
                  onUpdate((draft) => {
                    draft.responsive[breakpoint].textAlign = value;
                  })
                }
              />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BlockEditorList({
  blocks,
  onChange,
  onOpenImagePicker,
}: {
  blocks: HeroSlideBlock[];
  onChange: (blocks: HeroSlideBlock[]) => void;
  onOpenImagePicker: (blockId: string) => void;
}) {
  function updateBlock(blockId: string, next: HeroSlideBlock) {
    onChange(blocks.map((block) => (block.id === blockId ? next : block)));
  }
  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(nextIndex, 0, block);
    onChange(next);
  }
  function duplicateBlock(block: HeroSlideBlock, index: number) {
    const next = [...blocks];
    next.splice(index + 1, 0, remapBlockIds(clone(block)));
    onChange(next);
  }
  function deleteBlock(blockId: string) {
    onChange(blocks.filter((block) => block.id !== blockId));
  }

  if (blocks.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No slide content blocks.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <BlockEditor
          key={block.id}
          block={block}
          onChange={(next) => updateBlock(block.id, next)}
          onMoveUp={() => moveBlock(index, -1)}
          onMoveDown={() => moveBlock(index, 1)}
          onDuplicate={() => duplicateBlock(block, index)}
          onDelete={() => deleteBlock(block.id)}
          onOpenImagePicker={onOpenImagePicker}
        />
      ))}
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onOpenImagePicker,
}: {
  block: HeroSlideBlock;
  onChange: (block: HeroSlideBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenImagePicker: (blockId: string) => void;
}) {
  function setProp(key: string, value: unknown) {
    onChange({ ...block, props: { ...block.props, [key]: value } });
  }
  function toggleHidden(breakpoint: HeroSliderBreakpoint, checked: boolean) {
    const current = block.hiddenOn ?? [];
    onChange({
      ...block,
      hiddenOn: checked
        ? Array.from(new Set([...current, breakpoint]))
        : current.filter((item) => item !== breakpoint),
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{blockLabel(block.type)}</Badge>
        <div className="flex-1" />
        <IconButton label="Move up" onClick={onMoveUp}>
          <ArrowUp className="h-4 w-4" />
        </IconButton>
        <IconButton label="Move down" onClick={onMoveDown}>
          <ArrowDown className="h-4 w-4" />
        </IconButton>
        <IconButton label="Duplicate" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </IconButton>
        <IconButton label="Delete" onClick={onDelete} destructive>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex flex-wrap gap-3">
        {BREAKPOINTS.map((breakpoint) => (
          <label key={breakpoint} className="flex items-center gap-2 text-xs">
            <Switch
              checked={block.hiddenOn?.includes(breakpoint) ?? false}
              onCheckedChange={(value) => toggleHidden(breakpoint, !!value)}
            />
            Hide {breakpoint}
          </label>
        ))}
      </div>

      <BlockFields
        block={block}
        setProp={setProp}
        onChange={onChange}
        onOpenImagePicker={onOpenImagePicker}
      />
    </div>
  );
}

function BlockFields({
  block,
  setProp,
  onChange,
  onOpenImagePicker,
}: {
  block: HeroSlideBlock;
  setProp: (key: string, value: unknown) => void;
  onChange: (block: HeroSlideBlock) => void;
  onOpenImagePicker: (blockId: string) => void;
}) {
  const props = block.props;

  if (block.type === "heading") {
    return (
      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
        <TextField
          label="Heading"
          value={stringProp(props.text)}
          onChange={(value) => setProp("text", value)}
        />
        <Field label="Level">
          <Select
            value={stringProp(props.level, "1")}
            onValueChange={(value) => setProp("level", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">H1</SelectItem>
              <SelectItem value="2">H2</SelectItem>
              <SelectItem value="3">H3</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <Field label="Text">
        <Textarea
          value={stringProp(props.text)}
          onChange={(event) => setProp("text", event.target.value)}
          rows={3}
        />
      </Field>
    );
  }

  if (block.type === "button") {
    return (
      <ButtonFields
        label={stringProp(props.label)}
        href={stringProp(props.href, "#")}
        variant={stringProp(props.variant, "primary")}
        onChange={(patch) => {
          for (const [key, value] of Object.entries(patch)) setProp(key, value);
        }}
      />
    );
  }

  if (block.type === "image") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          label="Image URL"
          value={stringProp(props.src)}
          onChange={(value) => setProp("src", value)}
        />
        <TextField
          label="Alt text"
          value={stringProp(props.alt)}
          onChange={(value) => setProp("alt", value)}
        />
        <TextField
          label="Width"
          value={stringProp(props.width, "360px")}
          onChange={(value) => setProp("width", value)}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenImagePicker(block.id)}
          >
            <ImageIcon className="h-4 w-4" />
            Choose image
          </Button>
        </div>
      </div>
    );
  }

  if (block.type === "card") {
    return (
      <div className="space-y-2">
        <TextField
          label="Title"
          value={stringProp(props.title)}
          onChange={(value) => setProp("title", value)}
        />
        <Field label="Body">
          <Textarea
            value={stringProp(props.body)}
            onChange={(event) => setProp("body", event.target.value)}
            rows={3}
          />
        </Field>
      </div>
    );
  }

  if (block.type === "badge") {
    return (
      <TextField
        label="Badge text"
        value={stringProp(props.text)}
        onChange={(value) => setProp("text", value)}
      />
    );
  }

  if (block.type === "divider") {
    return (
      <TextField
        label="Width"
        value={stringProp(props.width, "96px")}
        onChange={(value) => setProp("width", value)}
      />
    );
  }

  if (block.type === "icon") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Icon">
          <Select
            value={stringProp(props.icon, "sparkles")}
            onValueChange={(value) => setProp("icon", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sparkles">Sparkles</SelectItem>
              <SelectItem value="star">Star</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="play">Play</SelectItem>
              <SelectItem value="zap">Zap</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <TextField
          label="Label"
          value={stringProp(props.label)}
          onChange={(value) => setProp("label", value)}
        />
      </div>
    );
  }

  if (block.type === "cta_group") {
    const items = Array.isArray(props.items) ? props.items : [];
    return (
      <div className="space-y-2">
        {items.map((item, index) => {
          const value = isRecord(item) ? item : {};
          return (
            <div
              key={index}
              className="grid gap-2 rounded border p-2 sm:grid-cols-[1fr_1fr_130px_auto]"
            >
              <Input
                value={stringProp(value.label)}
                onChange={(event) =>
                  updateCtaItem(
                    items,
                    index,
                    { label: event.target.value },
                    setProp,
                  )
                }
                placeholder="Label"
              />
              <Input
                value={stringProp(value.href, "#")}
                onChange={(event) =>
                  updateCtaItem(
                    items,
                    index,
                    { href: event.target.value },
                    setProp,
                  )
                }
                placeholder="URL"
              />
              <Select
                value={stringProp(value.variant, "primary")}
                onValueChange={(variant) =>
                  updateCtaItem(items, index, { variant }, setProp)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
              <IconButton
                label="Remove CTA"
                onClick={() =>
                  setProp(
                    "items",
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                destructive
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setProp("items", [
              ...items,
              { label: "New CTA", href: "#", variant: "secondary" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add CTA
        </Button>
      </div>
    );
  }

  if (block.type === "custom_html") {
    return (
      <Field label="HTML">
        <Textarea
          value={stringProp(props.html)}
          onChange={(event) => setProp("html", event.target.value)}
          rows={5}
          className="font-mono text-xs"
        />
      </Field>
    );
  }

  if (block.type === "container") {
    return (
      <div className="space-y-3">
        <TextField
          label="Gap"
          value={stringProp(props.gap, "1rem")}
          onChange={(value) => setProp("gap", value)}
        />
        <NestedBlocks
          blocks={block.children ?? []}
          onChange={(children) => onChange({ ...block, children })}
          onOpenImagePicker={onOpenImagePicker}
        />
      </div>
    );
  }

  if (block.type === "columns") {
    return (
      <div className="space-y-3">
        <TextField
          label="Gap"
          value={stringProp(props.gap, "1.5rem")}
          onChange={(value) => setProp("gap", value)}
        />
        {(block.columns ?? [[], []]).map((column, index) => (
          <div key={index} className="space-y-2 rounded-md border p-2">
            <Label className="text-xs">Column {index + 1}</Label>
            <NestedBlocks
              blocks={column}
              onChange={(nextColumn) => {
                const columns = [...(block.columns ?? [[], []])];
                columns[index] = nextColumn;
                onChange({ ...block, columns });
              }}
              onOpenImagePicker={onOpenImagePicker}
            />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function NestedBlocks({
  blocks,
  onChange,
  onOpenImagePicker,
}: {
  blocks: HeroSlideBlock[];
  onChange: (blocks: HeroSlideBlock[]) => void;
  onOpenImagePicker: (blockId: string) => void;
}) {
  const [type, setType] = useState<HeroSlideBlockType>("text");
  return (
    <div className="space-y-2">
      <BlockEditorList
        blocks={blocks}
        onChange={onChange}
        onOpenImagePicker={onOpenImagePicker}
      />
      <div className="flex gap-2">
        <Select
          value={type}
          onValueChange={(value) => setType(value as HeroSlideBlockType)}
        >
          <SelectTrigger className="max-w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HERO_SLIDE_BLOCK_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...blocks, createHeroSlideBlock(type)])}
        >
          <Plus className="h-4 w-4" />
          Add nested block
        </Button>
      </div>
    </div>
  );
}

function ButtonFields({
  label,
  href,
  variant,
  onChange,
}: {
  label: string;
  href: string;
  variant: string;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px]">
      <TextField
        label="Label"
        value={label}
        onChange={(value) => onChange({ label: value })}
      />
      <TextField
        label="URL"
        value={href}
        onChange={(value) => onChange({ href: value })}
      />
      <Field label="Variant">
        <Select
          value={variant}
          onValueChange={(value) => onChange({ variant: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Field label={suffix ? `${label} (${suffix})` : label}>
      <Input
        type="number"
        value={String(value)}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
      />
    </Field>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function AlignSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "left" | "center" | "right";
  onChange: (value: "left" | "center" | "right") => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(next) => onChange(next as never)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function UploadButton({
  accept,
  disabled,
  onChange,
}: {
  accept: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const reactId = useId();
  const inputId = `upload-${reactId}`;

  return (
    <label htmlFor={inputId}>
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={onChange}
      />
      <span
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition hover:bg-accent",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="h-4 w-4" />
        Upload
      </span>
    </label>
  );
}

function IconButton({
  label,
  children,
  onClick,
  destructive = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={destructive ? "destructive" : "outline"}
      size="icon-sm"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function updateCtaItem(
  items: unknown[],
  index: number,
  patch: Record<string, unknown>,
  setProp: (key: string, value: unknown) => void,
) {
  setProp(
    "items",
    items.map((item, itemIndex) =>
      itemIndex === index
        ? { ...(isRecord(item) ? item : {}), ...patch }
        : item,
    ),
  );
}

function remapSlideIds(slide: HeroSlide): HeroSlide {
  return {
    ...slide,
    id: makeHeroSliderId("slide"),
    blocks: slide.blocks.map(remapBlockIds),
  };
}

function remapBlockIds(block: HeroSlideBlock): HeroSlideBlock {
  return {
    ...block,
    id: makeHeroSliderId("block"),
    children: block.children?.map(remapBlockIds),
    columns: block.columns?.map((column) => column.map(remapBlockIds)),
  };
}

function mapBlocksDeep(
  blocks: HeroSlideBlock[],
  mapper: (block: HeroSlideBlock) => HeroSlideBlock,
): HeroSlideBlock[] {
  return blocks.map((block) => {
    const next = mapper(block);
    return {
      ...next,
      children: next.children
        ? mapBlocksDeep(next.children, mapper)
        : undefined,
      columns: next.columns
        ? next.columns.map((column) => mapBlocksDeep(column, mapper))
        : undefined,
    };
  });
}

function blockLabel(type: HeroSlideBlockType) {
  return (
    HERO_SLIDE_BLOCK_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

function stringProp(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
