import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export const BACKEND_WEBSHOP_MENU_SOURCE_STRINGS = [
  "Webshop",
  "Settings",
  "Storefront",
  "Categories",
  "Products",
  "Orders",
  "Wishlist",
  "Promotions",
] as const;

type BackendWebshopMenuSource =
  (typeof BACKEND_WEBSHOP_MENU_SOURCE_STRINGS)[number];

const ROWS = {
  "sr-Latn":
    "Veb-prodavnica|Podešavanja|Izlog|Kategorije|Proizvodi|Porudžbine|Lista želja|Promocije",
  "sr-Cyrl":
    "Веб-продавница|Подешавања|Излог|Категорије|Производи|Поруџбине|Листа жеља|Промоције",
  hr: "Web-trgovina|Postavke|Izlog|Kategorije|Proizvodi|Narudžbe|Popis želja|Promocije",
  de: "Online-Shop|Einstellungen|Shopfront|Kategorien|Produkte|Bestellungen|Wunschliste|Aktionen",
  fr: "Boutique en ligne|Paramètres|Vitrine|Catégories|Produits|Commandes|Liste de souhaits|Offres promo",
  es: "Tienda online|Configuración|Escaparate|Categorías|Productos|Pedidos|Lista de deseos|Promociones",
  it: "Negozio online|Impostazioni|Vetrina|Categorie|Prodotti|Ordini|Lista desideri|Promozioni",
  pt: "Loja online|Definições|Montra|Categorias|Produtos|Encomendas|Lista de desejos|Promoções",
  "pt-BR":
    "Loja virtual|Configurações|Vitrine|Categorias|Produtos|Pedidos|Lista de desejos|Promoções",
  nl: "Webwinkel|Instellingen|Etalage|Categorieën|Producten|Bestellingen|Verlanglijst|Acties",
  pl: "Sklep online|Ustawienia|Witryna|Kategorie|Produkty|Zamówienia|Lista życzeń|Promocje",
  tr: "Web mağazası|Ayarlar|Vitrin|Kategoriler|Ürünler|Siparişler|İstek listesi|Promosyonlar",
  mk: "Веб-продавница|Поставки|Излог|Категории|Производи|Нарачки|Листа на желби|Промоции",
  bs: "Web-prodavnica|Postavke|Izlog|Kategorije|Proizvodi|Narudžbe|Lista želja|Promocije",
  sl: "Spletna trgovina|Nastavitve|Izložba|Kategorije|Izdelki|Naročila|Seznam želja|Promocije",
  ru: "Интернет-магазин|Настройки|Витрина|Категории|Товары|Заказы|Список желаний|Акции",
  hu: "Webáruház|Beállítások|Kirakat|Kategóriák|Termékek|Rendelések|Kívánságlista|Akciók",
  bg: "Онлайн магазин|Настройки|Витрина|Категории|Продукти|Поръчки|Списък с желания|Промоции",
  ja: "オンラインショップ|設定|ストアフロント|カテゴリ|商品|注文|ウィッシュリスト|プロモーション",
  "zh-Hans": "网店|设置|店面|分类|商品|订单|愿望清单|促销",
  "zh-Hant": "網店|設定|店面|分類|商品|訂單|願望清單|促銷",
  ar: "المتجر الإلكتروني|الإعدادات|واجهة المتجر|الفئات|المنتجات|الطلبات|قائمة الأمنيات|العروض الترويجية",
  id: "Toko online|Pengaturan|Etalase|Kategori|Produk|Pesanan|Daftar keinginan|Promosi",
  cs: "Internetový obchod|Nastavení|Výloha|Kategorie|Produkty|Objednávky|Seznam přání|Promo akce",
  ro: "Magazin online|Setări|Vitrină|Categorii|Produse|Comenzi|Listă de dorințe|Promoții",
  el: "Ηλεκτρονικό κατάστημα|Ρυθμίσεις|Βιτρίνα|Κατηγορίες|Προϊόντα|Παραγγελίες|Λίστα επιθυμιών|Προσφορές",
  da: "Netbutik|Indstillinger|Butiksfront|Kategorier|Produkter|Ordrer|Ønskeliste|Kampagner",
  sv: "Webbutik|Inställningar|Butiksfront|Kategorier|Produkter|Beställningar|Önskelista|Kampanjer",
  nb: "Nettbutikk|Innstillinger|Butikkfront|Kategorier|Produkter|Bestillinger|Ønskeliste|Kampanjer",
  nn: "Nettbutikk|Innstillingar|Butikkfront|Kategoriar|Produkt|Tingingar|Ønskjeliste|Kampanjar",
  fi: "Verkkokauppa|Asetukset|Kauppanäkymä|Kategoriat|Tuotteet|Tilaukset|Toivelista|Kampanjat",
  is: "Vefverslun|Stillingar|Verslunarsíða|Flokkar|Vörur|Pantanir|Óskalisti|Kynningar",
} satisfies Record<LocalizedLanguage, string>;

function createMap(
  language: string,
  row: string,
): Record<BackendWebshopMenuSource, string> {
  const translations = row.split("|");
  if (translations.length !== BACKEND_WEBSHOP_MENU_SOURCE_STRINGS.length) {
    throw new Error(
      `${language} backend webshop menu translations must have ${BACKEND_WEBSHOP_MENU_SOURCE_STRINGS.length} entries, received ${translations.length}.`,
    );
  }

  return Object.fromEntries(
    BACKEND_WEBSHOP_MENU_SOURCE_STRINGS.map((source, index) => [
      source,
      translations[index] ?? source,
    ]),
  ) as Record<BackendWebshopMenuSource, string>;
}

export const BACKEND_WEBSHOP_MENU_SOURCE_TRANSLATIONS = Object.fromEntries(
  Object.entries(ROWS).map(([language, row]) => [
    language,
    createMap(language, row),
  ]),
) as Record<LocalizedLanguage, Record<BackendWebshopMenuSource, string>>;
