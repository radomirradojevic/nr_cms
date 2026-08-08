export default async function LicenseDeliveryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const action = `/licenses/delivery/${encodeURIComponent(token)}/redeem`;
  return (
    <main>
      <meta name="referrer" content="no-referrer" />
      <h1>License delivery</h1>
      <p>Confirm to reveal your license key once.</p>
      <form action={action} method="post">
        <button type="submit">Reveal license key</button>
      </form>
    </main>
  );
}
export const dynamic = "force-dynamic";
