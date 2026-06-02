export function shouldRenderMobileHeaderMenu({
  hasSiteNav,
  hasBackendNav,
  hasAuthControls,
}: {
  hasSiteNav: boolean;
  hasBackendNav: boolean;
  hasAuthControls: boolean;
}) {
  return hasSiteNav || hasBackendNav || hasAuthControls;
}
