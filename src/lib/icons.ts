import house from 'lucide-static/icons/house.svg?raw';
import dumbbell from 'lucide-static/icons/dumbbell.svg?raw';
import listChecks from 'lucide-static/icons/list-checks.svg?raw';
import calculator from 'lucide-static/icons/calculator.svg?raw';
import bicepsFlexed from 'lucide-static/icons/biceps-flexed.svg?raw';
import personStanding from 'lucide-static/icons/person-standing.svg?raw';
import footprints from 'lucide-static/icons/footprints.svg?raw';
import activity from 'lucide-static/icons/activity.svg?raw';
import target from 'lucide-static/icons/target.svg?raw';
import shield from 'lucide-static/icons/shield.svg?raw';
import mountain from 'lucide-static/icons/mountain.svg?raw';
import sun from 'lucide-static/icons/sun.svg?raw';
import moon from 'lucide-static/icons/moon.svg?raw';
import sparkles from 'lucide-static/icons/sparkles.svg?raw';
import arrowRight from 'lucide-static/icons/arrow-right.svg?raw';
import heartPulse from 'lucide-static/icons/heart-pulse.svg?raw';
import check from 'lucide-static/icons/check.svg?raw';
import refreshCw from 'lucide-static/icons/refresh-cw.svg?raw';

const ICONS = {
  house, dumbbell, listChecks, calculator, bicepsFlexed, personStanding, footprints, activity, target, shield,
  mountain, sun, moon, sparkles, arrowRight, heartPulse, check, refreshCw,
};

export type IconName = keyof typeof ICONS;

/** Icône Lucide (licence ISC) en SVG inline, décorative (masquée aux lecteurs d'écran). */
export function icon(name: IconName, size = 24): string {
  return ICONS[name]
    .replace(/<!--.*?-->/s, '')
    .replace(/\swidth="24"/, ` width="${size}"`)
    .replace(/\sheight="24"/, ` height="${size}"`)
    .replace('<svg', '<svg aria-hidden="true" focusable="false"')
    .trim();
}

/** Icône associée à chaque zone de l'accueil. */
export const ZONE_ICON: Record<string, IconName> = {
  pectoraux: 'shield',
  dos: 'mountain',
  epaules: 'activity',
  jambes: 'footprints',
  bras: 'bicepsFlexed',
  abdos: 'target',
  'corps-entier': 'personStanding',
};
