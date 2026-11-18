/**
 * Modèle de données du configurateur.
 *
 *  products   tracteurs et machines (une ligne = un modèle vendable)
 *  options    tout ce qui se greffe sur un tracteur : pneus, poste de conduite,
 *             options, chargeur, outils du chargeur
 *  quotes     demandes de devis (avec un instantané figé des lignes et des prix)
 *  saved_configs  configurations sauvegardées pour le lien de partage
 *
 * Tous les montants sont stockés en centimes d'euro HT (entiers) pour éviter
 * les erreurs d'arrondi. Un prix NULL signifie « prix sur demande ».
 */
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';

export type ProductKind = 'tractor' | 'machine';
export type OptionGroup = 'pneus' | 'poste' | 'option' | 'chargeur' | 'outil';
export type QuoteStatus = 'nouveau' | 'en_cours' | 'envoye' | 'accepte' | 'perdu';
export type Availability = 'en_stock' | 'sur_commande' | 'indisponible';
export type Mount = 'arriere' | 'avant' | 'traine' | 'chargeur';

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    ref: text('ref').notNull().unique(),
    slug: text('slug').notNull().unique(),
    kind: text('kind').$type<ProductKind>().notNull(),
    brand: text('brand').notNull(),
    /** Tracteurs : electrique | compact-18-30 | compact-30-50 | plus-70 ; machines : type (gyrobroyeur…) */
    category: text('category').notNull(),
    /** Machines : regroupe les largeurs d'un même modèle (ex. « garmech-gyrobroyeur-sl ») */
    family: text('family'),
    /** Nom commercial de la famille (ex. « Peruzzo Fox tondeuse à fléaux ») */
    familyName: text('family_name'),
    familyNameNl: text('family_name_nl'),
    nameFr: text('name_fr').notNull(),
    nameNl: text('name_nl'),
    descriptionFr: text('description_fr'),
    descriptionNl: text('description_nl'),
    /** Points forts, un par ligne */
    highlightsFr: text('highlights_fr'),
    highlightsNl: text('highlights_nl'),
    priceHt: integer('price_ht'),
    availability: text('availability').$type<Availability>().notNull().default('sur_commande'),
    leadTime: text('lead_time'),

    // ── Caractéristiques communes ──
    powerHp: numeric('power_hp', { mode: 'number' }),
    transmission: text('transmission'),
    weightKg: integer('weight_kg'),
    /** Catégorie d'attelage 3 points : « I », « II », « I/II »… */
    hitchCategory: text('hitch_category'),
    /** Type de prise de force : « 540 », « 540/540E », « 540/1000 », « non » */
    ptoType: text('pto_type'),

    // ── Tracteurs ──
    liftCapacityKg: integer('lift_capacity_kg'),
    /** Largeur d'outil conseillée maximale (cm) : au-delà, avertissement */
    maxImplementWidthCm: integer('max_implement_width_cm'),
    widthCm: integer('width_cm'),
    /** Usages : prairie, pelouse, cour, maraichage (séparés par « ; ») */
    usages: text('usages'),

    // ── Machines ──
    workingWidthCm: integer('working_width_cm'),
    minPowerHp: numeric('min_power_hp', { mode: 'number' }),
    maxPowerHp: numeric('max_power_hp', { mode: 'number' }),
    mount: text('mount').$type<Mount>(),
    needsPto: boolean('needs_pto'),

    /** Autres caractéristiques libres : [{ label, value }] */
    specs: jsonb('specs').$type<{ label: string; value: string }[]>().notNull().default([]),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    videoUrl: text('video_url'),
    brochureUrl: text('brochure_url'),
    /**
     * Vue 360° par séquence de photos. Motif d'URL avec {frame} (1..N) et
     * éventuellement {variant} (ex. « cabine-chargeur »). Voir le guide admin.
     */
    spinUrl: text('spin_url'),
    spinFrames: integer('spin_frames').default(36),
    /** Modèle 3D GLB, motif d'URL avec {variant} facultatif */
    modelUrl: text('model_url'),
    sourceUrl: text('source_url'),
    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    sort: integer('sort').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('products_kind_idx').on(t.kind, t.active)],
);

