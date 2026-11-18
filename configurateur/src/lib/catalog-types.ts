/**
 * Formes « légères » du catalogue envoyées au navigateur pour le configurateur.
 * Aucune dépendance serveur ici : ce fichier est importé côté client.
 */
import type { Mount, OptionGroup, Selection } from '@/db/schema';

export type Locale = 'fr' | 'nl';

export type CTractor = {
  ref: string;
  slug: string;
  brand: string;
  category: string;
  name: string;
  description: string;
  priceHt: number | null;
  availability: string;
  leadTime: string | null;
  powerHp: number | null;
  transmission: string | null;
  liftCapacityKg: number | null;
  hitchCategory: string | null;
  ptoType: string | null;
  weightKg: number | null;
  widthCm: number | null;
  maxImplementWidthCm: number | null;
  usages: string[];
  image: string | null;
  images: string[];
  spinUrl: string | null;
  spinFrames: number;
  modelUrl: string | null;
};

export type COption = {
  ref: string;
  group: OptionGroup;
  name: string;
  description: string;
  priceHt: number | null;
  image: string | null;
  tractorRefs: string[] | '*';
  defaultFor: string[] | '*';
  requiresAny: string[];
  excludes: string[];
  visual: string | null;
  feature: string | null;
  tireFront: string | null;
  tireRear: string | null;
  widthCm: number | null;
};

export type CMachine = {
  ref: string;
  slug: string;
  brand: string;
  category: string;
  family: string;
  familyName: string | null;
  name: string;
  description: string;
  priceHt: number | null;
  availability: string;
  leadTime: string | null;
  workingWidthCm: number | null;
  minPowerHp: number | null;
  maxPowerHp: number | null;
  /** true si le maximum n'est pas publié et vient de la règle min × POWER_MAX_RATIO */
  maxPowerEstimated?: boolean;
  hitchCategory: string | null;
  weightKg: number | null;
  mount: Mount | null;
  needsPto: boolean | null;
  ptoType: string | null;
  image: string | null;
};

export type Catalog = {
  tractors: CTractor[];
  options: COption[];
  machines: CMachine[];
};

export type { Selection };
