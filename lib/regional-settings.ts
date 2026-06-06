export type RegionalSettings = {
  defaultLanguage: string;
  timezone: string;
};

export const DEFAULT_LANGUAGE = "en-US";
export const DEFAULT_TIMEZONE = "UTC";

export const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  defaultLanguage: DEFAULT_LANGUAGE,
  timezone: DEFAULT_TIMEZONE,
};

export const SUPPORTED_LOCALES = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-IN", label: "English (India)" },
  { code: "sr-RS", label: "Serbian (Serbia)" },
  { code: "sr-Cyrl-RS", label: "Serbian Cyrillic (Serbia)" },
  { code: "sr-Latn-RS", label: "Serbian Latin (Serbia)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "de-AT", label: "German (Austria)" },
  { code: "de-CH", label: "German (Switzerland)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "fr-CA", label: "French (Canada)" },
  { code: "fr-CH", label: "French (Switzerland)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "es-AR", label: "Spanish (Argentina)" },
  { code: "es-CO", label: "Spanish (Colombia)" },
  { code: "es-CL", label: "Spanish (Chile)" },
  { code: "it-IT", label: "Italian (Italy)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "nl-NL", label: "Dutch (Netherlands)" },
  { code: "nl-BE", label: "Dutch (Belgium)" },
  { code: "sv-SE", label: "Swedish (Sweden)" },
  { code: "da-DK", label: "Danish (Denmark)" },
  { code: "nb-NO", label: "Norwegian Bokmal (Norway)" },
  { code: "fi-FI", label: "Finnish (Finland)" },
  { code: "pl-PL", label: "Polish (Poland)" },
  { code: "cs-CZ", label: "Czech (Czechia)" },
  { code: "sk-SK", label: "Slovak (Slovakia)" },
  { code: "hu-HU", label: "Hungarian (Hungary)" },
  { code: "ro-RO", label: "Romanian (Romania)" },
  { code: "bg-BG", label: "Bulgarian (Bulgaria)" },
  { code: "el-GR", label: "Greek (Greece)" },
  { code: "hr-HR", label: "Croatian (Croatia)" },
  { code: "bs-BA", label: "Bosnian (Bosnia and Herzegovina)" },
  { code: "sl-SI", label: "Slovenian (Slovenia)" },
  { code: "mk-MK", label: "Macedonian (North Macedonia)" },
  { code: "sq-AL", label: "Albanian (Albania)" },
  { code: "tr-TR", label: "Turkish (Turkey)" },
  { code: "ru-RU", label: "Russian (Russia)" },
  { code: "uk-UA", label: "Ukrainian (Ukraine)" },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { code: "he-IL", label: "Hebrew (Israel)" },
  { code: "hi-IN", label: "Hindi (India)" },
  { code: "bn-BD", label: "Bengali (Bangladesh)" },
  { code: "ur-PK", label: "Urdu (Pakistan)" },
  { code: "fa-IR", label: "Persian (Iran)" },
  { code: "zh-CN", label: "Chinese Simplified (China)" },
  { code: "zh-TW", label: "Chinese Traditional (Taiwan)" },
  { code: "ja-JP", label: "Japanese (Japan)" },
  { code: "ko-KR", label: "Korean (South Korea)" },
  { code: "th-TH", label: "Thai (Thailand)" },
  { code: "vi-VN", label: "Vietnamese (Vietnam)" },
  { code: "id-ID", label: "Indonesian (Indonesia)" },
  { code: "ms-MY", label: "Malay (Malaysia)" },
] as const;

export const SUPPORTED_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Caracas",
  "America/Chicago",
  "America/Denver",
  "America/Detroit",
  "America/Edmonton",
  "America/Halifax",
  "America/Lima",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Montevideo",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/St_Johns",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Almaty",
  "Asia/Amman",
  "Asia/Bahrain",
  "Asia/Baku",
  "Asia/Bangkok",
  "Asia/Beirut",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Kuwait",
  "Asia/Manila",
  "Asia/Muscat",
  "Asia/Qatar",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tbilisi",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Asia/Yerevan",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Andorra",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Bratislava",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Budapest",
  "Europe/Chisinau",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Kyiv",
  "Europe/Lisbon",
  "Europe/Ljubljana",
  "Europe/London",
  "Europe/Luxembourg",
  "Europe/Madrid",
  "Europe/Malta",
  "Europe/Monaco",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Podgorica",
  "Europe/Prague",
  "Europe/Riga",
  "Europe/Rome",
  "Europe/Sarajevo",
  "Europe/Skopje",
  "Europe/Sofia",
  "Europe/Stockholm",
  "Europe/Tallinn",
  "Europe/Tirane",
  "Europe/Vienna",
  "Europe/Vilnius",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Europe/Zagreb",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Honolulu",
] as const;

export function isSupportedLocale(value: unknown): value is string {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.some((locale) => locale.code === value)
  );
}

export function isSupportedTimezone(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (SUPPORTED_TIMEZONES as readonly string[]).includes(value)
  );
}

