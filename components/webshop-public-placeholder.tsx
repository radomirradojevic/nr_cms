export function WebshopPublicPlaceholder({
  description,
  title,
}: {
  description?: string | null;
  title: string;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-normal text-muted-foreground">
          Webshop
        </p>
        <h1 className="text-4xl font-semibold tracking-normal">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Storefront is not available yet.
          </p>
        )}
      </div>
    </section>
  );
}
