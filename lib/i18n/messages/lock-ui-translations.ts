import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export const LOCK_UI_SOURCE_STRINGS = [
  "Editing — your changes are protected by an edit lock.",
  "Acquiring edit lock...",
] as const;

type LockUiSourceString = (typeof LOCK_UI_SOURCE_STRINGS)[number];

export const LOCK_UI_SOURCE_TRANSLATIONS = {
  "sr-Latn": {
    "Editing — your changes are protected by an edit lock.":
      "Uređivanje — tvoje izmene su zaštićene zaključavanjem za uređivanje.",
    "Acquiring edit lock...": "Preuzimanje zaključavanja za uređivanje...",
  },
  "sr-Cyrl": {
    "Editing — your changes are protected by an edit lock.":
      "Уређивање — твоје измене су заштићене закључавањем за уређивање.",
    "Acquiring edit lock...": "Преузимање закључавања за уређивање...",
  },
  hr: {
    "Editing — your changes are protected by an edit lock.":
      "Uređivanje — vaše promjene zaštićene su zaključavanjem uređivanja.",
    "Acquiring edit lock...": "Preuzimanje zaključavanja uređivanja...",
  },
  de: {
    "Editing — your changes are protected by an edit lock.":
      "Bearbeitung — deine Änderungen sind durch eine Bearbeitungssperre geschützt.",
    "Acquiring edit lock...": "Bearbeitungssperre wird angefordert...",
  },
  fr: {
    "Editing — your changes are protected by an edit lock.":
      "Modification — vos changements sont protégés par un verrou d'édition.",
    "Acquiring edit lock...": "Acquisition du verrou d'édition...",
  },
  es: {
    "Editing — your changes are protected by an edit lock.":
      "Editando — tus cambios están protegidos por un bloqueo de edición.",
    "Acquiring edit lock...": "Obteniendo bloqueo de edición...",
  },
  it: {
    "Editing — your changes are protected by an edit lock.":
      "Modifica — le tue modifiche sono protette da un blocco di modifica.",
    "Acquiring edit lock...": "Acquisizione del blocco di modifica...",
  },
  pt: {
    "Editing — your changes are protected by an edit lock.":
      "Edição — as suas alterações estão protegidas por um bloqueio de edição.",
    "Acquiring edit lock...": "A obter bloqueio de edição...",
  },
  "pt-BR": {
    "Editing — your changes are protected by an edit lock.":
      "Editando — suas alterações estão protegidas por um bloqueio de edição.",
    "Acquiring edit lock...": "Obtendo bloqueio de edição...",
  },
  nl: {
    "Editing — your changes are protected by an edit lock.":
      "Bewerken — je wijzigingen worden beschermd door een bewerkingsvergrendeling.",
    "Acquiring edit lock...": "Bewerkingsvergrendeling ophalen...",
  },
  pl: {
    "Editing — your changes are protected by an edit lock.":
      "Edycja — Twoje zmiany są chronione blokadą edycji.",
    "Acquiring edit lock...": "Uzyskiwanie blokady edycji...",
  },
  tr: {
    "Editing — your changes are protected by an edit lock.":
      "Düzenleme — değişiklikleriniz bir düzenleme kilidiyle korunuyor.",
    "Acquiring edit lock...": "Düzenleme kilidi alınıyor...",
  },
  mk: {
    "Editing — your changes are protected by an edit lock.":
      "Уредување — твоите промени се заштитени со заклучување за уредување.",
    "Acquiring edit lock...": "Се презема заклучување за уредување...",
  },
  bs: {
    "Editing — your changes are protected by an edit lock.":
      "Uređivanje — tvoje izmjene su zaštićene zaključavanjem uređivanja.",
    "Acquiring edit lock...": "Preuzimanje zaključavanja uređivanja...",
  },
  sl: {
    "Editing — your changes are protected by an edit lock.":
      "Urejanje — vaše spremembe so zaščitene z zaklepom urejanja.",
    "Acquiring edit lock...": "Pridobivanje zaklepa urejanja...",
  },
  ru: {
    "Editing — your changes are protected by an edit lock.":
      "Редактирование — ваши изменения защищены блокировкой редактирования.",
    "Acquiring edit lock...": "Получение блокировки редактирования...",
  },
  hu: {
    "Editing — your changes are protected by an edit lock.":
      "Szerkesztés — a módosításait szerkesztési zárolás védi.",
    "Acquiring edit lock...": "Szerkesztési zárolás megszerzése...",
  },
  bg: {
    "Editing — your changes are protected by an edit lock.":
      "Редактиране — промените ви са защитени със заключване за редактиране.",
    "Acquiring edit lock...": "Получаване на заключване за редактиране...",
  },
  ja: {
    "Editing — your changes are protected by an edit lock.":
      "編集中 — 変更は編集ロックで保護されています。",
    "Acquiring edit lock...": "編集ロックを取得しています...",
  },
  "zh-Hans": {
    "Editing — your changes are protected by an edit lock.":
      "正在编辑 — 您的更改受编辑锁保护。",
    "Acquiring edit lock...": "正在获取编辑锁...",
  },
  "zh-Hant": {
    "Editing — your changes are protected by an edit lock.":
      "正在編輯 — 您的變更受編輯鎖保護。",
    "Acquiring edit lock...": "正在取得編輯鎖...",
  },
  ar: {
    "Editing — your changes are protected by an edit lock.":
      "جار التحرير — تغييراتك محمية بقفل تحرير.",
    "Acquiring edit lock...": "جار الحصول على قفل التحرير...",
  },
  id: {
    "Editing — your changes are protected by an edit lock.":
      "Mengedit — perubahan Anda dilindungi oleh kunci edit.",
    "Acquiring edit lock...": "Mengambil kunci edit...",
  },
  cs: {
    "Editing — your changes are protected by an edit lock.":
      "Úpravy — vaše změny jsou chráněny zámkem úprav.",
    "Acquiring edit lock...": "Získávání zámku úprav...",
  },
  ro: {
    "Editing — your changes are protected by an edit lock.":
      "Editare — modificările dvs. sunt protejate de o blocare de editare.",
    "Acquiring edit lock...": "Se obține blocarea de editare...",
  },
  el: {
    "Editing — your changes are protected by an edit lock.":
      "Επεξεργασία — οι αλλαγές σας προστατεύονται από κλείδωμα επεξεργασίας.",
    "Acquiring edit lock...": "Λήψη κλειδώματος επεξεργασίας...",
  },
  da: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — dine ændringer er beskyttet af en redigeringslås.",
    "Acquiring edit lock...": "Henter redigeringslås...",
  },
  sv: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — dina ändringar skyddas av ett redigeringslås.",
    "Acquiring edit lock...": "Hämtar redigeringslås...",
  },
  nb: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — endringene dine er beskyttet av en redigeringslås.",
    "Acquiring edit lock...": "Henter redigeringslås...",
  },
  nn: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — endringane dine er verna av ein redigeringslås.",
    "Acquiring edit lock...": "Hentar redigeringslås...",
  },
  fi: {
    "Editing — your changes are protected by an edit lock.":
      "Muokkaus — muutoksesi on suojattu muokkauslukolla.",
    "Acquiring edit lock...": "Haetaan muokkauslukkoa...",
  },
  is: {
    "Editing — your changes are protected by an edit lock.":
      "Breyting — breytingarnar þínar eru varðar með breytingarlás.",
    "Acquiring edit lock...": "Sæki breytingarlás...",
  },
} satisfies Record<LocalizedLanguage, Record<LockUiSourceString, string>>;
