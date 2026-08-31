export type TravelInputField =
  | {
    readonly kind: 'text' | 'date';
    readonly name: string;
    readonly label: string;
    readonly required: boolean;
  }
  | {
    readonly kind: 'integer';
    readonly name: string;
    readonly label: string;
    readonly required: boolean;
    readonly minimum: number;
    readonly maximum: number;
  }
  | {
    readonly kind: 'select';
    readonly name: string;
    readonly label: string;
    readonly required: boolean;
    readonly options: readonly string[];
  };

const MAX_FIELDS = 6;
const MAX_LABEL_CHARACTERS = 50;
const MAX_SELECT_OPTIONS = 12;
const UNSAFE_DISPLAY_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>&]/u;

const travelFields = {
  origin: { label: 'Origin', aliases: [], type: 'string' },
  destination: { label: 'Destination', aliases: [], type: 'string' },
  departureDate: { label: 'Departure date', aliases: [], type: 'date' },
  returnDate: { label: 'Return date', aliases: [], type: 'date' },
  adults: { label: 'Adults', aliases: [], type: 'integer', minimum: 1 },
  children: { label: 'Children', aliases: [], type: 'integer', minimum: 0 },
  infants: { label: 'Infants', aliases: [], type: 'integer', minimum: 0 },
  cabinClass: { label: 'Cabin class', aliases: ['Cabin'], type: 'string' },
  currency: { label: 'Currency', aliases: [], type: 'string' },
  country: { label: 'Country', aliases: [], type: 'string' },
} as const;

type TravelFieldName = keyof typeof travelFields;
type SchemaRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is SchemaRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: SchemaRecord, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function boundedDisplayText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || UNSAFE_DISPLAY_CHARACTERS.test(normalized)) return null;
  return Array.from(normalized).length <= MAX_LABEL_CHARACTERS ? normalized : null;
}

function parseRequired(value: unknown, propertyNames: readonly string[]): ReadonlySet<string> | null {
  if (value === undefined) return new Set();
  if (!Array.isArray(value)) return null;

  const required = new Set<string>();
  for (const name of value) {
    if (typeof name !== 'string' || !propertyNames.includes(name) || required.has(name)) {
      return null;
    }
    required.add(name);
  }
  return required;
}

function parseOptions(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SELECT_OPTIONS) {
    return null;
  }

  const options: string[] = [];
  for (const option of value) {
    const safeOption = boundedDisplayText(option);
    if (!safeOption || options.includes(safeOption)) return null;
    options.push(safeOption);
  }
  return options;
}

function parseLabel(
  value: unknown,
  definition: Readonly<{ label: string; aliases: readonly string[] }>,
): string | null {
  if (value === undefined) return definition.label;
  if (typeof value !== 'string') return null;
  return value === definition.label || definition.aliases.includes(value)
    ? value
    : null;
}

function parseField(
  name: TravelFieldName,
  value: unknown,
  required: boolean,
): TravelInputField | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['type', 'format', 'title', 'enum'])) {
    return null;
  }

  const definition = travelFields[name];
  const label = parseLabel(value.title, definition);
  if (!label) return null;

  if (definition.type === 'integer') {
    if (value.type !== 'integer' || value.format !== undefined || value.enum !== undefined) {
      return null;
    }
    return {
      kind: 'integer',
      name,
      label,
      required,
      minimum: definition.minimum,
      maximum: 9,
    };
  }

  if (definition.type === 'date') {
    if (value.type !== 'string' || value.format !== 'date' || value.enum !== undefined) {
      return null;
    }
    return { kind: 'date', name, label, required };
  }

  if (value.type !== 'string' || value.format !== undefined) return null;
  if (value.enum !== undefined) {
    const options = parseOptions(value.enum);
    if (!options) return null;
    return { kind: 'select', name, label, required, options };
  }
  return { kind: 'text', name, label, required };
}

export function parseTravelInputSchema(
  schema: Readonly<Record<string, unknown>>,
): readonly TravelInputField[] | null {
  if (!isRecord(schema) || !hasOnlyKeys(schema, ['type', 'properties', 'required'])) {
    return null;
  }
  if (schema.type !== 'object' || !isRecord(schema.properties)) return null;

  const propertyNames = Object.keys(schema.properties);
  if (propertyNames.length === 0 || propertyNames.length > MAX_FIELDS) return null;
  const required = parseRequired(schema.required, propertyNames);
  if (!required) return null;

  const fields: TravelInputField[] = [];
  for (const name of propertyNames) {
    if (!Object.hasOwn(travelFields, name)) return null;
    const field = parseField(name as TravelFieldName, schema.properties[name], required.has(name));
    if (!field) return null;
    fields.push(field);
  }
  return fields;
}