export const options = pgTable('options', {
  id: serial('id').primaryKey(),
  ref: text('ref').notNull().unique(),
  group: text('group').$type<OptionGroup>().notNull(),
  nameFr: text('name_fr').notNull(),
  nameNl: text('name_nl'),
  descriptionFr: text('description_fr'),
  descriptionNl: text('description_nl'),
  priceHt: integer('price_ht'),
  image: text('image'),
  /** Références des tracteurs concernés, séparées par « ; », ou « * » pour tous */
  tractorRefs: text('tractor_refs').notNull().default('*'),
  /** Tracteurs pour lesquels ce choix est sélectionné par défaut (ou « * ») */
  defaultFor: text('default_for'),
  /** Il faut au moins une de ces options (références séparées par « ; ») */
  requiresAny: text('requires_any'),
  /** Options incompatibles avec celle-ci */
  excludes: text('excludes'),
  /** Mot-clé visuel pour la vue 360° / 3D : cabine, arceau, chargeur, gazon… */
  visual: text('visual'),
  /** Mot-clé fonctionnel utilisé par les règles : relevage-avant, pdf-avant, homologation… */
  feature: text('feature'),
  tireFront: text('tire_front'),
  tireRear: text('tire_rear'),
  /** Largeur hors tout du tracteur avec ce choix de pneus (cm) */
  widthCm: integer('width_cm'),
  sourceUrl: text('source_url'),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type QuoteLine = {
  group: 'tracteur' | 'pneus' | 'poste' | 'option' | 'chargeur' | 'outil' | 'machine' | 'divers';
  ref: string | null;
  label: string;
  /** Prix HT en centimes ; null = sur demande */
  priceHt: number | null;
  qty: number;
};

export type Selection = {
  tractor: string;
  options: string[];
  machines: string[];
};

export type TradeIn = { brand?: string; model?: string; year?: string; photos?: string[] } | null;

export const quotes = pgTable(
  'quotes',
  {
    id: serial('id').primaryKey(),
    number: text('number').notNull().unique(),
    /** Jeton secret pour le lien client (/devis/<token>) */
    token: text('token').notNull().unique(),
    locale: text('locale').notNull().default('fr'),
    status: text('status').$type<QuoteStatus>().notNull().default('nouveau'),
    customerName: text('customer_name').notNull(),
    company: text('company'),
    vatNumber: text('vat_number'),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    address: text('address').notNull(),
    tradeIn: jsonb('trade_in').$type<TradeIn>(),
    financing: text('financing'),
    desiredDelay: text('desired_delay'),
    remarks: text('remarks'),
    selection: jsonb('selection').$type<Selection>().notNull(),
    lines: jsonb('lines').$type<QuoteLine[]>().notNull(),
    subtotalHt: integer('subtotal_ht').notNull(),
    discountHt: integer('discount_ht').notNull().default(0),
    totalHt: integer('total_ht').notNull(),
    vatRate: numeric('vat_rate', { mode: 'number' }).notNull().default(21),
    vatAmount: integer('vat_amount').notNull(),
    totalTtc: integer('total_ttc').notNull(),
    hasPriceOnRequest: boolean('has_price_on_request').notNull().default(false),
    validUntil: date('valid_until').notNull(),
    adminNote: text('admin_note'),
    /** Devis précédent quand le client a modifié sa configuration */
    parentId: integer('parent_id'),
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quotes_email_idx').on(t.email), index('quotes_status_idx').on(t.status)],
);

export const savedConfigs = pgTable('saved_configs', {
  id: text('id').primaryKey(),
  selection: jsonb('selection').$type<Selection>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
