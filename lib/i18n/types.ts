export type TextDirection = "ltr" | "rtl";

export type TranslationValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type TranslationValues = Record<string, TranslationValue>;

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export type PluralMessages = Readonly<Partial<Record<PluralCategory, string>>>;

export type MessageLeaf = string | PluralMessages;

export type Messages = {
  readonly [key: string]: MessageLeaf | Messages;
};

type StringKeyOf<T> = Extract<keyof T, string>;

type IsPluralMessages<T> = T extends object
  ? Exclude<StringKeyOf<T>, PluralCategory> extends never
    ? StringKeyOf<T> extends never
      ? false
      : T[StringKeyOf<T>] extends string
        ? true
        : false
    : false
  : false;

export type TranslationPath<T> = {
  [K in StringKeyOf<T>]: T[K] extends string
    ? K
    : IsPluralMessages<T[K]> extends true
      ? K
      : T[K] extends object
        ? `${K}.${TranslationPath<T[K]>}`
        : never;
}[StringKeyOf<T>];

export type PluralTranslationPath<T> = {
  [K in StringKeyOf<T>]: IsPluralMessages<T[K]> extends true
    ? K
    : T[K] extends object
      ? `${K}.${PluralTranslationPath<T[K]>}`
      : never;
}[StringKeyOf<T>];