export function normalizeRegionalSettings(input: {
  defaultLanguage?: unknown;
  timezone?: unknown;
}): RegionalSettings {
  return {
    defaultLanguage: isSupportedLocale(input.defaultLanguage)
      ? input.defaultLanguage
      : DEFAULT_LANGUAGE,
    timezone: isSupportedTimezone(input.timezone)
      ? input.timezone
      : DEFAULT_TIMEZONE,
  };
}

export function getDateFormatter(
  regional: RegionalSettings,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(regional.defaultLanguage, {
    timeZone: regional.timezone,
    ...options,
  });
}

export function formatRegionalDate(
  date: Date | string | number,
  regional: RegionalSettings,
): string {
  return getDateFormatter(regional, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRegionalDateTime(
  date: Date | string | number,
  regional: RegionalSettings,
): string {
  return getDateFormatter(regional, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRegionalTime(
  date: Date | string | number,
  regional: RegionalSettings,
): string {
  return getDateFormatter(regional, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

function getTimeZoneParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
  };
}

function padDatePart(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function zonedDateTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const targetUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  let utc = targetUtc;

  for (let i = 0; i < 3; i += 1) {
    const parts = getTimeZoneParts(new Date(utc), timeZone);
    const representedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      millisecond,
    );
    const nextUtc = utc - (representedUtc - targetUtc);
    if (nextUtc === utc) break;
    utc = nextUtc;
  }

  return new Date(utc);
}

export function formatDateTimeLocalInputValue(
  value: Date | string | null | undefined,
  timeZone: string,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = getTimeZoneParts(date, timeZone);
  return (
    [
      padDatePart(parts.year, 4),
      padDatePart(parts.month),
      padDatePart(parts.day),
    ].join("-") + `T${padDatePart(parts.hour)}:${padDatePart(parts.minute)}`
  );
}

export function dateTimeLocalInputToUtc(
  value: string | null | undefined,
  timeZone: string,
): Date | undefined {
  if (!value) return undefined;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
      value,
    );
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const millisecond = match[7] ? Number(match[7].padEnd(3, "0")) : 0;
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined;
  }

  const date = zonedDateTimeToUtc(
    timeZone,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  const parts = getTimeZoneParts(date, timeZone);
  if (
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== day ||
    parts.hour !== hour ||
    parts.minute !== minute ||
    parts.second !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    return undefined;
  }

  return date;
}

export function dateOnlyToUtcStart(
  value: string | undefined,
  timeZone: string,
): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return zonedDateTimeToUtc(
    timeZone,
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
}

export function dateOnlyToUtcEndExclusive(
  value: string | undefined,
  timeZone: string,
): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const nextDay = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1),
  );
  return zonedDateTimeToUtc(
    timeZone,
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth() + 1,
    nextDay.getUTCDate(),
  );
}
