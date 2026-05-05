import type { Config } from "@measured/puck";

type HeadingProps = { text: string; level: "1" | "2" | "3" };
type TextProps = { text: string };
type ImageProps = { src: string; alt: string };
type ButtonProps = { label: string; href: string };
type HeroProps = { title: string; subtitle: string };
type ColumnsProps = { left: string; right: string };

export type PuckProps = {
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  Button: ButtonProps;
  Hero: HeroProps;
  Columns: ColumnsProps;
};

export const puckConfig: Config<PuckProps> = {
  components: {
    Heading: {
      fields: {
        text: { type: "text" },
        level: {
          type: "select",
          options: [
            { label: "H1", value: "1" },
            { label: "H2", value: "2" },
            { label: "H3", value: "3" },
          ],
        },
      },
      defaultProps: { text: "Heading", level: "2" },
      render: ({ text, level }) => {
        const Tag = `h${level}` as "h1" | "h2" | "h3";
        return <Tag className="font-semibold tracking-tight my-4">{text}</Tag>;
      },
    },
    Text: {
      fields: { text: { type: "textarea" } },
      defaultProps: { text: "Some text" },
      render: ({ text }) => (
        <p className="my-3 leading-relaxed whitespace-pre-wrap">{text}</p>
      ),
    },
    Image: {
      fields: {
        src: { type: "text" },
        alt: { type: "text" },
      },
      defaultProps: { src: "", alt: "" },
      render: ({ src, alt }) =>
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="my-4 max-w-full rounded" />
        ) : (
          <div className="my-4 p-8 border border-dashed text-center text-muted-foreground">
            Image placeholder — add a src
          </div>
        ),
    },
    Button: {
      fields: {
        label: { type: "text" },
        href: { type: "text" },
      },
      defaultProps: { label: "Click me", href: "#" },
      render: ({ label, href }) => (
        <a
          href={href}
          className="inline-block my-3 rounded bg-primary px-4 py-2 text-primary-foreground"
        >
          {label}
        </a>
      ),
    },
    Hero: {
      fields: {
        title: { type: "text" },
        subtitle: { type: "textarea" },
      },
      defaultProps: { title: "Hero title", subtitle: "Hero subtitle" },
      render: ({ title, subtitle }) => (
        <section className="my-8 rounded-lg border bg-card p-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
        </section>
      ),
    },
    Columns: {
      fields: {
        left: { type: "textarea" },
        right: { type: "textarea" },
      },
      defaultProps: { left: "Left column", right: "Right column" },
      render: ({ left, right }) => (
        <div className="my-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="whitespace-pre-wrap">{left}</div>
          <div className="whitespace-pre-wrap">{right}</div>
        </div>
      ),
    },
  },
};

export const emptyPuckData = {
  content: [],
  root: { props: {} },
};
