"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Play,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  normalizeHeroSliderContent,
  type HeroSlide,
  type HeroSlideBlock,
  type HeroSliderBreakpoint,
  type HeroSliderContent,
} from "@/lib/hero-slider";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import {
  isSafeCssValue,
  sanitizeHref,
  sanitizeMediaSrc,
} from "@/lib/url-safety";
import { cn } from "@/lib/utils";

type Props = {
  data: unknown;
  label?: string;
  preview?: boolean;
};

const blockVisibilityCss = `
@media (max-width: 767px) {
  .hero-slider-block[data-hide-mobile="true"] { display: none !important; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .hero-slider-block[data-hide-tablet="true"] { display: none !important; }
}
@media (min-width: 1024px) {
  .hero-slider-block[data-hide-desktop="true"] { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-slider-motion { transition: none !important; animation: none !important; }
}
`;

export function HeroSliderRenderer({ data, label, preview = false }: Props) {
  const slider = useMemo(() => normalizeHeroSliderContent(data), [data]);
  const settings = slider.settings;
  const slides = slider.slides;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ x: number; pointerType: string } | null>(
    null,
  );
  const slideCount = slides.length;
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, slideCount - 1));

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !settings.pauseWhenNotVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? true),
      { threshold: 0.25 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [settings.pauseWhenNotVisible]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (slideCount <= 0) return;
      if (settings.infiniteLoop) {
        setActiveIndex((nextIndex + slideCount) % slideCount);
        return;
      }
      setActiveIndex(Math.max(0, Math.min(slideCount - 1, nextIndex)));
    },
    [settings.infiniteLoop, slideCount],
  );

  const goNext = useCallback(() => {
    if (!settings.infiniteLoop && safeActiveIndex >= slideCount - 1) return;
    goTo(safeActiveIndex + 1);
  }, [goTo, safeActiveIndex, settings.infiniteLoop, slideCount]);

  const goPrev = useCallback(() => {
    if (!settings.infiniteLoop && safeActiveIndex <= 0) return;
    goTo(safeActiveIndex - 1);
  }, [goTo, safeActiveIndex, settings.infiniteLoop]);

  useEffect(() => {
    const pausedByHover = settings.pauseOnHover && hovered;
    const pausedByVisibility = settings.pauseWhenNotVisible && !isVisible;
    const shouldAutoplay =
      settings.autoplay &&
      !preview &&
      !reducedMotion &&
      slideCount > 1 &&
      !pausedByHover &&
      !pausedByVisibility;
    if (!shouldAutoplay) return;
    if (!settings.infiniteLoop && safeActiveIndex >= slideCount - 1) return;

    const timer = window.setTimeout(goNext, settings.autoplayDelayMs);
    return () => window.clearTimeout(timer);
  }, [
    goNext,
    hovered,
    isVisible,
    preview,
    reducedMotion,
    safeActiveIndex,
    settings.autoplay,
    settings.autoplayDelayMs,
    settings.infiniteLoop,
    settings.pauseOnHover,
    settings.pauseWhenNotVisible,
    slideCount,
  ]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!settings.keyboardNavigation || slideCount <= 1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
    if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      goTo(slideCount - 1);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType === "mouse"
        ? !settings.mouseDragSupport
        : !settings.swipeSupport
    ) {
      return;
    }
    pointerStartRef.current = {
      x: event.clientX,
      pointerType: event.pointerType,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goNext();
    else goPrev();
  }

  const rootStyle = buildRootStyle(slider);
  const trackStyle = buildTrackStyle(slider, safeActiveIndex, reducedMotion);
  const describedBy = `${settings.ariaLabel || "hero-slider"}-status`;
  const canGoPrev = settings.infiniteLoop || safeActiveIndex > 0;
  const canGoNext = settings.infiniteLoop || safeActiveIndex < slideCount - 1;

  return (
    <section
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label || settings.ariaLabel}
      aria-describedby={describedBy}
      tabIndex={settings.keyboardNavigation ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={rootStyle}
      className={cn(
        "relative isolate overflow-hidden bg-black text-white outline-none focus-visible:ring-2 focus-visible:ring-ring",
        settings.fullWidth && !preview
          ? "left-1/2 right-1/2 -ml-[50vw] w-screen"
          : "w-full",
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: blockVisibilityCss }} />
      <p id={describedBy} className="sr-only" aria-live="polite">
        Slide {safeActiveIndex + 1} of {slideCount}
      </p>

      {settings.transitionType === "slide" ? (
        <div
          className="hero-slider-motion flex h-full w-full"
          style={trackStyle}
        >
          {slides.map((slide, index) => (
            <SlideView
              key={slide.id}
              slide={slide}
              settings={slider.settings}
              active={index === safeActiveIndex}
              index={index}
              total={slideCount}
            />
          ))}
        </div>
      ) : (
        slides.map((slide, index) => (
          <div
            key={slide.id}
            className="hero-slider-motion absolute inset-0"
            style={{
              opacity: index === safeActiveIndex ? 1 : 0,
              pointerEvents: index === safeActiveIndex ? "auto" : "none",
              transition: reducedMotion
                ? "none"
                : `opacity ${settings.transitionSpeedMs}ms ease`,
            }}
          >
            <SlideView
              slide={slide}
              settings={slider.settings}
              active={index === safeActiveIndex}
              index={index}
              total={slideCount}
            />
          </div>
        ))
      )}

      {settings.showArrows && slideCount > 1 ? (
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-30 flex -translate-y-1/2 justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canGoPrev}
            className="pointer-events-auto rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canGoNext}
            className="pointer-events-auto rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
            onClick={goNext}
            aria-label="Next slide"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {settings.showDots && slideCount > 1 ? (
        <div
          className="absolute inset-x-0 bottom-4 z-30 flex justify-center gap-2 px-4"
          role="tablist"
          aria-label="Hero slider slides"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === safeActiveIndex}
              aria-label={`Show ${slide.name || `slide ${index + 1}`}`}
              className={cn(
                "h-2.5 rounded-full border border-white/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                index === safeActiveIndex
                  ? "w-8 bg-white"
                  : "w-2.5 bg-white/30 hover:bg-white/60",
              )}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SlideView({
  slide,
  settings,
  active,
  index,
  total,
}: {
  slide: HeroSlide;
  settings: HeroSliderContent["settings"];
  active: boolean;
  index: number;
  total: number;
}) {
  const contentStyle = slideContentStyle(slide);
  const contentClass = contentAlignmentClass(slide);
  const responsiveCss = buildSlideResponsiveCss(slide);

  return (
    <article
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${slide.name || "Slide"}`}
      aria-hidden={!active}
      className={cn(
        "relative h-full w-full shrink-0 overflow-hidden",
        responsiveSlideHideClass(slide),
      )}
    >
      {responsiveCss ? (
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      ) : null}
      <SlideBackground slide={slide} active={active} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          zIndex: slide.layers.overlayZIndex,
          backgroundColor: safeCss(settings.overlayColor, "#000000"),
          opacity: settings.overlayOpacity,
        }}
      />
      <div
        className={cn(
          "relative mx-auto flex h-full w-full",
          contentClass,
          `hero-slide-content-${cssScope(slide.id)}`,
        )}
        style={{
          ...contentStyle,
          zIndex: slide.layers.contentZIndex,
        }}
      >
        <div className="hero-slider-content-stack flex min-w-0 flex-col gap-4">
          {slide.blocks.map((block) => (
            <HeroBlock key={block.id} block={block} />
          ))}
        </div>
      </div>
    </article>
  );
}

function SlideBackground({
  slide,
  active,
}: {
  slide: HeroSlide;
  active: boolean;
}) {
  const imageSrc = sanitizeMediaSrc(slide.image.src);
  const tabletSrc = sanitizeMediaSrc(slide.image.tabletSrc);
  const mobileSrc = sanitizeMediaSrc(slide.image.mobileSrc);
  const videoSrc = sanitizeMediaSrc(slide.video.src);
  const poster = sanitizeMediaSrc(slide.video.poster || slide.image.src);

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: slide.layers.backgroundZIndex }}
      aria-hidden
    >
      {imageSrc ? (
        <picture>
          {mobileSrc ? (
            <source media="(max-width: 767px)" srcSet={mobileSrc} />
          ) : null}
          {tabletSrc ? (
            <source media="(max-width: 1023px)" srcSet={tabletSrc} />
          ) : null}
          <img
            src={imageSrc}
            alt={slide.image.alt}
            loading={active ? "eager" : "lazy"}
            fetchPriority={active ? "high" : "auto"}
            className="h-full w-full object-cover"
          />
        </picture>
      ) : (
        <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.28),transparent_28%),linear-gradient(135deg,#111827,#334155_48%,#0f766e)]" />
      )}
      {videoSrc && active ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          poster={poster || undefined}
          autoPlay={slide.video.autoplay}
          loop={slide.video.loop}
          muted={slide.video.muted}
          playsInline
          preload="metadata"
        />
      ) : null}
    </div>
  );
}

function HeroBlock({ block }: { block: HeroSlideBlock }) {
  const hidden: Record<string, string | undefined> = {
    "data-hide-desktop": boolAttr(block.hiddenOn?.includes("desktop")),
    "data-hide-tablet": boolAttr(block.hiddenOn?.includes("tablet")),
    "data-hide-mobile": boolAttr(block.hiddenOn?.includes("mobile")),
  };
  return (
    <div className="hero-slider-block" {...hidden}>
      {renderBlock(block)}
    </div>
  );
}

function renderBlock(block: HeroSlideBlock): ReactNode {
  const props = block.props;

  if (block.type === "heading") {
    const level =
      props.level === "2" || props.level === "3" ? props.level : "1";
    const Tag = `h${level}` as "h1" | "h2" | "h3";
    return (
      <Tag className="max-w-[18ch] text-balance text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
        {textProp(props.text, "Hero heading")}
      </Tag>
    );
  }

  if (block.type === "text") {
    return (
      <p className="max-w-2xl text-base leading-7 text-white/88 sm:text-lg">
        {textProp(props.text, "")}
      </p>
    );
  }

  if (block.type === "button") {
    return <HeroButton item={props} />;
  }

  if (block.type === "image") {
    const src = sanitizeMediaSrc(props.src);
    if (!src) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={textProp(props.alt, "")}
        loading="lazy"
        className="max-w-full rounded-md border border-white/15 object-contain shadow-2xl"
        style={{ width: safeCss(props.width, "360px") }}
      />
    );
  }

  if (block.type === "card") {
    return (
      <div className="max-w-sm rounded-md border border-white/20 bg-white/12 p-5 text-left shadow-2xl backdrop-blur">
        <h3 className="text-lg font-semibold">
          {textProp(props.title, "Card")}
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/82">
          {textProp(props.body, "")}
        </p>
      </div>
    );
  }

  if (block.type === "badge") {
    return (
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-medium uppercase text-white/90 backdrop-blur">
        <Sparkles className="h-3.5 w-3.5" />
        {textProp(props.text, "Featured")}
      </span>
    );
  }

  if (block.type === "divider") {
    return (
      <hr
        className="border-white/50"
        style={{ width: safeCss(props.width, "96px") }}
      />
    );
  }

  if (block.type === "icon") {
    return (
      <span className="inline-flex w-fit items-center gap-2 text-white">
        <HeroIcon name={textProp(props.icon, "sparkles")} />
        {props.label ? <span>{textProp(props.label, "")}</span> : null}
      </span>
    );
  }

  if (block.type === "cta_group") {
    const items = Array.isArray(props.items) ? props.items : [];
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item, index) => (
          <HeroButton key={index} item={item} />
        ))}
      </div>
    );
  }

  if (block.type === "custom_html") {
    return (
      <div
        className="max-w-2xl"
        dangerouslySetInnerHTML={{
          __html: sanitizeCmsHtml(textProp(props.html, "")),
        }}
      />
    );
  }

  if (block.type === "container") {
    return (
      <div
        className="flex flex-col"
        style={{ gap: safeCss(props.gap, "1rem") }}
      >
        {(block.children ?? []).map((child) => (
          <HeroBlock key={child.id} block={child} />
        ))}
      </div>
    );
  }

  if (block.type === "columns") {
    return (
      <div
        className="grid gap-4 md:grid-cols-2"
        style={{ gap: safeCss(props.gap, "1.5rem") }}
      >
        {(block.columns ?? []).map((column, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-3">
            {column.map((child) => (
              <HeroBlock key={child.id} block={child} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function HeroButton({ item }: { item: unknown }) {
  const props =
    typeof item === "object" && item !== null
      ? (item as Record<string, unknown>)
      : {};
  const variant = props.variant === "secondary" ? "secondary" : "primary";
  return (
    <a
      href={sanitizeHref(props.href)}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        variant === "primary"
          ? "bg-white text-slate-950 hover:bg-white/90"
          : "border border-white/35 bg-white/10 text-white hover:bg-white/18",
      )}
    >
      {textProp(props.label, "Learn more")}
    </a>
  );
}

function HeroIcon({ name }: { name: string }) {
  const className = "h-7 w-7";
  if (name === "star") return <Star className={className} />;
  if (name === "check") return <CheckCircle2 className={className} />;
  if (name === "play") return <Play className={className} />;
  if (name === "zap") return <Zap className={className} />;
  return <Sparkles className={className} />;
}

function buildRootStyle(slider: HeroSliderContent): CSSProperties {
  const height = slider.settings.fullHeight
    ? "100vh"
    : safeCss(slider.settings.customHeight, "620px");
  return {
    minHeight: height,
    height,
  };
}

function buildTrackStyle(
  slider: HeroSliderContent,
  activeIndex: number,
  reducedMotion: boolean,
): CSSProperties {
  return {
    transform: `translate3d(${-activeIndex * 100}%, 0, 0)`,
    transition: reducedMotion
      ? "none"
      : `transform ${slider.settings.transitionSpeedMs}ms ease`,
    willChange: reducedMotion ? undefined : "transform",
  };
}

function slideContentStyle(slide: HeroSlide): CSSProperties {
  const layout = slide.layout;
  return {
    maxWidth: layout.contentWidth === "full" ? "100%" : "min(100%, 1180px)",
    padding: safeCss(layout.padding, defaultPadding()),
    margin: safeCss(layout.margin, "0 auto"),
    textAlign: layout.textAlign,
  };
}

function contentAlignmentClass(slide: HeroSlide) {
  const x: Record<HeroSlide["layout"]["horizontalAlign"], string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };
  const y: Record<HeroSlide["layout"]["verticalAlign"], string> = {
    top: "items-start",
    center: "items-center",
    bottom: "items-end",
  };
  return cn(x[slide.layout.horizontalAlign], y[slide.layout.verticalAlign]);
}

function buildSlideResponsiveCss(slide: HeroSlide) {
  const scope = cssScope(slide.id);
  const baseMax = safeCss(slide.layout.maxWidth, "720px");
  const tablet = slide.responsive.tablet;
  const mobile = slide.responsive.mobile;
  return `
.hero-slide-content-${scope} .hero-slider-content-stack { max-width: ${baseMax}; }
@media (max-width: 1023px) {
  .hero-slide-content-${scope} .hero-slider-content-stack {
    ${tablet.maxWidth ? `max-width: ${safeCss(tablet.maxWidth, baseMax)};` : ""}
    ${tablet.padding ? `padding: ${safeCss(tablet.padding, "0")};` : ""}
    ${tablet.textAlign ? `text-align: ${tablet.textAlign};` : ""}
  }
}
@media (max-width: 767px) {
  .hero-slide-content-${scope} .hero-slider-content-stack {
    ${mobile.maxWidth ? `max-width: ${safeCss(mobile.maxWidth, "100%")};` : ""}
    ${mobile.padding ? `padding: ${safeCss(mobile.padding, "0")};` : ""}
    ${mobile.textAlign ? `text-align: ${mobile.textAlign};` : ""}
  }
}
`;
}

function responsiveSlideHideClass(slide: HeroSlide) {
  const hidden: HeroSliderBreakpoint[] = [];
  if (slide.responsive.desktop.hidden) hidden.push("desktop");
  if (slide.responsive.tablet.hidden) hidden.push("tablet");
  if (slide.responsive.mobile.hidden) hidden.push("mobile");
  return cn(
    hidden.includes("desktop") && "lg:hidden",
    hidden.includes("tablet") && "md:max-lg:hidden",
    hidden.includes("mobile") && "max-md:hidden",
  );
}

function boolAttr(value: boolean | undefined) {
  return value ? "true" : undefined;
}

function textProp(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function safeCss(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  if (!next || !isSafeCssValue(next)) return fallback;
  return next;
}

function cssScope(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

function defaultPadding() {
  return "clamp(3rem, 8vw, 7rem) clamp(1.25rem, 6vw, 5rem)";
}
