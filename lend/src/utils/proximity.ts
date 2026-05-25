/**
 * Converts a raw distance in miles into a human-readable urban proximity label.
 * In dense cities, fractions of a mile mean something qualitatively different
 * from "X.X miles away" — this surfaces that meaning.
 */
export interface ProximityInfo {
  label: string;
  sublabel: string;
  icon: string;
  isWalkable: boolean;
  isBikeable: boolean;
}

export function formatProximity(miles: number): ProximityInfo {
  if (miles <= 0.15) {
    return { label: 'Steps away', sublabel: 'same block', icon: '🚶', isWalkable: true, isBikeable: true };
  }
  if (miles <= 0.5) {
    const mins = Math.round(miles / 0.05);   // ~3 mph walk
    return { label: `${mins} min walk`, sublabel: `${miles.toFixed(2)} mi`, icon: '🚶', isWalkable: true, isBikeable: true };
  }
  if (miles <= 1.2) {
    const mins = Math.round(miles / 0.05);
    return { label: `~${mins} min walk`, sublabel: `${miles.toFixed(1)} mi`, icon: '🚶', isWalkable: true, isBikeable: true };
  }
  if (miles <= 3.0) {
    return { label: 'Short ride', sublabel: `${miles.toFixed(1)} mi`, icon: '🚲', isWalkable: false, isBikeable: true };
  }
  if (miles <= 10) {
    return { label: `${miles.toFixed(1)} mi`, sublabel: 'nearby', icon: '🚗', isWalkable: false, isBikeable: false };
  }
  return { label: `${Math.round(miles)} mi away`, sublabel: 'farther out', icon: '🚗', isWalkable: false, isBikeable: false };
}
