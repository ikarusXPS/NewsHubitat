/**
 * Platform detection seam — used by Phase 40 Premium-gate UI to honor the
 * Phase 39 reader-app exemption (CC-01 / Phase 39 D-08, D-09).
 *
 * On `true`, mobile native (iOS/Android Capacitor wrapper) — Premium gates
 * MUST hide the /pricing CTA and show plain-text "newshub.example" only
 * (no clickable link — App Review risk per Apple Rule 3.1.1(a)).
 *
 * On `false`, web browser — Premium gates use the existing UpgradePrompt
 * component with /pricing navigation.
 *
 * STUB: returns false until Phase 39 lands the real Capacitor.getPlatform()
 * detection. When Phase 39 ships its version of this file, this stub is
 * replaced verbatim — no Phase 40 consumer needs to change.
 *
 * Phase 39 implementation (for reference, not active here yet):
 *   const cap = (window as any).Capacitor;
 *   const platform = cap?.getPlatform?.();
 *   return platform === 'ios' || platform === 'android';
 */
export function isNativeApp(): boolean {
  return false;
}
