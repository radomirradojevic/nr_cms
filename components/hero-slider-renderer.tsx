"use client";

import { Show, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Menu as MenuIcon,
  Play,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { UserButtonClient } from "@/components/user-button-client";
import {
  collectHeroSliderMenuIds,
  createHeroSlideMenuPresetProps,
  createHeroSlideSearchInputPresetProps,
  normalizeHeroSliderContent,
  type HeroSlide,
  type HeroSlideBlock,
  type HeroSlideMenu,
  type HeroSlideSearchInput,
  type HeroSliderBreakpoint,
  type HeroSliderContent,
} from "@/lib/hero-slider";
import { SiteSearch, type SearchContentType } from "@/components/site-search";
import type { TopMenuTreeNode } from "@/data/top-menu";
import { getBackendMenuTree } from "@/lib/backend-menu";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getRoles, hasRole } from "@/lib/roles";
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
  allowViewportWidth?: boolean;
  initialMenuTrees?: HeroSliderMenuTrees;
  fallbackIsBackendUser?: boolean;
  fallbackIsAdmin?: boolean;
  hasLicenseServerShell?: boolean;
  hasWebshopShell?: boolean;
};

type HeroSliderMenuTrees = Record<string, TopMenuTreeNode[]>;
type HeroMenuRuntimeAuth = {
  fallbackIsBackendUser: boolean;
  fallbackIsAdmin: boolean;
  hasLicenseServerShell: boolean;
  hasWebshopShell: boolean;
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

export function HeroSliderRenderer({
  data,
  label,
  preview = false,
  allowViewportWidth = true,
  initialMenuTrees,
  fallbackIsBackendUser = false,
  fallbackIsAdmin = false,
  hasLicenseServerShell = false,
  hasWebshopShell = false,
}: Props) {
  const t = useTranslations();
  const slider = useMemo(() => normalizeHeroSliderContent(data), [data]);
  const settings = slider.settings;
  const slides = slider.slides;
  const menuIds = useMemo(() => collectHeroSliderMenuIds(slider), [slider]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [menuTrees, setMenuTrees] = useState<HeroSliderMenuTrees>(
    () => initialMenuTrees ?? {},
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ x: number; pointerType: string } | null>(
    null,
  );
  const runtimeAuth: HeroMenuRuntimeAuth = {
    fallbackIsBackendUser,
    fallbackIsAdmin,
    hasLicenseServerShell,
    hasWebshopShell,
  };
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
    const missing = menuIds.filter((id) => !menuTrees[id]);
    if (missing.length === 0) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    for (const id of missing) params.append("id", id);

    async function loadMenus() {
      try {
        const response = await fetch(`/api/hero-slider-menus?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as {
          menus?: HeroSliderMenuTrees;
        } | null;
        if (!payload?.menus) return;
        setMenuTrees((current) => ({ ...current, ...payload.menus }));
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("[HeroSliderRenderer] menu load failed", err);
        }
      }
    }

    void loadMenus();
    return () => controller.abort();
  }, [menuIds, menuTrees]);

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
        settings.fullWidth && !preview && allowViewportWidth
          ? "left-1/2 right-1/2 -ml-[50vw] w-screen"
          : "w-full",
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: blockVisibilityCss }} />
      <p id={describedBy} className="sr-only" aria-live="polite">
        {t("public.heroSlider.status", {
          current: safeActiveIndex + 1,
          total: slideCount,
        })}
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
              menuTrees={menuTrees}
              runtimeAuth={runtimeAuth}
              active={index === safeActiveIndex}
              index={index}
              total={slideCount}
              t={t}
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
              menuTrees={menuTrees}
              runtimeAuth={runtimeAuth}
              active={index === safeActiveIndex}
              index={index}
              total={slideCount}
              t={t}
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
            aria-label={t("public.heroSlider.previousSlide")}
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
            aria-label={t("public.heroSlider.nextSlide")}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {settings.showDots && slideCount > 1 ? (
        <div
          className="absolute inset-x-0 bottom-4 z-30 flex justify-center gap-2 px-4"
          role="tablist"
          aria-label={t("public.heroSlider.slides")}
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === safeActiveIndex}
              aria-label={t("public.heroSlider.showSlide", {
                name:
                  slide.name ||
                  t("public.heroSlider.slideFallback", {
                    index: index + 1,
                  }),
              })}
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
  menuTrees,
  runtimeAuth,
  active,
  index,
  total,
  t,
}: {
  slide: HeroSlide;
  settings: HeroSliderContent["settings"];
  menuTrees: HeroSliderMenuTrees;
  runtimeAuth: HeroMenuRuntimeAuth;
  active: boolean;
  index: number;
  total: number;
  t: TranslateFn;
}) {
  const contentStyle = slideContentStyle(slide);
  const contentClass = contentAlignmentClass(slide);
  const responsiveCss = buildSlideResponsiveCss(slide);

  return (
    <article
      role="group"
      aria-roledescription="slide"
      aria-label={t("public.heroSlider.slideLabel", {
        index: index + 1,
        total,
        name: slide.name || t("public.heroSlider.fallbackSlideName"),
      })}
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
            <HeroBlock
              key={block.id}
              block={block}
              menuTrees={menuTrees}
              runtimeAuth={runtimeAuth}
            />
          ))}
        </div>
      </div>
      <SlideFloatingElementsLayer
        slide={slide}
        menuTrees={menuTrees}
        runtimeAuth={runtimeAuth}
      />
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

function HeroBlock({
  block,
  menuTrees,
  runtimeAuth,
}: {
  block: HeroSlideBlock;
  menuTrees: HeroSliderMenuTrees;
  runtimeAuth: HeroMenuRuntimeAuth;
}) {
  const hidden: Record<string, string | undefined> = {
    "data-hide-desktop": boolAttr(block.hiddenOn?.includes("desktop")),
    "data-hide-tablet": boolAttr(block.hiddenOn?.includes("tablet")),
    "data-hide-mobile": boolAttr(block.hiddenOn?.includes("mobile")),
  };
  return (
    <div
      className={cn("hero-slider-block", block.type === "menu" && "min-w-0")}
      style={block.type === "menu" ? menuWrapperStyle(block.props) : undefined}
      {...hidden}
    >
      {renderBlock(block, menuTrees, runtimeAuth)}
    </div>
  );
}

function renderBlock(
  block: HeroSlideBlock,
  menuTrees: HeroSliderMenuTrees,
  runtimeAuth: HeroMenuRuntimeAuth,
): ReactNode {
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

  if (block.type === "menu") {
    const menuId = textProp(props.menuId, "");
    return (
      <HeroMenuBlock
        menu={block}
        tree={menuId ? menuTrees[menuId] : undefined}
        runtimeAuth={runtimeAuth}
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
          <HeroBlock
            key={child.id}
            block={child}
            menuTrees={menuTrees}
            runtimeAuth={runtimeAuth}
          />
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
              <HeroBlock
                key={child.id}
                block={child}
                menuTrees={menuTrees}
                runtimeAuth={runtimeAuth}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function SlideFloatingElementsLayer({
  slide,
  menuTrees,
  runtimeAuth,
}: {
  slide: HeroSlide;
  menuTrees: HeroSliderMenuTrees;
  runtimeAuth: HeroMenuRuntimeAuth;
}) {
  if (slide.menus.length === 0 && slide.searchInputs.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: menuLayerZIndex(slide) }}
    >
      {slide.menus.map((menu) => (
        <HeroSlideMenuView
          key={menu.id}
          menu={menu}
          menuTrees={menuTrees}
          runtimeAuth={runtimeAuth}
        />
      ))}
      {slide.searchInputs.map((searchInput) => (
        <HeroSlideSearchInputView
          key={searchInput.id}
          searchInput={searchInput}
        />
      ))}
    </div>
  );
}

function HeroSlideMenuView({
  menu,
  menuTrees,
  runtimeAuth,
}: {
  menu: HeroSlideMenu;
  menuTrees: HeroSliderMenuTrees;
  runtimeAuth: HeroMenuRuntimeAuth;
}) {
  const menuId = textProp(menu.props.menuId, "");
  const hidden: Record<string, string | undefined> = {
    "data-hide-desktop": boolAttr(menu.hiddenOn?.includes("desktop")),
    "data-hide-tablet": boolAttr(menu.hiddenOn?.includes("tablet")),
    "data-hide-mobile": boolAttr(menu.hiddenOn?.includes("mobile")),
  };

  return (
    <div
      className="hero-slider-block hero-slider-menu pointer-events-auto min-w-0"
      style={menuWrapperStyle(menu.props)}
      {...hidden}
    >
      <HeroMenuBlock
        menu={menu}
        tree={menuId ? menuTrees[menuId] : undefined}
        runtimeAuth={runtimeAuth}
      />
    </div>
  );
}

function HeroSlideSearchInputView({
  searchInput,
}: {
  searchInput: HeroSlideSearchInput;
}) {
  const props = searchInput.props;
  const scope = `hero-search-${cssScope(searchInput.id)}`;
  const hidden: Record<string, string | undefined> = {
    "data-hide-desktop": boolAttr(searchInput.hiddenOn?.includes("desktop")),
    "data-hide-tablet": boolAttr(searchInput.hiddenOn?.includes("tablet")),
    "data-hide-mobile": boolAttr(searchInput.hiddenOn?.includes("mobile")),
  };

  return (
    <div
      className="hero-slider-block hero-slider-search-input pointer-events-auto min-w-0"
      style={menuWrapperStyle(props)}
      {...hidden}
    >
      <style
        dangerouslySetInnerHTML={{ __html: buildHeroSearchCss(scope, props) }}
      />
      <SiteSearch
        label={textProp(props.label, "Search")}
        placeholder={textProp(props.placeholder, "Search...")}
        contentTypes={searchContentTypes(props.contentTypes)}
        className={scope}
        displayMode="input"
        resultsAlign={searchResultsAlign(props.resultsAlign)}
      />
    </div>
  );
}

function menuLayerZIndex(slide: HeroSlide) {
  const contentZIndex = Number(slide.layers.contentZIndex);
  return Math.max(Number.isFinite(contentZIndex) ? contentZIndex + 1 : 0, 40);
}

type HeroMenuRenderable = {
  id: string;
  props: Record<string, unknown>;
};

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

function HeroMenuBlock({
  menu,
  tree,
  runtimeAuth,
}: {
  menu: HeroMenuRenderable;
  tree: TopMenuTreeNode[] | undefined;
  runtimeAuth: HeroMenuRuntimeAuth;
}) {
  const props = menu.props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const currentPath = useCurrentPath();

  const menuId = textProp(props.menuId, "");
  const menuName = textProp(props.menuName, "Menu");
  const layout = menuLayout(props.layout);
  const mobileBehavior = menuMobileBehavior(props.mobileBehavior);
  const breakpoint = menuBreakpoint(props.mobileBreakpoint);
  const submenuSide = menuSubmenuSide(props);
  const scope = `hero-menu-${cssScope(menu.id)}`;
  const menuCss = buildHeroMenuCss(scope, props);
  const appendBackendMenu = props.appendBackendMenu === true;
  const appendAuthMenu = props.appendAuthMenu === true;
  const hasAnyMenuSource = !!menuId || appendBackendMenu || appendAuthMenu;
  const desktopItemLayout = layout === "dropdown" ? "vertical" : layout;
  const baseTree = tree ?? [];

  function toggleExpanded(id: string) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  function closeMenus() {
    setMobileOpen(false);
    setDesktopOpen(false);
  }

  if (!hasAnyMenuSource) {
    return (
      <div className="inline-flex min-h-11 items-center rounded-md border border-dashed border-white/35 px-3 text-sm text-white/75">
        Select a menu
      </div>
    );
  }

  if (menuId && !tree) {
    return (
      <div className="inline-flex min-h-11 items-center rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white/75">
        Loading menu...
      </div>
    );
  }

  if (baseTree.length === 0 && !appendBackendMenu && !appendAuthMenu) {
    return null;
  }

  return (
    <div
      className={cn(scope, "hero-menu-root", `hero-menu-layout-${layout}`)}
      data-mobile-breakpoint={breakpoint}
      data-mobile-behavior={mobileBehavior}
      data-submenu-side={submenuSide}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <style dangerouslySetInnerHTML={{ __html: menuCss }} />
      {layout === "dropdown" ? (
        <div className="hero-menu-desktop hero-menu-desktop-dropdown">
          <button
            type="button"
            className="hero-menu-toggle"
            aria-expanded={desktopOpen}
            onClick={() => setDesktopOpen((open) => !open)}
          >
            <span>{menuName}</span>
            <ChevronDown
              className={cn("hero-menu-chevron", desktopOpen && "rotate-180")}
            />
          </button>
          <div className="hero-menu-dropdown-panel" data-open={desktopOpen}>
            <nav aria-label={menuName}>
              <ul className="hero-menu-list hero-menu-list-dropdown">
                {baseTree.map((item) => (
                  <DesktopMenuItem
                    key={item.id}
                    item={item}
                    layout="vertical"
                    currentPath={currentPath}
                    onNavigate={closeMenus}
                  />
                ))}
                {appendBackendMenu ? (
                  <HeroBackendDesktopItems
                    layout="vertical"
                    currentPath={currentPath}
                    onNavigate={closeMenus}
                    runtimeAuth={runtimeAuth}
                  />
                ) : null}
                {appendAuthMenu ? (
                  <HeroAuthDesktopItems onNavigate={closeMenus} />
                ) : null}
              </ul>
            </nav>
          </div>
        </div>
      ) : (
        <nav className="hero-menu-desktop" aria-label={menuName}>
          <div className="hero-menu-surface">
            <ul className="hero-menu-list">
              {baseTree.map((item) => (
                <DesktopMenuItem
                  key={item.id}
                  item={item}
                  layout={desktopItemLayout}
                  currentPath={currentPath}
                  onNavigate={closeMenus}
                />
              ))}
              {appendBackendMenu ? (
                <HeroBackendDesktopItems
                  layout={desktopItemLayout}
                  currentPath={currentPath}
                  onNavigate={closeMenus}
                  runtimeAuth={runtimeAuth}
                />
              ) : null}
              {appendAuthMenu ? (
                <HeroAuthDesktopItems onNavigate={closeMenus} />
              ) : null}
            </ul>
          </div>
        </nav>
      )}

      <div className="hero-menu-mobile">
        <button
          type="button"
          className="hero-menu-toggle hero-menu-mobile-toggle"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span>{textProp(props.mobileButtonLabel, "Menu")}</span>
          {mobileOpen ? (
            <X className="hero-menu-toggle-icon" />
          ) : (
            <MenuIcon className="hero-menu-toggle-icon" />
          )}
        </button>
        <div className="hero-menu-mobile-panel" data-open={mobileOpen}>
          <nav aria-label={menuName}>
            <ul className="hero-menu-mobile-list">
              {baseTree.map((item) => (
                <MobileMenuItem
                  key={item.id}
                  item={item}
                  currentPath={currentPath}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                  onNavigate={closeMenus}
                />
              ))}
              {appendBackendMenu ? (
                <HeroBackendMobileItems
                  currentPath={currentPath}
                  expanded={expanded}
                  onToggle={toggleExpanded}
                  onNavigate={closeMenus}
                  runtimeAuth={runtimeAuth}
                />
              ) : null}
              {appendAuthMenu ? (
                <HeroAuthMobileItems onNavigate={closeMenus} />
              ) : null}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function HeroBackendDesktopItems({
  layout,
  currentPath,
  onNavigate,
  runtimeAuth,
}: {
  layout: "horizontal" | "vertical" | "mega";
  currentPath: string;
  onNavigate: () => void;
  runtimeAuth: HeroMenuRuntimeAuth;
}) {
  const t = useTranslations();
  const access = useEffectiveHeroBackendAccess(runtimeAuth);
  const tree = getBackendMenuTree({ ...access, t });
  return (
    <>
      {tree.map((item) => (
        <DesktopMenuItem
          key={item.id}
          item={item}
          layout={layout}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

function HeroBackendMobileItems({
  currentPath,
  expanded,
  onToggle,
  onNavigate,
  runtimeAuth,
}: {
  currentPath: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
  runtimeAuth: HeroMenuRuntimeAuth;
}) {
  const t = useTranslations();
  const access = useEffectiveHeroBackendAccess(runtimeAuth);
  const tree = getBackendMenuTree({ ...access, t });
  return (
    <>
      {tree.map((item) => (
        <MobileMenuItem
          key={item.id}
          item={item}
          currentPath={currentPath}
          expanded={expanded}
          onToggle={onToggle}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

function HeroAuthDesktopItems({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations();

  return (
    <>
      <Show when="signed-in">
        <li className="hero-menu-item hero-menu-auth-item">
          <div className="hero-menu-link hero-menu-auth-user">
            <UserButtonClient />
          </div>
        </li>
      </Show>
      <Show when="signed-out">
        <li className="hero-menu-item hero-menu-auth-item">
          <SignInButton mode="modal">
            <button
              type="button"
              className="hero-menu-link hero-menu-auth-button"
              onClick={onNavigate}
            >
              <span>{t("common.auth.signIn")}</span>
            </button>
          </SignInButton>
        </li>
        <li className="hero-menu-item hero-menu-auth-item">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="hero-menu-link hero-menu-auth-button"
              onClick={onNavigate}
            >
              <span>{t("common.auth.signUp")}</span>
            </button>
          </SignUpButton>
        </li>
      </Show>
    </>
  );
}

function HeroAuthMobileItems({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations();

  return (
    <>
      <Show when="signed-in">
        <li className="hero-menu-mobile-item hero-menu-mobile-auth-item">
          <div className="hero-menu-mobile-link hero-menu-mobile-auth-user">
            <UserButtonClient />
            <span>{t("common.auth.account")}</span>
          </div>
        </li>
      </Show>
      <Show when="signed-out">
        <li className="hero-menu-mobile-item hero-menu-mobile-auth-item">
          <SignInButton mode="modal">
            <button
              type="button"
              className="hero-menu-mobile-link hero-menu-auth-button"
              onClick={onNavigate}
            >
              <span>{t("common.auth.signIn")}</span>
            </button>
          </SignInButton>
        </li>
        <li className="hero-menu-mobile-item hero-menu-mobile-auth-item">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="hero-menu-mobile-link hero-menu-auth-button"
              onClick={onNavigate}
            >
              <span>{t("common.auth.signUp")}</span>
            </button>
          </SignUpButton>
        </li>
      </Show>
    </>
  );
}

function useEffectiveHeroBackendAccess({
  fallbackIsBackendUser,
  fallbackIsAdmin,
  hasLicenseServerShell,
  hasWebshopShell,
}: HeroMenuRuntimeAuth) {
  const { isLoaded, isSignedIn, user } = useUser();
  const roles = isLoaded && isSignedIn ? getRoles(user?.publicMetadata) : [];
  const isAdmin = isLoaded ? hasRole(roles, "admin") : fallbackIsAdmin;
  const isBackendUser = isLoaded
    ? hasRole(roles, "admin") ||
      hasRole(roles, "publisher") ||
      hasRole(roles, "author")
    : fallbackIsBackendUser;

  return { hasLicenseServerShell, hasWebshopShell, isBackendUser, isAdmin };
}

function DesktopMenuItem({
  item,
  layout,
  currentPath,
  onNavigate,
  depth = 0,
}: {
  item: TopMenuTreeNode;
  layout: "horizontal" | "vertical" | "mega";
  currentPath: string;
  onNavigate: () => void;
  depth?: number;
}) {
  const hasChildren = item.children.length > 0;
  const active = isMenuItemActive(item.url, currentPath);
  const showMega = layout === "mega" && depth === 0 && hasChildren;

  return (
    <li className="hero-menu-item" data-depth={depth}>
      <MenuItemLink
        item={item}
        currentPath={currentPath}
        className={cn("hero-menu-link", active && "is-active")}
        onNavigate={onNavigate}
      >
        <span>{item.label}</span>
        {hasChildren ? <ChevronDown className="hero-menu-chevron" /> : null}
      </MenuItemLink>

      {showMega ? (
        <div className="hero-menu-submenu hero-menu-mega">
          <ul className="hero-menu-mega-grid">
            {item.children.map((child) => (
              <MegaMenuColumn
                key={child.id}
                item={child}
                currentPath={currentPath}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ) : hasChildren ? (
        <ul className="hero-menu-submenu">
          {item.children.map((child) => (
            <DesktopMenuItem
              key={child.id}
              item={child}
              layout="vertical"
              currentPath={currentPath}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MegaMenuColumn({
  item,
  currentPath,
  onNavigate,
}: {
  item: TopMenuTreeNode;
  currentPath: string;
  onNavigate: () => void;
}) {
  return (
    <li className="hero-menu-mega-column">
      <MenuItemLink
        item={item}
        currentPath={currentPath}
        className={cn(
          "hero-menu-link hero-menu-mega-heading",
          isMenuItemActive(item.url, currentPath) && "is-active",
        )}
        onNavigate={onNavigate}
      >
        <span>{item.label}</span>
      </MenuItemLink>
      {item.children.length > 0 ? (
        <ul className="hero-menu-mega-list">
          {item.children.map((child) => (
            <DesktopMenuItem
              key={child.id}
              item={child}
              layout="vertical"
              currentPath={currentPath}
              onNavigate={onNavigate}
              depth={1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MobileMenuItem({
  item,
  currentPath,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: TopMenuTreeNode;
  currentPath: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onNavigate: () => void;
}) {
  const hasChildren = item.children.length > 0;
  const isExpanded = expanded[item.id] ?? false;

  return (
    <li className="hero-menu-mobile-item">
      <div className="hero-menu-mobile-row">
        <MenuItemLink
          item={item}
          currentPath={currentPath}
          className={cn(
            "hero-menu-mobile-link",
            isMenuItemActive(item.url, currentPath) && "is-active",
          )}
          onNavigate={onNavigate}
        >
          <span>{item.label}</span>
        </MenuItemLink>
        {hasChildren ? (
          <button
            type="button"
            className="hero-menu-mobile-expand"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label}`}
            aria-expanded={isExpanded}
            onClick={() => onToggle(item.id)}
          >
            <ChevronDown
              className={cn("hero-menu-chevron", isExpanded && "rotate-180")}
            />
          </button>
        ) : null}
      </div>
      {hasChildren ? (
        <ul className="hero-menu-mobile-children" data-open={isExpanded}>
          {item.children.map((child) => (
            <MobileMenuItem
              key={child.id}
              item={child}
              currentPath={currentPath}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MenuItemLink({
  item,
  currentPath,
  className,
  children,
  onNavigate,
}: {
  item: TopMenuTreeNode;
  currentPath: string;
  className: string;
  children: ReactNode;
  onNavigate: () => void;
}) {
  const href = sanitizeHref(item.url);
  const external = /^https?:\/\//i.test(href);
  const active = isMenuItemActive(href, currentPath);
  return (
    <a
      href={href}
      target={item.target}
      rel={
        external && item.target === "_blank" ? "noopener noreferrer" : undefined
      }
      className={className}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {children}
    </a>
  );
}

function menuWrapperStyle(props: Record<string, unknown>): CSSProperties {
  const width = safeCss(props.width, "auto");
  const maxWidth = safeCss(props.maxWidth, "100%");
  const zIndex = safeCss(props.zIndex, "20");
  const positionMode = textProp(props.positionMode, "absolute");
  const spacingStyle = menuWrapperSpacingStyle(props);
  if (positionMode !== "absolute") {
    const align = textProp(props.flowAlign, "left");
    const alignSelf =
      align === "center"
        ? "center"
        : align === "right"
          ? "flex-end"
          : align === "stretch"
            ? "stretch"
            : "flex-start";
    return {
      ...spacingStyle,
      alignSelf,
      maxWidth,
      position: "relative",
      width: align === "stretch" ? "100%" : width,
      zIndex,
    };
  }

  const anchor = menuAnchor(props.anchor);
  const offsetX = safeCss(props.offsetX, "clamp(1rem, 4vw, 3rem)");
  const offsetY = safeCss(props.offsetY, "clamp(1rem, 4vw, 2rem)");
  const style: CSSProperties = {
    ...spacingStyle,
    maxWidth,
    position: "absolute",
    width,
    zIndex,
  };

  if (anchor.includes("top")) style.top = offsetY;
  if (anchor.includes("bottom")) style.bottom = offsetY;
  if (anchor.includes("left")) style.left = offsetX;
  if (anchor.includes("right")) style.right = offsetX;

  if (anchor === "center") {
    style.left = "50%";
    style.top = "50%";
    style.transform = `translate(calc(-50% + ${offsetX}), calc(-50% + ${offsetY}))`;
  } else if (anchor.endsWith("center")) {
    style.left = "50%";
    style.transform = `translateX(calc(-50% + ${offsetX}))`;
  } else if (anchor.startsWith("center")) {
    style.top = "50%";
    style.transform = `translateY(calc(-50% + ${offsetY}))`;
  }

  return style;
}

function menuWrapperSpacingStyle(
  props: Record<string, unknown>,
): CSSProperties {
  return {
    boxSizing: "border-box",
    margin: menuSidesCss(props.wrapperMargin),
    padding: menuSidesCss(props.wrapperPadding),
  };
}

function menuSidesCss(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const sides = value as Record<string, unknown>;
  const top = safeCss(sides.top, "0");
  const right = safeCss(sides.right, "0");
  const bottom = safeCss(sides.bottom, "0");
  const left = safeCss(sides.left, "0");
  if (top === "0" && right === "0" && bottom === "0" && left === "0") {
    return undefined;
  }
  return `${top} ${right} ${bottom} ${left}`;
}

function buildHeroSearchCss(scope: string, props: Record<string, unknown>) {
  const preset = createHeroSlideSearchInputPresetProps(props.preset);
  const css = (key: string, fallback: string) =>
    safeCss(menuValue(props, preset, key, fallback), fallback);
  const text = (key: string, fallback: string) =>
    safeMenuText(menuValue(props, preset, key, fallback), fallback);
  const fontWeight = safeFontWeight(text("fontWeight", "500"));
  const resultsAlign = searchResultsAlign(props.resultsAlign);

  return `
.${scope} {
  --hs-input-bg: ${css("backgroundColor", "rgba(15,23,42,0.46)")};
  --hs-input-color: ${css("color", "#ffffff")};
  --hs-input-border: ${css("borderColor", "rgba(255,255,255,0.24)")};
  --hs-input-placeholder: ${css("placeholderColor", "rgba(255,255,255,0.68)")};
  --hs-input-focus-border: ${css("focusBorderColor", "rgba(255,255,255,0.55)")};
  --hs-input-focus-ring: ${css("focusRingColor", "rgba(255,255,255,0.22)")};
  --hs-input-border-width: ${css("borderWidth", "1px")};
  --hs-input-radius: ${css("borderRadius", "999px")};
  --hs-input-shadow: ${css("shadow", "0 18px 44px rgba(2,6,23,0.32)")};
  --hs-results-bg: ${css("resultsBackgroundColor", "rgba(15,23,42,0.97)")};
  --hs-results-color: ${css("resultsColor", "#ffffff")};
  --hs-results-border: ${css("resultsBorderColor", "rgba(255,255,255,0.18)")};
  --hs-results-radius: ${css("resultsRadius", "0.75rem")};
  --hs-results-shadow: ${css("resultsShadow", "0 22px 56px rgba(2,6,23,0.38)")};
  display: block;
  max-width: 100%;
  width: 100%;
}
.${scope} form[role="search"] {
  width: 100%;
}
.${scope} input[type="search"] {
  background: var(--hs-input-bg) !important;
  border-color: var(--hs-input-border) !important;
  border-radius: var(--hs-input-radius) !important;
  border-width: var(--hs-input-border-width) !important;
  box-shadow: var(--hs-input-shadow);
  color: var(--hs-input-color) !important;
  font-size: ${css("fontSize", "1rem")};
  font-weight: ${fontWeight};
  height: ${css("inputHeight", "3rem")};
  letter-spacing: ${css("letterSpacing", "0")};
  padding: ${css("inputPadding", "0 1rem")};
  width: 100%;
}
.${scope} input[type="search"]::placeholder {
  color: var(--hs-input-placeholder);
  opacity: 1;
}
.${scope} input[type="search"]:focus-visible {
  border-color: var(--hs-input-focus-border) !important;
  box-shadow: var(--hs-input-shadow), 0 0 0 3px var(--hs-input-focus-ring) !important;
}
.${scope} form[role="search"] > div {
  ${resultsAlign === "right" ? "left: auto !important; right: 0 !important;" : "left: 0 !important; right: auto !important;"}
  background: var(--hs-results-bg) !important;
  border-color: var(--hs-results-border) !important;
  border-radius: var(--hs-results-radius) !important;
  box-shadow: var(--hs-results-shadow) !important;
  color: var(--hs-results-color) !important;
  width: ${css("resultsWidth", "min(28rem, calc(100vw - 2rem))")} !important;
}
.${scope} form[role="search"] > div a:hover,
.${scope} form[role="search"] > div a:focus-visible {
  background: ${css("resultsHoverBackgroundColor", "rgba(255,255,255,0.12)")} !important;
  color: ${css("resultsHoverColor", "var(--hs-results-color)")} !important;
}
@media (prefers-reduced-motion: reduce) {
  .${scope} * {
    transition: none !important;
  }
}
`;
}

function buildHeroMenuCss(scope: string, props: Record<string, unknown>) {
  const preset = createHeroSlideMenuPresetProps(props.preset);
  const css = (key: string, fallback: string) =>
    safeCss(menuValue(props, preset, key, fallback), fallback);
  const text = (key: string, fallback: string) =>
    safeMenuText(menuValue(props, preset, key, fallback), fallback);
  const fontWeight = safeFontWeight(text("fontWeight", "600"));
  const textTransform = safeTextTransform(text("textTransform", "none"));
  const breakpoint = menuBreakpoint(props.mobileBreakpoint);
  const desktopMax =
    breakpoint === "md" ? "767px" : breakpoint === "xl" ? "1279px" : "1023px";

  return `
.${scope} {
  --hm-bg: ${css("backgroundColor", "rgba(255,255,255,0.14)")};
  --hm-color: ${css("color", "#ffffff")};
  --hm-border: ${css("borderColor", "rgba(255,255,255,0.24)")};
  --hm-border-width: ${css("borderWidth", "1px")};
  --hm-radius: ${css("borderRadius", "0.9rem")};
  --hm-submenu-radius: ${css("submenuRadius", "0.85rem")};
  --hm-surface-shadow: ${css("surfaceShadow", "none")};
  --hm-shadow: ${css("shadow", "0 18px 45px rgba(15,23,42,0.24)")};
  --hm-hover-bg: ${css("hoverBackgroundColor", "rgba(255,255,255,0.24)")};
  --hm-hover-color: ${css("hoverColor", "#ffffff")};
  --hm-active-bg: ${css("activeBackgroundColor", "rgba(255,255,255,0.3)")};
  --hm-active-color: ${css("activeColor", "#ffffff")};
  --hm-dropdown-bg: ${css("dropdownBackgroundColor", "rgba(15,23,42,0.94)")};
  --hm-dropdown-color: ${css("dropdownColor", "#ffffff")};
  --hm-gap: ${css("gap", "0.35rem")};
  --hm-item-padding: ${css("itemPadding", "0.65rem 0.85rem")};
  --hm-submenu-width: ${css("submenuWidth", "240px")};
  --hm-submenu-padding: ${css("submenuPadding", "0.5rem")};
  --hm-mega-width: ${css("megaWidth", "min(48rem, calc(100vw - 2rem))")};
  --hm-mobile-panel-width: ${css("mobilePanelWidth", "min(20rem, calc(100vw - 2rem))")};
  --hm-mobile-panel-bg: ${css("mobilePanelBackgroundColor", "rgba(15,23,42,0.96)")};
  --hm-mobile-panel-color: ${css("mobilePanelColor", "#ffffff")};
  --hm-mobile-item-padding: ${css("mobileItemPadding", "0.75rem 0.85rem")};
  color: var(--hm-color);
  display: inline-block;
  font-size: ${css("fontSize", "0.95rem")};
  font-weight: ${fontWeight};
  letter-spacing: ${css("letterSpacing", "0")};
  line-height: ${css("lineHeight", "1.2")};
  max-width: 100%;
  text-transform: ${textTransform};
}
.${scope} .hero-menu-desktop { display: block; }
.${scope} .hero-menu-mobile { display: none; position: relative; }
.${scope} .hero-menu-surface,
.${scope} .hero-menu-toggle,
.${scope} .hero-menu-dropdown-panel,
.${scope} .hero-menu-mobile-panel {
  background: var(--hm-bg);
  border: var(--hm-border-width) solid var(--hm-border);
  border-radius: var(--hm-radius);
  color: var(--hm-color);
}
.${scope} .hero-menu-surface,
.${scope} .hero-menu-toggle {
  box-shadow: var(--hm-surface-shadow);
}
.${scope} .hero-menu-dropdown-panel,
.${scope} .hero-menu-mobile-panel {
  box-shadow: var(--hm-shadow);
}
.${scope} .hero-menu-surface,
.${scope} .hero-menu-desktop-dropdown {
  display: inline-flex;
  max-width: 100%;
  position: relative;
}
.${scope}.hero-menu-layout-vertical .hero-menu-surface {
  display: flex;
}
.${scope} .hero-menu-list,
.${scope} .hero-menu-mobile-list,
.${scope} .hero-menu-mobile-children,
.${scope} .hero-menu-mega-grid,
.${scope} .hero-menu-mega-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.${scope} .hero-menu-list {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--hm-gap);
  padding: 0.25rem;
}
.${scope}.hero-menu-layout-vertical .hero-menu-list,
.${scope} .hero-menu-list-dropdown {
  align-items: stretch;
  flex-direction: column;
}
.${scope} .hero-menu-item {
  min-width: 0;
  position: relative;
}
.${scope} .hero-menu-link,
.${scope} .hero-menu-toggle,
.${scope} .hero-menu-mobile-link,
.${scope} .hero-menu-mobile-expand {
  align-items: center;
  border-radius: max(0.25rem, calc(var(--hm-radius) - 0.25rem));
  color: inherit;
  display: flex;
  gap: 0.35rem;
  min-height: 44px;
  text-decoration: none;
  transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}
.${scope} .hero-menu-link,
.${scope} .hero-menu-toggle {
  justify-content: flex-start;
  padding: var(--hm-item-padding);
  white-space: nowrap;
}
.${scope} .hero-menu-surface > .hero-menu-list > .hero-menu-item > .hero-menu-link,
.${scope} .hero-menu-toggle {
  justify-content: center;
}
.${scope} .hero-menu-submenu .hero-menu-link,
.${scope} .hero-menu-list-dropdown .hero-menu-link,
.${scope} .hero-menu-mega-list .hero-menu-link {
  justify-content: space-between;
  width: 100%;
}
.${scope} .hero-menu-toggle {
  cursor: pointer;
  font: inherit;
}
.${scope} .hero-menu-auth-button {
  appearance: none;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.${scope} .hero-menu-auth-user,
.${scope} .hero-menu-mobile-auth-user {
  align-items: center;
  cursor: default;
  display: flex;
  gap: 0.5rem;
}
.${scope} .hero-menu-link:hover,
.${scope} .hero-menu-link:focus-visible,
.${scope} .hero-menu-toggle:hover,
.${scope} .hero-menu-toggle:focus-visible,
.${scope} .hero-menu-mobile-link:hover,
.${scope} .hero-menu-mobile-link:focus-visible,
.${scope} .hero-menu-mobile-expand:hover,
.${scope} .hero-menu-mobile-expand:focus-visible {
  background: var(--hm-hover-bg);
  color: var(--hm-hover-color);
  outline: none;
}
.${scope} .hero-menu-link.is-active,
.${scope} .hero-menu-mobile-link.is-active {
  background: var(--hm-active-bg);
  color: var(--hm-active-color);
}
.${scope} .hero-menu-chevron,
.${scope} .hero-menu-toggle-icon {
  height: 1rem;
  transition: transform 160ms ease;
  width: 1rem;
}
.${scope} .hero-menu-item:hover > .hero-menu-link .hero-menu-chevron,
.${scope} .hero-menu-item:focus-within > .hero-menu-link .hero-menu-chevron {
  transform: rotate(180deg);
}
.${scope} .hero-menu-submenu,
.${scope} .hero-menu-dropdown-panel {
  background: var(--hm-dropdown-bg);
  border: var(--hm-border-width) solid var(--hm-border);
  border-radius: var(--hm-submenu-radius);
  box-shadow: var(--hm-shadow);
  color: var(--hm-dropdown-color);
  opacity: 0;
  padding: var(--hm-submenu-padding);
  pointer-events: none;
  position: absolute;
  transform: translateY(0.35rem);
  transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
  visibility: hidden;
  z-index: 80;
}
.${scope} .hero-menu-submenu {
  left: 0;
  min-width: var(--hm-submenu-width);
  top: 100%;
}
.${scope}[data-submenu-side="left"].hero-menu-layout-horizontal > .hero-menu-desktop .hero-menu-surface > .hero-menu-list > .hero-menu-item > .hero-menu-submenu,
.${scope}[data-submenu-side="left"].hero-menu-layout-mega > .hero-menu-desktop .hero-menu-surface > .hero-menu-list > .hero-menu-item > .hero-menu-submenu {
  left: auto;
  right: 0;
}
.${scope} .hero-menu-submenu .hero-menu-submenu {
  left: 100%;
  top: calc(-1 * var(--hm-submenu-padding));
  transform: translateX(-0.2rem);
}
.${scope}[data-submenu-side="left"] .hero-menu-submenu .hero-menu-submenu {
  left: auto;
  right: 100%;
  transform: translateX(0.2rem);
}
.${scope}.hero-menu-layout-vertical > .hero-menu-desktop .hero-menu-list > .hero-menu-item > .hero-menu-submenu,
.${scope} .hero-menu-list-dropdown > .hero-menu-item > .hero-menu-submenu {
  left: 100%;
  top: 0;
}
.${scope}[data-submenu-side="left"].hero-menu-layout-vertical > .hero-menu-desktop .hero-menu-list > .hero-menu-item > .hero-menu-submenu,
.${scope}[data-submenu-side="left"] .hero-menu-list-dropdown > .hero-menu-item > .hero-menu-submenu {
  left: auto;
  right: 100%;
  top: 0;
}
.${scope} .hero-menu-item:hover > .hero-menu-submenu,
.${scope} .hero-menu-item:focus-within > .hero-menu-submenu,
.${scope} .hero-menu-dropdown-panel[data-open="true"] {
  opacity: 1;
  pointer-events: auto;
  transform: translate(0, 0);
  visibility: visible;
}
.${scope} .hero-menu-mega {
  max-width: calc(100vw - 2rem);
  width: var(--hm-mega-width);
}
.${scope} .hero-menu-mega-grid {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}
.${scope} .hero-menu-mega-column,
.${scope} .hero-menu-mega-list {
  min-width: 0;
}
.${scope} .hero-menu-mega-heading {
  font-weight: 700;
}
.${scope} .hero-menu-dropdown-panel {
  left: 0;
  min-width: var(--hm-submenu-width);
  top: calc(100% + 0.5rem);
}
.${scope}[data-submenu-side="left"] .hero-menu-dropdown-panel {
  left: auto;
  right: 0;
}
.${scope} .hero-menu-mobile-toggle {
  background: var(--hm-bg);
  width: 100%;
}
.${scope} .hero-menu-mobile-panel {
  background: var(--hm-mobile-panel-bg);
  border-radius: var(--hm-submenu-radius);
  color: var(--hm-mobile-panel-color);
  max-height: min(70vh, 32rem);
  opacity: 0;
  overflow: auto;
  padding: 0.35rem;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  transform: translateY(-0.35rem);
  transition: opacity 160ms ease, transform 160ms ease, visibility 160ms ease;
  visibility: hidden;
  width: var(--hm-mobile-panel-width);
  z-index: 90;
}
.${scope} .hero-menu-mobile-panel[data-open="true"],
.${scope}[data-mobile-behavior="stack"] .hero-menu-mobile-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  visibility: visible;
}
.${scope}[data-mobile-behavior="stack"] .hero-menu-mobile-toggle {
  display: none;
}
.${scope}[data-mobile-behavior="stack"] .hero-menu-mobile-panel {
  max-height: none;
  position: static;
  width: 100%;
}
.${scope}[data-mobile-behavior="hidden"] .hero-menu-mobile {
  display: none !important;
}
.${scope} .hero-menu-mobile-row {
  align-items: center;
  display: flex;
  gap: 0.25rem;
}
.${scope} .hero-menu-mobile-link {
  flex: 1;
  min-width: 0;
  padding: var(--hm-mobile-item-padding);
}
.${scope} .hero-menu-mobile-expand {
  background: transparent;
  border: 0;
  cursor: pointer;
  flex: 0 0 44px;
  justify-content: center;
  padding: 0;
}
.${scope} .hero-menu-mobile-children {
  border-left: var(--hm-border-width) solid var(--hm-border);
  margin-left: 0.85rem;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding-left: 0.45rem;
  transition: max-height 180ms ease, opacity 180ms ease;
}
.${scope} .hero-menu-mobile-children[data-open="true"] {
  max-height: 900px;
  opacity: 1;
}
@media (max-width: ${desktopMax}) {
  .${scope} .hero-menu-desktop { display: none; }
  .${scope} .hero-menu-mobile { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .${scope} * {
    transition: none !important;
  }
}
`;
}

function menuValue(
  props: Record<string, unknown>,
  preset: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = props[key];
  if (typeof value === "string" && value.trim()) return value;
  return preset[key] ?? fallback;
}

function safeMenuText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  if (!next || /[<>{};]/.test(next)) return fallback;
  return next;
}

function menuLayout(
  value: unknown,
): "horizontal" | "vertical" | "dropdown" | "mega" {
  return value === "vertical" || value === "dropdown" || value === "mega"
    ? value
    : "horizontal";
}

function menuMobileBehavior(value: unknown): "collapse" | "stack" | "hidden" {
  return value === "stack" || value === "hidden" ? value : "collapse";
}

function menuBreakpoint(value: unknown): "md" | "lg" | "xl" {
  return value === "md" || value === "xl" ? value : "lg";
}

function menuSubmenuSide(props: Record<string, unknown>): "left" | "right" {
  const positionMode = textProp(props.positionMode, "absolute");
  if (positionMode !== "absolute") {
    return textProp(props.flowAlign, "left") === "right" ? "left" : "right";
  }
  return menuAnchor(props.anchor).includes("right") ? "left" : "right";
}

function searchContentTypes(value: unknown): SearchContentType[] {
  if (!Array.isArray(value)) return ["blog_post", "page"];
  const next = Array.from(
    new Set(
      value.filter(
        (item): item is SearchContentType =>
          item === "blog_post" || item === "page",
      ),
    ),
  );
  return next.length > 0 ? next : ["blog_post", "page"];
}

function searchResultsAlign(value: unknown): "left" | "right" {
  return value === "right" ? "right" : "left";
}

function menuAnchor(value: unknown) {
  const anchors = new Set([
    "top-left",
    "top-center",
    "top-right",
    "center-left",
    "center",
    "center-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]);
  return typeof value === "string" && anchors.has(value) ? value : "top-right";
}

function safeFontWeight(value: string) {
  return /^(?:[1-9]00|normal|bold|lighter|bolder)$/i.test(value)
    ? value
    : "600";
}

function safeTextTransform(value: string) {
  return value === "uppercase" ||
    value === "lowercase" ||
    value === "capitalize"
    ? value
    : "none";
}

function isMenuItemActive(url: string, currentPath: string) {
  const href = sanitizeHref(url);
  if (!currentPath || href === "#") return false;
  if (href === "/") return currentPath === "/";
  return href === currentPath || currentPath.startsWith(`${href}/`);
}

function useCurrentPath() {
  return useSyncExternalStore(
    subscribeToPathChanges,
    getPathSnapshot,
    getServerPathSnapshot,
  );
}

function subscribeToPathChanges(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

function getPathSnapshot() {
  return window.location.pathname;
}

function getServerPathSnapshot() {
  return "";
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
