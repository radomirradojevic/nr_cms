import type { CSSProperties } from "react";
import { resolveVideoEmbed, type VideoConfig } from "./video-shared";
import { cn } from "@/lib/utils";

function styleFromString(style: string | null): CSSProperties | undefined {
  if (!style) return undefined;
  return Object.fromEntries(
    style
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [rawKey, ...rawValue] = part.split(":");
        const key = rawKey
          .trim()
          .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        return [key, rawValue.join(":").trim()];
      }),
  ) as CSSProperties;
}

export function VideoEmbed({
  className,
  style,
  ...config
}: VideoConfig & {
  className?: string;
  style?: CSSProperties;
}) {
  const embed = resolveVideoEmbed(config);

  if (!embed.src) {
    return (
      <div
        style={style}
        className={cn(
          "my-4 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Video placeholder - choose a video in the block settings.
      </div>
    );
  }

  if (embed.provider === "youtube") {
    return (
      <div
        style={style}
        className={cn(embed.wrapperClass, className)}
        {...embed.wrapperData}
      >
        <div
          className="tiptap-video-frame"
          style={styleFromString(embed.frameStyle)}
        >
          <iframe
            src={embed.src}
            data-video-provider="youtube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={styleFromString(embed.iframeStyle)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(embed.wrapperClass, className)}
      {...embed.wrapperData}
    >
      <div
        className="tiptap-video-frame"
        style={styleFromString(embed.frameStyle)}
      >
        <video
          src={embed.src}
          data-video-provider="file"
          controls
          style={styleFromString(embed.videoStyle)}
        />
      </div>
    </div>
  );
}
