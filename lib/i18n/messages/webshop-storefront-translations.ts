import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

const DECLARED_STOREFRONT_SOURCE_STRINGS = [
  "Overview",
  "Category presets",
  "Product presets",
  "Catalog browsing presets for category lists, product cards, filters, and product detail pages.",
  "Category browsing",
  "Product details",
  "Storefront overview",
  "Current browsing and product detail presets, with the same live previews used by the focused preset tabs.",
  "Category recipe",
  "Product recipe",
  "Custom",
  "Active recipe: {label}",
  "Preset recipes",
  "Custom category browsing configuration",
  "Custom product detail configuration",
  "Open presets",
  "Category preview",
  "Product preview",
  "Default retail",
  "B2B catalog",
  "Editorial",
  "3-column grid",
  "3-column grid + sidebar",
  "Mobile clean",
  "Sale promo",
  "Standard PDP",
  "Editorial PDP",
  "Carousel PDP",
  "B2B SKU PDP",
  "Digital PDP",
  "Service PDP",
  "Grid, filters, 12/page",
  "List, SKU, 36/page",
  "Banner, larger cards",
  "3-column product grid",
  "3-column grid, sidebar filters",
  "Drawer filters, clean grid",
  "Compact promo browsing",
  "Gallery left, purchase panel",
  "Top gallery, lean purchase",
  "Carousel media, full commerce",
  "SKU/stock, no promos",
  "Download info, no stock",
  "Booking info, no stock",
  "Layout",
  "Category image",
  "Card density",
  "Filter position",
  "Products per page",
  "Sorting options",
  "Show compare-at price",
  "Show SKU",
  "Show stock message",
  "Media layout",
  "Related products section",
  "Digital info blocks",
  "Service info blocks",
  "Relevance",
  "Newest",
  "Price low",
  "Price high",
  "Preview",
  "Sort",
  "Add to cart",
  "Low stock: {count} available",
  "Variant",
  "Quantity",
  "Specifications",
  "Materials",
  "Reviews",
  "Brand",
  "Price",
  "OS",
  "Package weight",
  "Package dimensions",
  "Delivery",
  "Download",
  "Duration",
  "Stock",
  "Black / Medium",
  "Digital delivery is protected",
  "60 minutes · online",
  "{count} enabled",
  "{count} products",
  "{count} available",
  "{count}/{total} enabled",
  "enabled",
  "hidden",
  "on",
  "off",
  "grid",
  "list",
  "thumbnail",
  "banner",
  "none",
  "showcase",
  "editorial",
  "comfortable",
  "compact",
  "left sidebar",
  "top bar",
  "mobile drawer",
  "gallery left",
  "gallery top",
  "carousel",
  "physical",
  "digital",
  "service",
  "Compare-at price",
  "Stock message",
  "Related products",
  "Digital info",
  "Service info",
  "Preview type",
  "Related section",
  "Commerce details",
  "Storefront presets saved.",
] as const;

const LOCALIZED_LANGUAGES = [
  "sr-Latn",
  "sr-Cyrl",
  "hr",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "pt-BR",
  "nl",
  "pl",
  "tr",
  "mk",
  "bs",
  "sl",
  "ru",
  "hu",
  "bg",
  "ja",
  "zh-Hans",
  "zh-Hant",
  "ar",
  "id",
  "cs",
  "ro",
  "el",
  "da",
  "sv",
  "nb",
  "nn",
  "fi",
  "is",
] as const satisfies readonly LocalizedLanguage[];

const ROWS = {
  Overview:
    "Pregled|Преглед|Pregled|Übersicht|Vue d'ensemble|Resumen|Panoramica|Visão geral|Visão geral|Overzicht|Przegląd|Genel bakış|Преглед|Pregled|Pregled|Обзор|Áttekintés|Общ преглед|概要|概览|概覽|نظرة عامة|Ringkasan|Přehled|Prezentare generală|Επισκόπηση|Overblik|Översikt|Oversikt|Oversyn|Yleiskatsaus|Yfirlit",
  "Category presets":
    "Preseti kategorija|Пресети категорија|Preseti kategorija|Kategorie-Presets|Préréglages de catégorie|Preajustes de categoría|Preset categoria|Predefinições de categoria|Predefinições de categoria|Categoriepresets|Presety kategorii|Kategori ön ayarları|Пресети за категории|Preseti kategorija|Prednastavitve kategorij|Пресеты категорий|Kategória-előbeállítások|Предварителни настройки за категории|カテゴリープリセット|分类预设|分類預設|إعدادات الفئات المسبقة|Preset kategori|Předvolby kategorií|Presetări categorii|Προεπιλογές κατηγοριών|Kategoriforudindstillinger|Kategoriförinställningar|Kategorioppsett|Kategorioppsett|Kategorian esiasetukset|Forstillingar flokka",
  "Product presets":
    "Preseti proizvoda|Пресети производа|Preseti proizvoda|Produkt-Presets|Préréglages de produit|Preajustes de producto|Preset prodotto|Predefinições de produto|Predefinições de produto|Productpresets|Presety produktów|Ürün ön ayarları|Пресети за производи|Preseti proizvoda|Prednastavitve izdelkov|Пресеты товаров|Termék-előbeállítások|Предварителни настройки за продукти|商品プリセット|产品预设|產品預設|إعدادات المنتجات المسبقة|Preset produk|Předvolby produktů|Presetări produse|Προεπιλογές προϊόντων|Produktforudindstillinger|Produktförinställningar|Produktoppsett|Produktoppsett|Tuotteen esiasetukset|Forstillingar vara",
  "Catalog browsing presets for category lists, product cards, filters, and product detail pages.":
    "Preseti izloga za liste kategorija, kartice proizvoda, filtere i stranice detalja proizvoda.|Пресети излога за листе категорија, картице производа, филтере и странице детаља производа.|Preseti izloga za popise kategorija, kartice proizvoda, filtre i stranice detalja proizvoda.|Katalog-Presets für Kategorienlisten, Produktkarten, Filter und Produktdetailseiten.|Préréglages de navigation catalogue pour listes de catégories, fiches produit, filtres et pages détail produit.|Preajustes de navegación del catálogo para listas de categorías, tarjetas de producto, filtros y páginas de detalle.|Preset di navigazione catalogo per elenchi categorie, schede prodotto, filtri e pagine dettaglio.|Predefinições de navegação do catálogo para listas de categorias, cartões de produto, filtros e páginas de detalhe.|Predefinições de navegação do catálogo para listas de categorias, cartões de produto, filtros e páginas de detalhe.|Cataloguspresets voor categorielijsten, productkaarten, filters en productdetailpagina's.|Presety przeglądania katalogu dla list kategorii, kart produktów, filtrów i stron szczegółów.|Kategori listeleri, ürün kartları, filtreler ve ürün detay sayfaları için katalog gezinme ön ayarları.|Пресети за прелистување каталог за листи категории, картички производи, филтри и страници со детали.|Preseti izloga za liste kategorija, kartice proizvoda, filtere i stranice detalja.|Prednastavitve kataloga za sezname kategorij, kartice izdelkov, filtre in strani podrobnosti.|Пресеты просмотра каталога для списков категорий, карточек товаров, фильтров и страниц деталей.|Katalógusböngészési előbeállítások kategórialistákhoz, termékkártyákhoz, szűrőkhöz és részletekhez.|Предварителни настройки за каталог, списъци категории, продуктови карти, филтри и детайлни страници.|カテゴリ一覧、商品カード、フィルター、商品詳細ページ用のカタログ閲覧プリセット。|用于分类列表、产品卡片、筛选器和产品详情页的目录浏览预设。|用於分類列表、產品卡片、篩選器和產品詳情頁的目錄瀏覽預設。|إعدادات تصفح الكتالوج لقوائم الفئات وبطاقات المنتجات والفلاتر وصفحات التفاصيل.|Preset penelusuran katalog untuk daftar kategori, kartu produk, filter, dan halaman detail.|Předvolby procházení katalogu pro seznamy kategorií, karty produktů, filtry a detailní stránky.|Presetări de navigare catalog pentru liste de categorii, carduri produs, filtre și pagini de detalii.|Προεπιλογές περιήγησης καταλόγου για λίστες κατηγοριών, κάρτες προϊόντων, φίλτρα και σελίδες λεπτομερειών.|Katalogforudindstillinger til kategorilister, produktkort, filtre og produktsider.|Katalogförinställningar för kategorilistor, produktkort, filter och produktsidor.|Katalogoppsett for kategorilister, produktkort, filtre og produktsider.|Katalogoppsett for kategorilister, produktkort, filter og produktsider.|Katalogin selausesiasetukset kategorioille, tuotekorteille, suodattimille ja tuotesivuille.|Forstillingar for katalogvising av kategorilister, varekort, filter og detaljsider.",
  "Category browsing":
    "Pregled kategorija|Преглед категорија|Pregled kategorija|Kategorie-Browsing|Navigation catégorie|Exploración de categorías|Navigazione categorie|Navegação de categorias|Navegação de categorias|Categorieën bladeren|Przeglądanie kategorii|Kategori gezinmesi|Прелистување категории|Pregled kategorija|Brskanje po kategorijah|Просмотр категорий|Kategóriaböngészés|Преглед на категории|カテゴリ閲覧|分类浏览|分類瀏覽|تصفح الفئات|Jelajah kategori|Procházení kategorií|Navigare categorii|Περιήγηση κατηγοριών|Kategoribrowsing|Kategoribläddring|Kategoribrowsing|Kategorivising|Kategorioiden selaus|Kategorivising",
  "Product details":
    "Detalji proizvoda|Детаљи производа|Detalji proizvoda|Produktdetails|Détails du produit|Detalles del producto|Dettagli prodotto|Detalhes do produto|Detalhes do produto|Productdetails|Szczegóły produktu|Ürün detayları|Детали за производ|Detalji proizvoda|Podrobnosti izdelka|Сведения о товаре|Termékrészletek|Детайли за продукт|商品詳細|产品详情|產品詳情|تفاصيل المنتج|Detail produk|Detaily produktu|Detalii produs|Λεπτομέρειες προϊόντος|Produktdetaljer|Produktdetaljer|Produktdetaljer|Varedetaljar|Tuotetiedot|Vöruupplýsingar",
  "Storefront overview":
    "Pregled izloga|Преглед излога|Pregled izloga|Shopfront-Übersicht|Vue d'ensemble de la boutique|Resumen del escaparate|Panoramica vetrina|Visão geral da loja|Visão geral da loja|Storefront-overzicht|Przegląd witryny sklepu|Vitrin genel bakışı|Преглед на излог|Pregled izloga|Pregled izložbe|Обзор витрины|Kirakat áttekintése|Преглед на витрина|ストアフロント概要|店面概览|店面概覽|نظرة عامة على الواجهة|Ringkasan etalase|Přehled obchodu|Prezentare vitrină|Επισκόπηση βιτρίνας|Butiksoversigt|Butiksöversikt|Butikkoversikt|Butikkoversyn|Kauppanäkymän yleiskatsaus|Yfirlit verslunar",
  "Current browsing and product detail presets, with the same live previews used by the focused preset tabs.":
    "Trenutni preseti pregleda i detalja proizvoda, sa istim živim prikazima kao u fokusiranim tabovima preseta.|Тренутни пресети прегледа и детаља производа, са истим живим приказима као у фокусираним табовима пресета.|Trenutni preseti pregledavanja i detalja proizvoda, s istim živim pregledima kao u fokusiranim tabovima.|Aktuelle Browsing- und Produktdetail-Presets mit denselben Live-Vorschauen wie in den Preset-Tabs.|Préréglages actuels de navigation et de détail produit, avec les mêmes aperçus en direct que les onglets dédiés.|Preajustes actuales de navegación y detalle, con las mismas vistas previas en vivo de las pestañas.|Preset attuali di navigazione e dettaglio prodotto con le stesse anteprime live delle schede.|Predefinições atuais de navegação e detalhe com as mesmas pré-visualizações ao vivo dos separadores.|Predefinições atuais de navegação e detalhe com as mesmas prévias ao vivo das abas.|Huidige browse- en productdetailpresets met dezelfde live previews als de preset-tabs.|Bieżące presety przeglądania i szczegółów z tymi samymi podglądami co zakładki.|Geçerli gezinme ve ürün detay ön ayarları, odaklı sekmelerdeki canlı önizlemelerle.|Тековни пресети за преглед и детали, со истите живи прегледи од табовите.|Trenutni preseti pregleda i detalja, sa istim živim prikazima kao u tabovima.|Trenutne prednastavitve brskanja in podrobnosti z enakimi živimi predogledi.|Текущие пресеты просмотра и деталей с теми же живыми превью.|Aktuális böngészési és részlet előbeállítások ugyanazokkal az élő előnézetekkel.|Текущи настройки за преглед и детайли със същите живи визуализации.|現在の閲覧・商品詳細プリセットと同じライブプレビュー。|当前浏览和详情预设，并使用相同实时预览。|目前瀏覽和詳情預設，並使用相同即時預覽。|إعدادات التصفح والتفاصيل الحالية مع نفس المعاينات الحية.|Preset penelusuran dan detail saat ini dengan pratinjau langsung yang sama.|Aktuální předvolby procházení a detailu se stejnými živými náhledy.|Presetări curente de navigare și detalii cu aceleași previzualizări live.|Τρέχουσες προεπιλογές περιήγησης και λεπτομερειών με τις ίδιες ζωντανές προεπισκοπήσεις.|Aktuelle browsing- og detaljeforudindstillinger med samme livevisninger.|Aktuella bläddrings- och detaljförinställningar med samma liveförhandsvisningar.|Gjeldende oppsett for browsing og detaljer med samme liveforhåndsvisninger.|Gjeldande oppsett for vising og detaljar med same liveførehandsvisingar.|Nykyiset selaus- ja tuotetietoasetukset samoilla live-esikatseluilla.|Núverandi vafur- og vöruupplýsingaforstillingar með sömu lifandi forskoðunum.",
  "Category recipe":
    "Recept kategorija|Рецепт категорија|Recept kategorije|Kategorie-Rezept|Recette catégorie|Receta de categoría|Ricetta categoria|Receita de categoria|Receita de categoria|Categorierecept|Recept kategorii|Kategori tarifi|Рецепт за категорија|Recept kategorije|Recept kategorije|Рецепт категории|Kategória recept|Рецепта за категория|カテゴリーレシピ|分类方案|分類方案|وصفة الفئة|Resep kategori|Recept kategorie|Rețetă categorie|Συνταγή κατηγορίας|Kategoriopskrift|Kategorirecept|Kategorioppskrift|Kategorioppskrift|Kategoriaresepti|Uppskrift flokks",
  "Product recipe":
    "Recept proizvoda|Рецепт производа|Recept proizvoda|Produkt-Rezept|Recette produit|Receta de producto|Ricetta prodotto|Receita de produto|Receita de produto|Productrecept|Recept produktu|Ürün tarifi|Рецепт за производ|Recept proizvoda|Recept izdelka|Рецепт товара|Termék recept|Рецепта за продукт|商品レシピ|产品方案|產品方案|وصفة المنتج|Resep produk|Recept produktu|Rețetă produs|Συνταγή προϊόντος|Produktopskrift|Produktrecept|Produktoppskrift|Produktoppskrift|Tuoteresepti|Uppskrift vöru",
  Custom:
    "Prilagođeno|Прилагођено|Prilagođeno|Benutzerdefiniert|Personnalisé|Personalizado|Personalizzato|Personalizado|Personalizado|Aangepast|Własne|Özel|Прилагодено|Prilagođeno|Prilagojeno|Пользовательское|Egyéni|Персонализирано|カスタム|自定义|自訂|مخصص|Kustom|Vlastní|Personalizat|Προσαρμοσμένο|Tilpasset|Anpassad|Tilpasset|Tilpassa|Mukautettu|Sérsniðið",
  "Active recipe: {label}":
    "Aktivni recept: {label}|Активни рецепт: {label}|Aktivni recept: {label}|Aktives Rezept: {label}|Recette active : {label}|Receta activa: {label}|Ricetta attiva: {label}|Receita ativa: {label}|Receita ativa: {label}|Actief recept: {label}|Aktywny recept: {label}|Aktif tarif: {label}|Активен рецепт: {label}|Aktivni recept: {label}|Aktiven recept: {label}|Активный рецепт: {label}|Aktív recept: {label}|Активна рецепта: {label}|有効なレシピ: {label}|当前方案：{label}|目前方案：{label}|الوصفة النشطة: {label}|Resep aktif: {label}|Aktivní recept: {label}|Rețetă activă: {label}|Ενεργή συνταγή: {label}|Aktiv opskrift: {label}|Aktivt recept: {label}|Aktiv oppskrift: {label}|Aktiv oppskrift: {label}|Aktiivinen resepti: {label}|Virk uppskrift: {label}",
  "Preset recipes":
    "Recepti preseta|Рецепти пресета|Recepti preseta|Preset-Rezepte|Recettes de préréglage|Recetas de preajuste|Ricette preset|Receitas de predefinição|Receitas de predefinição|Presetrecepten|Recepty presetów|Ön ayar tarifleri|Рецепти за пресети|Recepti preseta|Recepti prednastavitev|Рецепты пресетов|Előbeállítási receptek|Рецепти за настройки|プリセットレシピ|预设方案|預設方案|وصفات الإعدادات|Resep preset|Recepty předvoleb|Rețete presetare|Συνταγές προεπιλογών|Forudindstillingsopskrifter|Förinställningsrecept|Oppskriftsoppsett|Oppskriftsoppsett|Esiasetusreseptit|Forstillingauppskriftir",
  "Custom category browsing configuration":
    "Prilagođena konfiguracija pregleda kategorija|Прилагођена конфигурација прегледа категорија|Prilagođena konfiguracija pregledavanja kategorija|Benutzerdefinierte Kategorie-Browsing-Konfiguration|Configuration personnalisée de navigation catégorie|Configuración personalizada de categorías|Configurazione personalizzata categorie|Configuração personalizada de categorias|Configuração personalizada de categorias|Aangepaste categorieconfiguratie|Własna konfiguracja kategorii|Özel kategori gezinme yapılandırması|Прилагодена конфигурација за категории|Prilagođena konfiguracija kategorija|Prilagojena konfiguracija kategorij|Пользовательская настройка категорий|Egyéni kategóriaböngészési beállítás|Персонализирана настройка за категории|カスタムカテゴリー閲覧設定|自定义分类浏览配置|自訂分類瀏覽設定|تكوين تصفح فئات مخصص|Konfigurasi kategori kustom|Vlastní konfigurace kategorií|Configurare categorii personalizată|Προσαρμοσμένη διαμόρφωση κατηγοριών|Tilpasset kategorikonfiguration|Anpassad kategorikonfiguration|Tilpasset kategorikonfigurasjon|Tilpassa kategorikonfigurasjon|Mukautettu kategorianselaus|Sérsniðin flokkastilling",
  "Custom product detail configuration":
    "Prilagođena konfiguracija detalja proizvoda|Прилагођена конфигурација детаља производа|Prilagođena konfiguracija detalja proizvoda|Benutzerdefinierte Produktdetail-Konfiguration|Configuration personnalisée du détail produit|Configuración personalizada de detalle|Configurazione personalizzata dettaglio|Configuração personalizada de detalhe|Configuração personalizada de detalhe|Aangepaste productdetailconfiguratie|Własna konfiguracja szczegółów|Özel ürün detay yapılandırması|Прилагодена конфигурација за детали|Prilagođena konfiguracija detalja|Prilagojena konfiguracija podrobnosti|Пользовательская настройка деталей|Egyéni termékrészlet-beállítás|Персонализирана настройка за детайли|カスタム商品詳細設定|自定义产品详情配置|自訂產品詳情設定|تكوين تفاصيل منتج مخصص|Konfigurasi detail produk kustom|Vlastní konfigurace detailu|Configurare detalii personalizată|Προσαρμοσμένη διαμόρφωση λεπτομερειών|Tilpasset produktdetaljekonfiguration|Anpassad produktdetaljkonfiguration|Tilpasset produktdetaljoppsett|Tilpassa varedetaljoppsett|Mukautettu tuotetietoasetus|Sérsniðin vöruupplýsingastilling",
  "Open presets":
    "Otvori presete|Отвори пресете|Otvori presete|Presets öffnen|Ouvrir les préréglages|Abrir preajustes|Apri preset|Abrir predefinições|Abrir predefinições|Presets openen|Otwórz presety|Ön ayarları aç|Отвори пресети|Otvori presete|Odpri prednastavitve|Открыть пресеты|Előbeállítások megnyitása|Отвори настройки|プリセットを開く|打开预设|開啟預設|فتح الإعدادات|Buka preset|Otevřít předvolby|Deschide presetările|Άνοιγμα προεπιλογών|Åbn forudindstillinger|Öppna förinställningar|Åpne oppsett|Opne oppsett|Avaa esiasetukset|Opna forstillingar",
  "Category preview":
    "Pregled kategorije|Преглед категорије|Pregled kategorije|Kategorie-Vorschau|Aperçu catégorie|Vista previa de categoría|Anteprima categoria|Pré-visualização de categoria|Prévia de categoria|Categorievoorbeeld|Podgląd kategorii|Kategori önizlemesi|Преглед на категорија|Pregled kategorije|Predogled kategorije|Предпросмотр категории|Kategória előnézet|Преглед на категория|カテゴリープレビュー|分类预览|分類預覽|معاينة الفئة|Pratinjau kategori|Náhled kategorie|Previzualizare categorie|Προεπισκόπηση κατηγορίας|Kategoriforhåndsvisning|Kategoriförhandsvisning|Kategoriforhåndsvisning|Kategoriførehandsvising|Kategorian esikatselu|Forskoðun flokks",
  "Product preview":
    "Pregled proizvoda|Преглед производа|Pregled proizvoda|Produktvorschau|Aperçu produit|Vista previa de producto|Anteprima prodotto|Pré-visualização de produto|Prévia de produto|Productvoorbeeld|Podgląd produktu|Ürün önizlemesi|Преглед на производ|Pregled proizvoda|Predogled izdelka|Предпросмотр товара|Termék előnézet|Преглед на продукт|商品プレビュー|产品预览|產品預覽|معاينة المنتج|Pratinjau produk|Náhled produktu|Previzualizare produs|Προεπισκόπηση προϊόντος|Produktforhåndsvisning|Produktförhandsvisning|Produktforhåndsvisning|Vareførehandsvising|Tuotteen esikatselu|Forskoðun vöru",
  "Storefront presets saved.":
    "Preseti izloga su sačuvani.|Пресети излога су сачувани.|Preseti izloga su spremljeni.|Shopfront-Presets gespeichert.|Préréglages de boutique enregistrés.|Preajustes del escaparate guardados.|Preset vetrina salvati.|Predefinições da loja guardadas.|Predefinições da loja salvas.|Storefrontpresets opgeslagen.|Presety witryny zapisane.|Vitrin ön ayarları kaydedildi.|Пресетите на излогот се зачувани.|Preseti izloga su sačuvani.|Prednastavitve izložbe so shranjene.|Пресеты витрины сохранены.|Kirakat előbeállításai mentve.|Настройките на витрината са запазени.|ストアフロントプリセットを保存しました。|店面预设已保存。|店面預設已儲存。|تم حفظ إعدادات الواجهة.|Preset etalase disimpan.|Předvolby obchodu uloženy.|Presetările vitrinei au fost salvate.|Οι προεπιλογές βιτρίνας αποθηκεύτηκαν.|Butiksforudindstillinger gemt.|Butiksförinställningar sparade.|Butikkoppsett lagret.|Butikkoppsett lagra.|Kauppanäkymän esiasetukset tallennettu.|Forstillingar verslunar vistaðar.",
  "Default retail":
    "Podrazumevana prodaja|Подразумевана продаја|Zadana prodaja|Standardhandel|Commerce par défaut|Venta predeterminada|Retail predefinito|Retalho padrão|Varejo padrão|Standaard retail|Domyślna sprzedaż|Varsayılan perakende|Стандардна продажба|Podrazumijevana prodaja|Privzeta prodaja|Стандартная розница|Alapértelmezett kiskereskedelem|Стандартна продажба|標準小売|默认零售|預設零售|تجزئة افتراضية|Retail default|Výchozí retail|Retail implicit|Προεπιλεγμένη λιανική|Standard detail|Standardbutik|Standard detaljhandel|Standard detaljhandel|Oletusvähittäismyynti|Sjálfgefin smásala",
  "B2B catalog":
    "B2B katalog|B2B каталог|B2B katalog|B2B-Katalog|Catalogue B2B|Catálogo B2B|Catalogo B2B|Catálogo B2B|Catálogo B2B|B2B-catalogus|Katalog B2B|B2B kataloğu|B2B каталог|B2B katalog|B2B katalog|B2B-каталог|B2B katalógus|B2B каталог|B2Bカタログ|B2B 目录|B2B 目錄|كتالوج B2B|Katalog B2B|B2B katalog|Catalog B2B|Κατάλογος B2B|B2B-katalog|B2B-katalog|B2B-katalog|B2B-katalog|B2B-luettelo|B2B vörulisti",
  Editorial:
    "Urednički|Уреднички|Urednički|Editorial|Éditorial|Editorial|Editoriale|Editorial|Editorial|Redactioneel|Edytorialny|Editoryal|Уреднички|Urednički|Uredniško|Редакционный|Szerkesztői|Редакционен|エディトリアル|编辑精选|編輯精選|تحريري|Editorial|Redakční|Editorial|Συντακτικό|Redaktionel|Redaktionell|Redaksjonell|Redaksjonell|Toimituksellinen|Ritstjórnarlegt",
  "3-column grid":
    "Mreža sa 3 kolone|Мрежа са 3 колоне|Mreža s 3 stupca|3-Spalten-Raster|Grille 3 colonnes|Cuadrícula de 3 columnas|Griglia a 3 colonne|Grelha de 3 colunas|Grade de 3 colunas|Raster met 3 kolommen|Siatka 3-kolumnowa|3 sütunlu ızgara|Мрежа со 3 колони|Mreža sa 3 kolone|Mreža s 3 stolpci|Сетка в 3 колонки|3 oszlopos rács|Мрежа с 3 колони|3列グリッド|三列网格|三欄網格|شبكة بثلاثة أعمدة|Grid 3 kolom|Mřížka se 3 sloupci|Grilă cu 3 coloane|Πλέγμα 3 στηλών|Gitter med 3 kolonner|Rutnät med 3 kolumner|Rutenett med 3 kolonner|Rutenett med 3 kolonnar|3 sarakkeen ruudukko|3 dálka grind",
  "3-column grid + sidebar":
    "Mreža sa 3 kolone + bočna traka|Мрежа са 3 колоне + бочна трака|Mreža s 3 stupca + bočna traka|3-Spalten-Raster + Seitenleiste|Grille 3 colonnes + barre latérale|Cuadrícula 3 columnas + barra lateral|Griglia 3 colonne + barra laterale|Grelha 3 colunas + barra lateral|Grade 3 colunas + barra lateral|3-kolommenraster + zijbalk|Siatka 3 kolumny + pasek boczny|3 sütunlu ızgara + kenar çubuğu|Мрежа со 3 колони + странична лента|Mreža sa 3 kolone + bočna traka|Mreža s 3 stolpci + stranska vrstica|Сетка 3 колонки + боковая панель|3 oszlopos rács + oldalsáv|Мрежа 3 колони + странична лента|3列グリッド + サイドバー|三列网格 + 侧边栏|三欄網格 + 側邊欄|شبكة 3 أعمدة + شريط جانبي|Grid 3 kolom + sidebar|Mřížka 3 sloupce + postranní panel|Grilă 3 coloane + bară laterală|Πλέγμα 3 στηλών + πλευρική μπάρα|3-kolonners gitter + sidepanel|3-kolumners rutnät + sidofält|3-kolonne rutenett + sidefelt|3-kolonne rutenett + sidefelt|3 saraketta + sivupalkki|3 dálka grind + hliðarstika",
  "Mobile clean":
    "Čisto za mobilni|Чисто за мобилни|Čisto za mobilni|Mobil klar|Mobile épuré|Móvil limpio|Mobile pulito|Mobile limpo|Mobile limpo|Mobiel schoon|Czysty mobile|Mobil sade|Чисто за мобилен|Čisto za mobilni|Čisto mobilno|Чистый мобильный|Letisztult mobil|Чист мобилен|モバイル簡潔|移动端简洁|行動端簡潔|موبايل نظيف|Mobile bersih|Čistý mobil|Mobil curat|Καθαρό mobile|Ren mobil|Ren mobil|Ren mobil|Rein mobil|Siisti mobiili|Hreint farsíma",
  "Sale promo":
    "Promocija rasprodaje|Промоција распродаје|Promocija rasprodaje|Sale-Promo|Promo soldes|Promoción de oferta|Promo saldi|Promoção de saldos|Promoção de ofertas|Aanbiedingspromo|Promocja wyprzedaży|İndirim promosyonu|Промоција за распродажба|Promocija rasprodaje|Prodajna promocija|Промо распродажи|Akciós promóció|Промоция разпродажба|セールプロモ|促销推广|促銷推廣|ترويج التخفيضات|Promo obral|Promo akce|Promo reducere|Προώθηση προσφοράς|Udsalgspromo|Reakampanj|Salgskampanje|Salskampanje|Alennuskampanja|Útsölukynning",
  "Standard PDP":
    "Standardna PDP|Стандардна PDP|Standardni PDP|Standard-PDP|PDP standard|PDP estándar|PDP standard|PDP padrão|PDP padrão|Standaard PDP|Standardowy PDP|Standart PDP|Стандардна PDP|Standardna PDP|Standardni PDP|Стандартная PDP|Alap PDP|Стандартна PDP|標準PDP|标准 PDP|標準 PDP|PDP قياسي|PDP standar|Standardní PDP|PDP standard|Τυπικό PDP|Standard PDP|Standard-PDP|Standard PDP|Standard PDP|Vakio PDP|Staðlað PDP",
  "Editorial PDP":
    "Urednička PDP|Уредничка PDP|Urednički PDP|Editorial-PDP|PDP éditoriale|PDP editorial|PDP editoriale|PDP editorial|PDP editorial|Redactionele PDP|PDP edytorialny|Editoryal PDP|Уредничка PDP|Urednička PDP|Uredniški PDP|Редакционная PDP|Szerkesztői PDP|Редакционна PDP|エディトリアルPDP|编辑 PDP|編輯 PDP|PDP تحريري|PDP editorial|Redakční PDP|PDP editorial|Συντακτικό PDP|Redaktionel PDP|Redaktionell PDP|Redaksjonell PDP|Redaksjonell PDP|Toimituksellinen PDP|Ritstjórnarlegt PDP",
  "Carousel PDP":
    "Karusel PDP|Карусел PDP|Karusel PDP|Karussell-PDP|PDP carrousel|PDP carrusel|PDP carosello|PDP carrossel|PDP carrossel|Carousel-PDP|PDP karuzela|Karusel PDP|Карусел PDP|Karusel PDP|Vrtiljak PDP|PDP-карусель|Körhinta PDP|Карусел PDP|カルーセルPDP|轮播 PDP|輪播 PDP|PDP دائري|PDP carousel|Karusel PDP|PDP carusel|PDP καρουζέλ|Karrusel PDP|Karusell-PDP|Karusell PDP|Karusell PDP|Karuselli PDP|Hringekju PDP",
  "B2B SKU PDP":
    "B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B-SKU-PDP|PDP SKU B2B|PDP SKU B2B|PDP SKU B2B|PDP SKU B2B|PDP SKU B2B|B2B-SKU-PDP|PDP SKU B2B|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|PDP SKU B2B|PDP SKU B2B|B2B SKU PDP|PDP SKU B2B|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP|B2B SKU PDP",
  "Digital PDP":
    "Digitalna PDP|Дигитална PDP|Digitalni PDP|Digitale PDP|PDP numérique|PDP digital|PDP digitale|PDP digital|PDP digital|Digitale PDP|Cyfrowy PDP|Dijital PDP|Дигитална PDP|Digitalna PDP|Digitalni PDP|Цифровая PDP|Digitális PDP|Дигитална PDP|デジタルPDP|数字 PDP|數位 PDP|PDP رقمي|PDP digital|Digitální PDP|PDP digital|Ψηφιακό PDP|Digital PDP|Digital PDP|Digital PDP|Digital PDP|Digitaalinen PDP|Stafræn PDP",
  "Service PDP":
    "PDP usluge|PDP услуге|PDP usluge|Service-PDP|PDP service|PDP servicio|PDP servizio|PDP serviço|PDP serviço|Service-PDP|PDP usługi|Hizmet PDP|PDP услуга|PDP usluge|PDP storitve|PDP услуги|Szolgáltatás PDP|PDP услуга|サービスPDP|服务 PDP|服務 PDP|PDP خدمة|PDP layanan|PDP služby|PDP serviciu|PDP υπηρεσίας|Service PDP|Tjänst PDP|Tjeneste PDP|Teneste PDP|Palvelu PDP|Þjónustu PDP",
  "Grid, filters, 12/page":
    "Mreža, filteri, 12/strani|Мрежа, филтери, 12/страни|Mreža, filtri, 12/stranici|Raster, Filter, 12/Seite|Grille, filtres, 12/page|Cuadrícula, filtros, 12/página|Griglia, filtri, 12/pagina|Grelha, filtros, 12/página|Grade, filtros, 12/página|Raster, filters, 12/pagina|Siatka, filtry, 12/strona|Izgara, filtreler, 12/sayfa|Мрежа, филтри, 12/страница|Mreža, filteri, 12/stranici|Mreža, filtri, 12/stran|Сетка, фильтры, 12/страница|Rács, szűrők, 12/oldal|Мрежа, филтри, 12/страница|グリッド、フィルター、12/ページ|网格、筛选器、12/页|網格、篩選器、12/頁|شبكة، فلاتر، 12/صفحة|Grid, filter, 12/halaman|Mřížka, filtry, 12/stránka|Grilă, filtre, 12/pagină|Πλέγμα, φίλτρα, 12/σελίδα|Gitter, filtre, 12/side|Rutnät, filter, 12/sida|Rutenett, filtre, 12/side|Rutenett, filter, 12/side|Ruudukko, suodattimet, 12/sivu|Grind, síur, 12/síðu",
  "List, SKU, 36/page":
    "Lista, SKU, 36/strani|Листа, SKU, 36/страни|Popis, SKU, 36/stranici|Liste, SKU, 36/Seite|Liste, SKU, 36/page|Lista, SKU, 36/página|Lista, SKU, 36/pagina|Lista, SKU, 36/página|Lista, SKU, 36/página|Lijst, SKU, 36/pagina|Lista, SKU, 36/strona|Liste, SKU, 36/sayfa|Листа, SKU, 36/страница|Lista, SKU, 36/stranici|Seznam, SKU, 36/stran|Список, SKU, 36/страница|Lista, SKU, 36/oldal|Списък, SKU, 36/страница|リスト、SKU、36/ページ|列表、SKU、36/页|清單、SKU、36/頁|قائمة، SKU، 36/صفحة|Daftar, SKU, 36/halaman|Seznam, SKU, 36/stránka|Listă, SKU, 36/pagină|Λίστα, SKU, 36/σελίδα|Liste, SKU, 36/side|Lista, SKU, 36/sida|Liste, SKU, 36/side|Liste, SKU, 36/side|Lista, SKU, 36/sivu|Listi, SKU, 36/síðu",
  "Banner, larger cards":
    "Baner, veće kartice|Банер, веће картице|Banner, veće kartice|Banner, größere Karten|Bannière, cartes plus grandes|Banner, tarjetas más grandes|Banner, schede più grandi|Banner, cartões maiores|Banner, cards maiores|Banner, grotere kaarten|Baner, większe karty|Banner, daha büyük kartlar|Банер, поголеми картички|Baner, veće kartice|Pasica, večje kartice|Баннер, крупные карточки|Banner, nagyobb kártyák|Банер, по-големи карти|バナー、大きなカード|横幅，更大的卡片|橫幅，較大的卡片|بانر، بطاقات أكبر|Banner, kartu lebih besar|Banner, větší karty|Banner, carduri mai mari|Banner, μεγαλύτερες κάρτες|Banner, større kort|Banner, större kort|Banner, større kort|Banner, større kort|Banneri, suuremmat kortit|Borði, stærri spjöld",
  "3-column product grid":
    "Mreža proizvoda u 3 kolone|Мрежа производа у 3 колоне|Mreža proizvoda u 3 stupca|Produktraster mit 3 Spalten|Grille produits sur 3 colonnes|Cuadrícula de productos de 3 columnas|Griglia prodotti a 3 colonne|Grelha de produtos em 3 colunas|Grade de produtos em 3 colunas|Productraster met 3 kolommen|Siatka produktów w 3 kolumnach|3 sütunlu ürün ızgarası|Мрежа производи во 3 колони|Mreža proizvoda u 3 kolone|Mreža izdelkov v 3 stolpcih|Сетка товаров в 3 колонки|3 oszlopos termékrács|Продуктова мрежа с 3 колони|3列の商品グリッド|三列产品网格|三欄產品網格|شبكة منتجات بثلاثة أعمدة|Grid produk 3 kolom|Mřížka produktů ve 3 sloupcích|Grilă produse pe 3 coloane|Πλέγμα προϊόντων 3 στηλών|Produktgitter med 3 kolonner|Produkt rutnät med 3 kolumner|Produktrutenett med 3 kolonner|Varerutenett med 3 kolonnar|3 sarakkeen tuoteruudukko|Vörugrind með 3 dálkum",
  "3-column grid, sidebar filters":
    "Mreža u 3 kolone, filteri u bočnoj traci|Мрежа у 3 колоне, филтери у бочној траци|Mreža u 3 stupca, filtri u bočnoj traci|3-Spalten-Raster, Seitenleistenfilter|Grille 3 colonnes, filtres latéraux|Cuadrícula de 3 columnas, filtros laterales|Griglia a 3 colonne, filtri laterali|Grelha de 3 colunas, filtros laterais|Grade de 3 colunas, filtros laterais|Raster met 3 kolommen, zijbalkfilters|Siatka 3-kolumnowa, filtry boczne|3 sütunlu ızgara, yan filtreler|Мрежа со 3 колони, странични филтри|Mreža u 3 kolone, filteri u bočnoj traci|Mreža s 3 stolpci, stranski filtri|Сетка в 3 колонки, боковые фильтры|3 oszlopos rács, oldalsávszűrők|Мрежа с 3 колони, странични филтри|3列グリッド、サイドバーフィルター|三列网格，侧边栏筛选器|三欄網格，側邊欄篩選器|شبكة بثلاثة أعمدة، فلاتر جانبية|Grid 3 kolom, filter sidebar|Mřížka ve 3 sloupcích, boční filtry|Grilă pe 3 coloane, filtre laterale|Πλέγμα 3 στηλών, πλαϊνά φίλτρα|Gitter med 3 kolonner, sidefiltre|Rutnät med 3 kolumner, sidofilter|Rutenett med 3 kolonner, sidefiltre|Rutenett med 3 kolonnar, sidefilter|3 sarakkeen ruudukko, sivusuodattimet|Grind með 3 dálkum, hliðarsíur",
  "Drawer filters, clean grid":
    "Filteri u fioci, čista mreža|Филтери у фиоци, чиста мрежа|Filtri u ladici, čista mreža|Drawer-Filter, klares Raster|Filtres en tiroir, grille épurée|Filtros en cajón, cuadrícula limpia|Filtri in drawer, griglia pulita|Filtros em gaveta, grelha limpa|Filtros em gaveta, grade limpa|Drawerfilters, strak raster|Filtry w szufladzie, czysta siatka|Çekmece filtreleri, temiz ızgara|Филтри во фиока, чиста мрежа|Filteri u ladici, čista mreža|Filtri v predalu, čista mreža|Фильтры в панели, чистая сетка|Fiókszűrők, letisztult rács|Филтри в drawer, чиста мрежа|ドロワーフィルター、すっきりしたグリッド|抽屉筛选器，简洁网格|抽屜篩選器，簡潔網格|فلاتر درج، شبكة نظيفة|Filter drawer, grid bersih|Filtry v panelu, čistá mřížka|Filtre în sertar, grilă curată|Φίλτρα συρταριού, καθαρό πλέγμα|Skuffefiltre, rent gitter|Lådfilter, rent rutnät|Skuffefiltre, rent rutenett|Skuffefilter, reint rutenett|Vetolaatikkosuodattimet, selkeä ruudukko|Skúffusíur, hrein grind",
  "Compact promo browsing":
    "Kompaktno promo pregledanje|Компактно промо прегледање|Kompaktno promo pregledavanje|Kompaktes Promo-Browsing|Navigation promo compacte|Exploración promocional compacta|Navigazione promo compatta|Navegação promo compacta|Navegação promo compacta|Compact promotie-overzicht|Kompaktowe przeglądanie promo|Kompakt promosyon gezintisi|Компактно промо прелистување|Kompaktno promo pregledanje|Kompaktno promocijsko brskanje|Компактный промо-просмотр|Kompakt promóciós böngészés|Компактно промо преглеждане|コンパクトなプロモ閲覧|紧凑促销浏览|緊湊促銷瀏覽|تصفح ترويجي مضغوط|Browsing promo ringkas|Kompaktní promo procházení|Navigare promo compactă|Συμπαγής προωθητική περιήγηση|Kompakt promobrowsing|Kompakt kampanjbläddring|Kompakt kampanjebrowsing|Kompakt kampanjevising|Tiivis kampanjaselaus|Þjappað kynningarflakk",
  "Gallery left, purchase panel":
    "Galerija levo, panel kupovine|Галерија лево, панел куповине|Galerija lijevo, panel kupnje|Galerie links, Kaufpanel|Galerie à gauche, panneau d'achat|Galería izquierda, panel de compra|Galleria a sinistra, pannello acquisto|Galeria à esquerda, painel de compra|Galeria à esquerda, painel de compra|Galerij links, kooppaneel|Galeria po lewej, panel zakupu|Galeri solda, satın alma paneli|Галерија лево, панел за купување|Galerija lijevo, panel kupovine|Galerija levo, nakupni panel|Галерея слева, панель покупки|Galéria balra, vásárlási panel|Галерия вляво, панел за покупка|左ギャラリー、購入パネル|左侧图库，购买面板|左側圖庫，購買面板|معرض يسار، لوحة شراء|Galeri kiri, panel pembelian|Galerie vlevo, nákupní panel|Galerie stânga, panou cumpărare|Γκαλερί αριστερά, πάνελ αγοράς|Galleri venstre, købspanel|Galleri vänster, köppanel|Galleri venstre, kjøpspanel|Galleri venstre, kjøpspanel|Galleria vasemmalla, ostapaneeli|Gallerí vinstra, kaupborð",
  "Top gallery, lean purchase":
    "Galerija gore, sažeta kupovina|Галерија горе, сажета куповина|Galerija gore, sažeta kupnja|Galerie oben, schlanker Kaufbereich|Galerie en haut, achat allégé|Galería superior, compra ligera|Galleria in alto, acquisto essenziale|Galeria no topo, compra simples|Galeria no topo, compra simples|Galerij boven, compacte koopflow|Galeria u góry, lekki zakup|Galeri üstte, yalın satın alma|Галерија горе, кратко купување|Galerija gore, sažeta kupovina|Galerija zgoraj, poenostavljen nakup|Галерея сверху, компактная покупка|Galéria felül, karcsú vásárlás|Галерия горе, олекотена покупка|上部ギャラリー、簡潔な購入|顶部图库，简洁购买|頂部圖庫，精簡購買|معرض أعلى، شراء مبسط|Galeri atas, pembelian ringkas|Galerie nahoře, úsporný nákup|Galerie sus, cumpărare simplă|Γκαλερί επάνω, λιτή αγορά|Galleri øverst, enkel køb|Galleri överst, smidigt köp|Galleri øverst, enkel kjøp|Galleri øvst, enkelt kjøp|Galleria ylhäällä, kevyt ostaminen|Gallerí efst, einföld kaup",
  "Carousel media, full commerce":
    "Karusel medija, puna trgovina|Карусел медија, пуна трговина|Medijski karusel, puna trgovina|Medienkarussell, vollständiger Commerce|Médias en carrousel, commerce complet|Carrusel de medios, comercio completo|Media carosello, commercio completo|Media em carrossel, comércio completo|Mídia em carrossel, comércio completo|Mediacarousel, volledige commerce|Karuzela mediów, pełny handel|Medya karuseli, tam ticaret|Карусел медиуми, целосна трговија|Karusel medija, puna trgovina|Medijski vrtiljak, polna trgovina|Карусель медиа, полный commerce|Médiakörhinta, teljes kereskedelem|Медиен карусел, пълна търговия|カルーセルメディア、完全なコマース|轮播媒体，完整商务|輪播媒體，完整商務|وسائط دائرية، تجارة كاملة|Media carousel, commerce lengkap|Mediální karusel, plný obchod|Media carusel, comerț complet|Καρουζέλ μέσων, πλήρες commerce|Mediekarrusel, fuld handel|Mediakarusell, full handel|Mediekarusell, full handel|Mediekarusell, full handel|Mediakaruselli, täysi kaupankäynti|Miðlahringekja, full verslun",
  "SKU/stock, no promos":
    "SKU/stanje, bez promocija|SKU/стање, без промоција|SKU/zaliha, bez promocija|SKU/Bestand, keine Promos|SKU/stock, sans promos|SKU/stock, sin promociones|SKU/scorte, niente promo|SKU/stock, sem promoções|SKU/estoque, sem promoções|SKU/voorraad, geen promo's|SKU/stan, bez promocji|SKU/stok, promosuz|SKU/залиха, без промоции|SKU/zaliha, bez promocija|SKU/zaloga, brez promocij|SKU/наличие, без промо|SKU/készlet, promók nélkül|SKU/наличност, без промоции|SKU/在庫、プロモなし|SKU/库存，无促销|SKU/庫存，無促銷|SKU/مخزون، بلا عروض|SKU/stok, tanpa promo|SKU/sklad, bez promí|SKU/stoc, fără promoții|SKU/απόθεμα, χωρίς προσφορές|SKU/lager, ingen kampagner|SKU/lager, inga kampanjer|SKU/lager, ingen kampanjer|SKU/lager, ingen kampanjar|SKU/varasto, ei kampanjoita|SKU/birgðir, engar kynningar",
  "Download info, no stock":
    "Informacije za preuzimanje, bez stanja|Информације за преузимање, без стања|Informacije za preuzimanje, bez zalihe|Download-Info, kein Bestand|Infos de téléchargement, pas de stock|Información de descarga, sin stock|Info download, senza scorte|Info de download, sem stock|Info de download, sem estoque|Downloadinfo, geen voorraad|Informacje pobrania, bez stanu|İndirme bilgisi, stok yok|Информации за преземање, без залиха|Informacije za preuzimanje, bez zalihe|Informacije za prenos, brez zaloge|Информация о скачивании, без наличия|Letöltési információ, készlet nélkül|Информация за изтегляне, без наличност|ダウンロード情報、在庫なし|下载信息，无库存|下載資訊，無庫存|معلومات التنزيل، بلا مخزون|Info unduhan, tanpa stok|Informace ke stažení, bez skladu|Informații descărcare, fără stoc|Πληροφορίες λήψης, χωρίς απόθεμα|Downloadinfo, intet lager|Nedladdningsinfo, inget lager|Nedlastingsinfo, ingen lager|Nedlastingsinfo, ikkje lager|Lataustiedot, ei varastoa|Niðurhalsupplýsingar, engar birgðir",
  "Booking info, no stock":
    "Informacije za rezervaciju, bez stanja|Информације за резервацију, без стања|Informacije za rezervaciju, bez zalihe|Buchungsinfo, kein Bestand|Infos de réservation, pas de stock|Información de reserva, sin stock|Info prenotazione, senza scorte|Info de reserva, sem stock|Info de reserva, sem estoque|Boekingsinfo, geen voorraad|Informacje rezerwacji, bez stanu|Rezervasyon bilgisi, stok yok|Информации за резервација, без залиха|Informacije za rezervaciju, bez zalihe|Informacije za rezervacijo, brez zaloge|Информация о бронировании, без наличия|Foglalási információ, készlet nélkül|Информация за резервация, без наличност|予約情報、在庫なし|预订信息，无库存|預訂資訊，無庫存|معلومات الحجز، بلا مخزون|Info pemesanan, tanpa stok|Informace k rezervaci, bez skladu|Informații rezervare, fără stoc|Πληροφορίες κράτησης, χωρίς απόθεμα|Bookinginfo, intet lager|Bokningsinfo, inget lager|Bestillingsinfo, ingen lager|Tingingsinfo, ikkje lager|Varaustiedot, ei varastoa|Bókunarupplýsingar, engar birgðir",
  Layout:
    "Raspored|Распоред|Raspored|Layout|Mise en page|Diseño|Layout|Layout|Layout|Lay-out|Układ|Yerleşim|Распоред|Raspored|Postavitev|Макет|Elrendezés|Оформление|レイアウト|布局|版面配置|التخطيط|Tata letak|Rozvržení|Aspect|Διάταξη|Layout|Layout|Layout|Utforming|Asettelu|Útlit",
  "Category image":
    "Slika kategorije|Слика категорије|Slika kategorije|Kategoriebild|Image de catégorie|Imagen de categoría|Immagine categoria|Imagem da categoria|Imagem da categoria|Categorieafbeelding|Obraz kategorii|Kategori görseli|Слика на категорија|Slika kategorije|Slika kategorije|Изображение категории|Kategóriakép|Изображение на категория|カテゴリー画像|分类图片|分類圖片|صورة الفئة|Gambar kategori|Obrázek kategorie|Imagine categorie|Εικόνα κατηγορίας|Kategoribillede|Kategoribild|Kategoribilde|Kategoribilete|Kategorian kuva|Mynd flokks",
  "Card density":
    "Gustina kartica|Густина картица|Gustoća kartica|Kartendichte|Densité des cartes|Densidad de tarjetas|Densità schede|Densidade dos cartões|Densidade dos cards|Kaartdichtheid|Gęstość kart|Kart yoğunluğu|Густина на картички|Gustina kartica|Gostota kartic|Плотность карточек|Kártyasűrűség|Плътност на картите|カード密度|卡片密度|卡片密度|كثافة البطاقات|Kepadatan kartu|Hustota karet|Densitate carduri|Πυκνότητα καρτών|Korttæthed|Korttäthet|Korttetthet|Korttettleik|Korttien tiheys|Þéttleiki spjalda",
  "Filter position":
    "Pozicija filtera|Позиција филтера|Položaj filtra|Filterposition|Position des filtres|Posición del filtro|Posizione filtri|Posição dos filtros|Posição dos filtros|Filterpositie|Pozycja filtra|Filtre konumu|Позиција на филтер|Pozicija filtera|Položaj filtrov|Позиция фильтров|Szűrő pozíciója|Позиция на филтър|フィルター位置|筛选器位置|篩選器位置|موضع الفلاتر|Posisi filter|Pozice filtru|Poziție filtre|Θέση φίλτρων|Filterplacering|Filterposition|Filterposisjon|Filterposisjon|Suodattimen sijainti|Staðsetning síu",
  "Products per page":
    "Proizvoda po strani|Производа по страни|Proizvoda po stranici|Produkte pro Seite|Produits par page|Productos por página|Prodotti per pagina|Produtos por página|Produtos por página|Producten per pagina|Produktów na stronę|Sayfa başına ürün|Производи по страна|Proizvoda po stranici|Izdelkov na stran|Товаров на странице|Termék oldalanként|Продукти на страница|ページあたり商品数|每页产品数|每頁產品數|منتجات لكل صفحة|Produk per halaman|Produktů na stránku|Produse pe pagină|Προϊόντα ανά σελίδα|Produkter pr. side|Produkter per sida|Produkter per side|Varer per side|Tuotteita sivulla|Vörur á síðu",
  "Sorting options":
    "Opcije sortiranja|Опције сортирања|Opcije sortiranja|Sortieroptionen|Options de tri|Opciones de ordenación|Opzioni di ordinamento|Opções de ordenação|Opções de ordenação|Sorteeropties|Opcje sortowania|Sıralama seçenekleri|Опции за сортирање|Opcije sortiranja|Možnosti razvrščanja|Параметры сортировки|Rendezési opciók|Опции за сортиране|並び替えオプション|排序选项|排序選項|خيارات الفرز|Opsi pengurutan|Možnosti řazení|Opțiuni sortare|Επιλογές ταξινόμησης|Sorteringsmuligheder|Sorteringsalternativ|Sorteringsvalg|Sorteringsval|Lajitteluasetukset|Röðunarvalkostir",
  "Show compare-at price":
    "Prikaži precrtanu cenu|Прикажи прецртану цену|Prikaži usporednu cijenu|Vergleichspreis anzeigen|Afficher le prix barré|Mostrar precio comparativo|Mostra prezzo di confronto|Mostrar preço comparativo|Mostrar preço comparativo|Vergelijkingsprijs tonen|Pokaż cenę porównawczą|Karşılaştırma fiyatını göster|Прикажи споредбена цена|Prikaži poredbenu cijenu|Prikaži primerjalno ceno|Показать старую цену|Összehasonlító ár mutatása|Покажи стара цена|比較価格を表示|显示对比价格|顯示比較價格|إظهار سعر المقارنة|Tampilkan harga pembanding|Zobrazit porovnávací cenu|Afișează preț comparativ|Εμφάνιση συγκριτικής τιμής|Vis førpris|Visa jämförpris|Vis førpris|Vis førpris|Näytä vertailuhinta|Sýna samanburðarverð",
  "Show SKU":
    "Prikaži SKU|Прикажи SKU|Prikaži SKU|SKU anzeigen|Afficher SKU|Mostrar SKU|Mostra SKU|Mostrar SKU|Mostrar SKU|SKU tonen|Pokaż SKU|SKU göster|Прикажи SKU|Prikaži SKU|Prikaži SKU|Показать SKU|SKU megjelenítése|Покажи SKU|SKUを表示|显示 SKU|顯示 SKU|إظهار SKU|Tampilkan SKU|Zobrazit SKU|Afișează SKU|Εμφάνιση SKU|Vis SKU|Visa SKU|Vis SKU|Vis SKU|Näytä SKU|Sýna SKU",
  "Show stock message":
    "Prikaži poruku o stanju|Прикажи поруку о стању|Prikaži poruku o zalihi|Bestandsmeldung anzeigen|Afficher le message de stock|Mostrar mensaje de stock|Mostra messaggio scorte|Mostrar mensagem de stock|Mostrar mensagem de estoque|Voorraadbericht tonen|Pokaż komunikat o stanie|Stok mesajını göster|Прикажи порака за залиха|Prikaži poruku o zalihi|Prikaži sporočilo zaloge|Показать сообщение о наличии|Készletüzenet mutatása|Покажи съобщение за наличност|在庫メッセージを表示|显示库存消息|顯示庫存訊息|إظهار رسالة المخزون|Tampilkan pesan stok|Zobrazit zprávu skladu|Afișează mesaj stoc|Εμφάνιση μηνύματος αποθέματος|Vis lagerbesked|Visa lagermeddelande|Vis lagerbeskjed|Vis lagermelding|Näytä varastoviesti|Sýna birgðaskilaboð",
  "Media layout":
    "Raspored medija|Распоред медија|Raspored medija|Medienlayout|Mise en page média|Diseño de medios|Layout media|Layout de media|Layout de mídia|Media-layout|Układ mediów|Medya yerleşimi|Распоред на медиуми|Raspored medija|Postavitev medijev|Макет медиа|Médiaelrendezés|Оформление на медии|メディアレイアウト|媒体布局|媒體版面|تخطيط الوسائط|Tata letak media|Rozvržení médií|Aspect media|Διάταξη μέσων|Medielayout|Medielayout|Medieoppsett|Medieoppsett|Median asettelu|Uppsetning miðla",
  "Related products section":
    "Sekcija povezanih proizvoda|Секција повезаних производа|Sekcija povezanih proizvoda|Bereich verwandte Produkte|Section produits liés|Sección de productos relacionados|Sezione prodotti correlati|Secção produtos relacionados|Seção produtos relacionados|Sectie gerelateerde producten|Sekcja produktów powiązanych|İlgili ürünler bölümü|Секција поврзани производи|Sekcija povezanih proizvoda|Razdelek povezanih izdelkov|Раздел похожих товаров|Kapcsolódó termékek szakasz|Секция свързани продукти|関連商品セクション|相关产品区块|相關產品區塊|قسم المنتجات ذات الصلة|Bagian produk terkait|Sekce souvisejících produktů|Secțiune produse asociate|Ενότητα σχετικών προϊόντων|Sektion med relaterede produkter|Sektion för relaterade produkter|Seksjon for relaterte produkter|Seksjon for relaterte varer|Liittyvien tuotteiden osio|Hluti tengdra vara",
  "Digital info blocks":
    "Blokovi digitalnih informacija|Блокови дигиталних информација|Blokovi digitalnih informacija|Digitale Infoblöcke|Blocs d'infos numériques|Bloques de información digital|Blocchi info digitali|Blocos de info digital|Blocos de info digital|Digitale infoblokken|Bloki informacji cyfrowej|Dijital bilgi blokları|Блокови со дигитални информации|Blokovi digitalnih informacija|Bloki digitalnih informacij|Блоки цифровой информации|Digitális információs blokkok|Блокове с дигитална информация|デジタル情報ブロック|数字信息区块|數位資訊區塊|كتل معلومات رقمية|Blok info digital|Bloky digitálních informací|Blocuri informații digitale|Μπλοκ ψηφιακών πληροφοριών|Digitale infoblokke|Digitala informationsblock|Digitale infoblokker|Digitale infoblokker|Digitaalisen tiedon lohkot|Stafrænir upplýsingareitir",
  "Service info blocks":
    "Blokovi informacija o usluzi|Блокови информација о услузи|Blokovi informacija o usluzi|Service-Infoblöcke|Blocs d'infos service|Bloques de información de servicio|Blocchi info servizio|Blocos de info de serviço|Blocos de info de serviço|Service-infoblokken|Bloki informacji o usłudze|Hizmet bilgi blokları|Блокови со информации за услуга|Blokovi informacija o usluzi|Bloki informacij o storitvi|Блоки информации об услуге|Szolgáltatási információs blokkok|Блокове с информация за услуга|サービス情報ブロック|服务信息区块|服務資訊區塊|كتل معلومات الخدمة|Blok info layanan|Bloky informací o službě|Blocuri informații serviciu|Μπλοκ πληροφοριών υπηρεσίας|Serviceinfoblokke|Tjänsteinformationsblock|Tjenesteinfoblokker|Tenesteinfoblokker|Palvelutiedon lohkot|Upplýsingareitir þjónustu",
  Relevance:
    "Relevantnost|Релевантност|Relevantnost|Relevanz|Pertinence|Relevancia|Rilevanza|Relevância|Relevância|Relevantie|Trafność|Alaka|Релевантност|Relevantnost|Ustreznost|Релевантность|Relevancia|Релевантност|関連度|相关性|相關性|الصلة|Relevansi|Relevance|Relevanță|Συνάφεια|Relevans|Relevans|Relevans|Relevans|Osuvuus|Samsvörun",
  Newest:
    "Najnovije|Најновије|Najnovije|Neueste|Plus récents|Más recientes|Più recenti|Mais recentes|Mais recentes|Nieuwste|Najnowsze|En yeni|Најново|Najnovije|Najnovejše|Новейшие|Legújabb|Най-нови|新着順|最新|最新|الأحدث|Terbaru|Nejnovější|Cele mai noi|Νεότερα|Nyeste|Nyast|Nyeste|Nyaste|Uusimmat|Nýjast",
  "Price low":
    "Cena rastuće|Цена растуће|Cijena rastuće|Preis aufsteigend|Prix croissant|Precio bajo|Prezzo crescente|Preço baixo|Preço baixo|Prijs laag|Cena rosnąco|Düşük fiyat|Цена растечки|Cijena rastuće|Cena naraščajoče|Цена по возрастанию|Ár növekvő|Цена възходящо|価格の安い順|低价优先|低價優先|السعر الأقل|Harga rendah|Cena vzestupně|Preț crescător|Χαμηλή τιμή|Lav pris|Lägst pris|Lav pris|Låg pris|Edullisin|Lægsta verð",
  "Price high":
    "Cena opadajuće|Цена опадајуће|Cijena opadajuće|Preis absteigend|Prix décroissant|Precio alto|Prezzo decrescente|Preço alto|Preço alto|Prijs hoog|Cena malejąco|Yüksek fiyat|Цена опаѓачки|Cijena opadajuće|Cena padajoče|Цена по убыванию|Ár csökkenő|Цена низходящо|価格の高い順|高价优先|高價優先|السعر الأعلى|Harga tinggi|Cena sestupně|Preț descrescător|Υψηλή τιμή|Høj pris|Högst pris|Høy pris|Høg pris|Kallein|Hæsta verð",
  Preview:
    "Pregled|Преглед|Pregled|Vorschau|Aperçu|Vista previa|Anteprima|Pré-visualização|Prévia|Voorbeeld|Podgląd|Önizleme|Преглед|Pregled|Predogled|Предпросмотр|Előnézet|Преглед|プレビュー|预览|預覽|معاينة|Pratinjau|Náhled|Previzualizare|Προεπισκόπηση|Forhåndsvisning|Förhandsvisning|Forhåndsvisning|Førehandsvising|Esikatselu|Forskoðun",
  Sort: "Sortiraj|Сортирај|Sortiraj|Sortieren|Trier|Ordenar|Ordina|Ordenar|Ordenar|Sorteren|Sortuj|Sırala|Сортирај|Sortiraj|Razvrsti|Сортировать|Rendezés|Сортирай|並び替え|排序|排序|فرز|Urutkan|Řadit|Sortează|Ταξινόμηση|Sorter|Sortera|Sorter|Sorter|Lajittele|Raða",
  "Add to cart":
    "Dodaj u korpu|Додај у корпу|Dodaj u košaricu|In den Warenkorb|Ajouter au panier|Añadir al carrito|Aggiungi al carrello|Adicionar ao carrinho|Adicionar ao carrinho|Toevoegen aan winkelwagen|Dodaj do koszyka|Sepete ekle|Додај во кошничка|Dodaj u korpu|Dodaj v košarico|Добавить в корзину|Kosárba|Добави в количката|カートに追加|加入购物车|加入購物車|أضف إلى السلة|Tambah ke keranjang|Přidat do košíku|Adaugă în coș|Προσθήκη στο καλάθι|Læg i kurv|Lägg i varukorg|Legg i handlekurv|Legg i handlekorg|Lisää ostoskoriin|Bæta í körfu",
  "Low stock: {count} available":
    "Malo na stanju: dostupno {count}|Мало на стању: доступно {count}|Malo zaliha: dostupno {count}|Niedriger Bestand: {count} verfügbar|Stock faible : {count} disponible(s)|Poco stock: {count} disponibles|Scorte basse: {count} disponibili|Stock baixo: {count} disponíveis|Estoque baixo: {count} disponíveis|Lage voorraad: {count} beschikbaar|Niski stan: dostępne {count}|Düşük stok: {count} mevcut|Мала залиха: достапни {count}|Malo na zalihi: dostupno {count}|Nizka zaloga: na voljo {count}|Мало в наличии: доступно {count}|Alacsony készlet: {count} elérhető|Ниска наличност: налични {count}|在庫わずか: {count} 点あり|库存不足：可用 {count}|庫存不足：可用 {count}|مخزون منخفض: {count} متاح|Stok rendah: {count} tersedia|Nízký sklad: {count} dostupné|Stoc redus: {count} disponibile|Χαμηλό απόθεμα: {count} διαθέσιμα|Lav lagerbeholdning: {count} tilgængelige|Lågt lager: {count} tillgängliga|Lav lagerbeholdning: {count} tilgjengelig|Låg lagerbehaldning: {count} tilgjengeleg|Varasto vähissä: {count} saatavilla|Lítið á lager: {count} tiltækt",
  Variant:
    "Varijanta|Варијанта|Varijanta|Variante|Variante|Variante|Variante|Variante|Variante|Variant|Wariant|Varyant|Варијанта|Varijanta|Različica|Вариант|Változat|Вариант|バリエーション|变体|變體|الخيار|Varian|Varianta|Variantă|Παραλλαγή|Variant|Variant|Variant|Variant|Muunnelma|Afbrigði",
  Quantity:
    "Količina|Количина|Količina|Menge|Quantité|Cantidad|Quantità|Quantidade|Quantidade|Aantal|Ilość|Adet|Количина|Količina|Količina|Количество|Mennyiség|Количество|数量|数量|數量|الكمية|Jumlah|Množství|Cantitate|Ποσότητα|Antal|Antal|Antall|Tal|Määrä|Magn",
  Specifications:
    "Specifikacije|Спецификације|Specifikacije|Spezifikationen|Spécifications|Especificaciones|Specifiche|Especificações|Especificações|Specificaties|Specyfikacje|Özellikler|Спецификации|Specifikacije|Specifikacije|Характеристики|Specifikációk|Спецификации|仕様|规格|規格|المواصفات|Spesifikasi|Specifikace|Specificații|Προδιαγραφές|Specifikationer|Specifikationer|Spesifikasjoner|Spesifikasjonar|Tekniset tiedot|Tæknilýsingar",
  Materials:
    "Materijali|Материјали|Materijali|Materialien|Matériaux|Materiales|Materiali|Materiais|Materiais|Materialen|Materiały|Malzemeler|Материјали|Materijali|Materiali|Материалы|Anyagok|Материали|素材|材料|材質|المواد|Material|Materiály|Materiale|Υλικά|Materialer|Material|Materialer|Materiale|Materiaalit|Efni",
  Reviews:
    "Recenzije|Рецензије|Recenzije|Bewertungen|Avis|Reseñas|Recensioni|Avaliações|Avaliações|Beoordelingen|Recenzje|Yorumlar|Рецензии|Recenzije|Mnenja|Отзывы|Vélemények|Отзиви|レビュー|评价|評價|المراجعات|Ulasan|Recenze|Recenzii|Κριτικές|Anmeldelser|Recensioner|Anmeldelser|Meldingar|Arvostelut|Umsagnir",
  Brand:
    "Brend|Бренд|Brend|Marke|Marque|Marca|Brand|Marca|Marca|Merk|Marka|Marka|Бренд|Brend|Znamka|Бренд|Márka|Марка|ブランド|品牌|品牌|العلامة التجارية|Merek|Značka|Brand|Μάρκα|Brand|Varumärke|Merke|Merke|Brändi|Vörumerki",
  Price:
    "Cena|Цена|Cijena|Preis|Prix|Precio|Prezzo|Preço|Preço|Prijs|Cena|Fiyat|Цена|Cijena|Cena|Цена|Ár|Цена|価格|价格|價格|السعر|Harga|Cena|Preț|Τιμή|Pris|Pris|Pris|Pris|Hinta|Verð",
  OS: "Operativni sistem|Оперативни систем|Operativni sustav|Betriebssystem|Système d'exploitation|Sistema operativo|Sistema operativo|Sistema operativo|Sistema operacional|Besturingssysteem|System operacyjny|İşletim sistemi|Оперативен систем|Operativni sistem|Operacijski sistem|Операционная система|Operációs rendszer|Операционна система|OS|操作系统|作業系統|نظام التشغيل|Sistem operasi|Operační systém|Sistem de operare|Λειτουργικό σύστημα|Operativsystem|Operativsystem|Operativsystem|Operativsystem|Käyttöjärjestelmä|Stýrikerfi",
  "Package weight":
    "Težina paketa|Тежина пакета|Težina paketa|Paketgewicht|Poids du colis|Peso del paquete|Peso pacco|Peso da embalagem|Peso do pacote|Pakketgewicht|Waga paczki|Paket ağırlığı|Тежина на пакет|Težina paketa|Teža paketa|Вес упаковки|Csomag súlya|Тегло на пакета|梱包重量|包装重量|包裝重量|وزن الطرد|Berat paket|Hmotnost balíku|Greutate colet|Βάρος πακέτου|Pakkevægt|Paketvikt|Pakkevekt|Pakkevekt|Pakkauksen paino|Þyngd pakka",
  "Package dimensions":
    "Dimenzije paketa|Димензије пакета|Dimenzije paketa|Paketmaße|Dimensions du colis|Dimensiones del paquete|Dimensioni pacco|Dimensões da embalagem|Dimensões do pacote|Pakketafmetingen|Wymiary paczki|Paket ölçüleri|Димензии на пакет|Dimenzije paketa|Mere paketa|Размеры упаковки|Csomag méretei|Размери на пакета|梱包サイズ|包装尺寸|包裝尺寸|أبعاد الطرد|Dimensi paket|Rozměry balíku|Dimensiuni colet|Διαστάσεις πακέτου|Pakkemål|Paketmått|Pakkemål|Pakkemål|Pakkauksen mitat|Mál pakka",
  Delivery:
    "Isporuka|Испорука|Dostava|Lieferung|Livraison|Entrega|Consegna|Entrega|Entrega|Levering|Dostawa|Teslimat|Испорака|Isporuka|Dostava|Доставка|Szállítás|Доставка|配送|配送|配送|التسليم|Pengiriman|Doručení|Livrare|Παράδοση|Levering|Leverans|Levering|Levering|Toimitus|Afhending",
  Download:
    "Preuzimanje|Преузимање|Preuzimanje|Download|Téléchargement|Descarga|Download|Download|Download|Download|Pobranie|İndirme|Преземање|Preuzimanje|Prenos|Скачивание|Letöltés|Изтегляне|ダウンロード|下载|下載|تنزيل|Unduhan|Stažení|Descărcare|Λήψη|Download|Nedladdning|Nedlasting|Nedlasting|Lataus|Niðurhal",
  Duration:
    "Trajanje|Трајање|Trajanje|Dauer|Durée|Duración|Durata|Duração|Duração|Duur|Czas trwania|Süre|Траење|Trajanje|Trajanje|Длительность|Időtartam|Продължителност|所要時間|时长|時長|المدة|Durasi|Doba trvání|Durată|Διάρκεια|Varighed|Varaktighet|Varighet|Varigheit|Kesto|Lengd",
  Stock:
    "Stanje|Стање|Zaliha|Bestand|Stock|Stock|Scorte|Stock|Estoque|Voorraad|Stan magazynowy|Stok|Залиха|Zaliha|Zaloga|Наличие|Készlet|Наличност|在庫|库存|庫存|المخزون|Stok|Sklad|Stoc|Απόθεμα|Lager|Lager|Lager|Lager|Varasto|Birgðir",
  "Black / Medium":
    "Crna / Srednja|Црна / Средња|Crna / Srednja|Schwarz / Mittel|Noir / Moyen|Negro / Mediano|Nero / Medio|Preto / Médio|Preto / Médio|Zwart / Medium|Czarny / Średni|Siyah / Orta|Црна / Средна|Crna / Srednja|Črna / Srednja|Черный / Средний|Fekete / Közepes|Черен / Среден|ブラック / ミディアム|黑色 / 中号|黑色 / 中碼|أسود / متوسط|Hitam / Sedang|Černá / Střední|Negru / Mediu|Μαύρο / Μεσαίο|Sort / Medium|Svart / Medium|Svart / Medium|Svart / Medium|Musta / Keskikoko|Svart / Miðlungs",
  "Digital delivery is protected":
    "Digitalna isporuka je zaštićena|Дигитална испорука је заштићена|Digitalna isporuka je zaštićena|Digitale Lieferung ist geschützt|La livraison numérique est protégée|La entrega digital está protegida|La consegna digitale è protetta|A entrega digital está protegida|A entrega digital está protegida|Digitale levering is beschermd|Dostawa cyfrowa jest chroniona|Dijital teslimat korunur|Дигиталната испорака е заштитена|Digitalna isporuka je zaštićena|Digitalna dostava je zaščitena|Цифровая доставка защищена|A digitális kézbesítés védett|Дигиталната доставка е защитена|デジタル配送は保護されています|数字交付受保护|數位交付受保護|التسليم الرقمي محمي|Pengiriman digital dilindungi|Digitální doručení je chráněné|Livrarea digitală este protejată|Η ψηφιακή παράδοση προστατεύεται|Digital levering er beskyttet|Digital leverans är skyddad|Digital levering er beskyttet|Digital levering er verna|Digitaalinen toimitus on suojattu|Stafræn afhending er varin",
  "60 minutes · online":
    "60 minuta · onlajn|60 минута · онлајн|60 minuta · online|60 Minuten · online|60 minutes · en ligne|60 minutos · en línea|60 minuti · online|60 minutos · online|60 minutos · online|60 minuten · online|60 minut · online|60 dakika · çevrimiçi|60 минути · онлајн|60 minuta · online|60 minut · online|60 минут · онлайн|60 perc · online|60 минути · онлайн|60分 · オンライン|60 分钟 · 在线|60 分鐘 · 線上|60 دقيقة · عبر الإنترنت|60 menit · online|60 minut · online|60 de minute · online|60 λεπτά · online|60 minutter · online|60 minuter · online|60 minutter · online|60 minutt · online|60 minuuttia · verkossa|60 mínútur · á netinu",
  "{count} enabled":
    "{count} uključeno|{count} укључено|{count} uključeno|{count} aktiviert|{count} activé(s)|{count} activados|{count} attivi|{count} ativos|{count} ativos|{count} actief|{count} włączone|{count} etkin|{count} вклучено|{count} uključeno|{count} omogočeno|{count} включено|{count} engedélyezve|{count} включени|{count} 有効|已启用 {count} 个|已啟用 {count} 個|{count} مفعّل|{count} aktif|{count} povoleno|{count} activate|{count} ενεργά|{count} aktiveret|{count} aktiva|{count} aktivert|{count} aktivert|{count} käytössä|{count} virkt",
  "{count} products":
    "{count} proizvoda|{count} производа|{count} proizvoda|{count} Produkte|{count} produits|{count} productos|{count} prodotti|{count} produtos|{count} produtos|{count} producten|{count} produktów|{count} ürün|{count} производи|{count} proizvoda|{count} izdelkov|{count} товаров|{count} termék|{count} продукта|{count} 商品|{count} 个产品|{count} 個產品|{count} منتجات|{count} produk|{count} produktů|{count} produse|{count} προϊόντα|{count} produkter|{count} produkter|{count} produkter|{count} varer|{count} tuotetta|{count} vörur",
  "{count} available":
    "{count} dostupno|{count} доступно|{count} dostupno|{count} verfügbar|{count} disponible(s)|{count} disponibles|{count} disponibili|{count} disponíveis|{count} disponíveis|{count} beschikbaar|{count} dostępne|{count} mevcut|{count} достапни|{count} dostupno|{count} na voljo|{count} доступно|{count} elérhető|{count} налични|{count} 点あり|可用 {count}|可用 {count}|{count} متاح|{count} tersedia|{count} dostupné|{count} disponibile|{count} διαθέσιμα|{count} tilgængelige|{count} tillgängliga|{count} tilgjengelig|{count} tilgjengeleg|{count} saatavilla|{count} tiltækt",
  "{count}/{total} enabled":
    "{count}/{total} uključeno|{count}/{total} укључено|{count}/{total} uključeno|{count}/{total} aktiviert|{count}/{total} activé(s)|{count}/{total} activados|{count}/{total} attivi|{count}/{total} ativos|{count}/{total} ativos|{count}/{total} actief|{count}/{total} włączone|{count}/{total} etkin|{count}/{total} вклучено|{count}/{total} uključeno|{count}/{total} omogočeno|{count}/{total} включено|{count}/{total} engedélyezve|{count}/{total} включени|{count}/{total} 有効|已启用 {count}/{total}|已啟用 {count}/{total}|{count}/{total} مفعّل|{count}/{total} aktif|{count}/{total} povoleno|{count}/{total} activate|{count}/{total} ενεργά|{count}/{total} aktiveret|{count}/{total} aktiva|{count}/{total} aktivert|{count}/{total} aktivert|{count}/{total} käytössä|{count}/{total} virkt",
  "Compare-at price":
    "Precrtana cena|Прецртана цена|Usporedna cijena|Vergleichspreis|Prix barré|Precio comparativo|Prezzo di confronto|Preço comparativo|Preço comparativo|Vergelijkingsprijs|Cena porównawcza|Karşılaştırma fiyatı|Споредбена цена|Poredbena cijena|Primerjalna cena|Старая цена|Összehasonlító ár|Стара цена|比較価格|对比价格|比較價格|سعر المقارنة|Harga pembanding|Porovnávací cena|Preț comparativ|Συγκριτική τιμή|Førpris|Jämförpris|Førpris|Førpris|Vertailuhinta|Samanburðarverð",
  "Stock message":
    "Poruka o stanju|Порука о стању|Poruka o zalihi|Bestandsmeldung|Message de stock|Mensaje de stock|Messaggio scorte|Mensagem de stock|Mensagem de estoque|Voorraadbericht|Komunikat o stanie|Stok mesajı|Порака за залиха|Poruka o zalihi|Sporočilo zaloge|Сообщение о наличии|Készletüzenet|Съобщение за наличност|在庫メッセージ|库存消息|庫存訊息|رسالة المخزون|Pesan stok|Zpráva skladu|Mesaj stoc|Μήνυμα αποθέματος|Lagerbesked|Lagermeddelande|Lagerbeskjed|Lagermelding|Varastoviesti|Birgðaskilaboð",
  "Related products":
    "Povezani proizvodi|Повезани производи|Povezani proizvodi|Verwandte Produkte|Produits associés|Productos relacionados|Prodotti correlati|Produtos relacionados|Produtos relacionados|Gerelateerde producten|Produkty powiązane|İlgili ürünler|Поврзани производи|Povezani proizvodi|Povezani izdelki|Похожие товары|Kapcsolódó termékek|Свързани продукти|関連商品|相关产品|相關產品|منتجات ذات صلة|Produk terkait|Související produkty|Produse asociate|Σχετικά προϊόντα|Relaterede produkter|Relaterade produkter|Relaterte produkter|Relaterte varer|Liittyvät tuotteet|Tengdar vörur",
  "Digital info":
    "Digitalne informacije|Дигиталне информације|Digitalne informacije|Digitale Informationen|Infos numériques|Información digital|Info digitali|Informação digital|Informação digital|Digitale info|Informacje cyfrowe|Dijital bilgi|Дигитални информации|Digitalne informacije|Digitalne informacije|Цифровая информация|Digitális információ|Дигитална информация|デジタル情報|数字信息|數位資訊|معلومات رقمية|Info digital|Digitální informace|Informații digitale|Ψηφιακές πληροφορίες|Digital information|Digital information|Digital informasjon|Digital informasjon|Digitaaliset tiedot|Stafrænar upplýsingar",
  "Service info":
    "Informacije o usluzi|Информације о услузи|Informacije o usluzi|Serviceinformationen|Infos service|Información de servicio|Info servizio|Informação de serviço|Informação de serviço|Service-info|Informacje o usłudze|Hizmet bilgisi|Информации за услуга|Informacije o usluzi|Informacije o storitvi|Информация об услуге|Szolgáltatási információ|Информация за услуга|サービス情報|服务信息|服務資訊|معلومات الخدمة|Info layanan|Informace o službě|Informații serviciu|Πληροφορίες υπηρεσίας|Serviceinfo|Tjänstinfo|Tjenesteinfo|Tenesteinfo|Palvelutiedot|Upplýsingar um þjónustu",
  "Preview type":
    "Tip pregleda|Тип прегледа|Tip pregleda|Vorschautyp|Type d'aperçu|Tipo de vista previa|Tipo anteprima|Tipo de pré-visualização|Tipo de prévia|Voorbeeldtype|Typ podglądu|Önizleme tipi|Тип на преглед|Tip pregleda|Vrsta predogleda|Тип предпросмотра|Előnézet típusa|Тип преглед|プレビュータイプ|预览类型|預覽類型|نوع المعاينة|Jenis pratinjau|Typ náhledu|Tip previzualizare|Τύπος προεπισκόπησης|Forhåndsvisningstype|Förhandsvisningstyp|Forhåndsvisningstype|Førehandsvisingstype|Esikatselutyyppi|Tegund forskoðunar",
  "Related section":
    "Povezana sekcija|Повезана секција|Povezana sekcija|Verwandter Bereich|Section associée|Sección relacionada|Sezione correlata|Secção relacionada|Seção relacionada|Gerelateerde sectie|Sekcja powiązana|İlgili bölüm|Поврзана секција|Povezana sekcija|Povezan razdelek|Связанный раздел|Kapcsolódó szakasz|Свързана секция|関連セクション|相关区块|相關區塊|القسم ذو الصلة|Bagian terkait|Související sekce|Secțiune asociată|Σχετική ενότητα|Relateret sektion|Relaterad sektion|Relatert seksjon|Relatert seksjon|Liittyvä osio|Tengdur hluti",
  "Commerce details":
    "Detalji trgovine|Детаљи трговине|Detalji trgovine|Commerce-Details|Détails commerce|Detalles comerciales|Dettagli commerce|Detalhes de comércio|Detalhes comerciais|Commerce-details|Szczegóły handlu|Ticaret detayları|Детали за трговија|Detalji trgovine|Podrobnosti trgovine|Коммерческие детали|Kereskedelmi részletek|Търговски детайли|コマース詳細|商务详情|商務詳情|تفاصيل التجارة|Detail commerce|Obchodní detaily|Detalii commerce|Λεπτομέρειες εμπορίου|Handelsdetaljer|Handelsdetaljer|Handelsdetaljer|Handelsdetaljar|Kaupan tiedot|Verslunarupplýsingar",
  enabled:
    "uključeno|укључено|uključeno|aktiviert|activé|activado|attivo|ativo|ativo|actief|włączone|etkin|вклучено|uključeno|omogočeno|включено|engedélyezve|включено|有効|已启用|已啟用|مفعّل|aktif|povoleno|activat|ενεργό|aktiveret|aktiv|aktivert|aktivert|käytössä|virkt",
  hidden:
    "sakriveno|сакривено|skriveno|ausgeblendet|masqué|oculto|nascosto|oculto|oculto|verborgen|ukryte|gizli|скриено|sakriveno|skrito|скрыто|rejtett|скрито|非表示|已隐藏|已隱藏|مخفي|tersembunyi|skryto|ascuns|κρυφό|skjult|dold|skjult|skjult|piilotettu|falið",
  on: "uključeno|укључено|uključeno|an|activé|activado|on|ligado|ligado|aan|wł.|açık|вклучено|uključeno|vklop|вкл|be|вкл|オン|开|開|تشغيل|aktif|zap|pornit|ενεργό|til|på|på|på|päällä|á",
  off: "isključeno|искључено|isključeno|aus|désactivé|desactivado|off|desligado|desligado|uit|wył.|kapalı|исклучено|isključeno|izklop|выкл|ki|изкл|オフ|关|關|إيقاف|nonaktif|vyp|oprit|ανενεργό|fra|av|av|av|pois|af",
  grid: "mreža|мрежа|mreža|Raster|grille|cuadrícula|griglia|grelha|grade|raster|siatka|ızgara|мрежа|mreža|mreža|сетка|rács|мрежа|グリッド|网格|網格|شبكة|grid|mřížka|grilă|πλέγμα|gitter|rutnät|rutenett|rutenett|ruudukko|grind",
  list: "lista|листа|popis|Liste|liste|lista|lista|lista|lista|lijst|lista|liste|листа|lista|seznam|список|lista|списък|リスト|列表|清單|قائمة|daftar|seznam|listă|λίστα|liste|lista|liste|liste|lista|listi",
  thumbnail:
    "sličica|сличица|sličica|Miniaturbild|miniature|miniatura|miniatura|miniatura|miniatura|thumbnail|miniatura|küçük görsel|сличка|sličica|sličica|миниатюра|bélyegkép|миниатюра|サムネイル|缩略图|縮圖|صورة مصغرة|thumbnail|miniatura|miniatură|μικρογραφία|miniature|miniatyr|miniatyr|miniatyr|pikkukuva|smámynd",
  banner:
    "baner|банер|banner|Banner|bannière|banner|banner|banner|banner|banner|baner|banner|банер|baner|pasica|баннер|banner|банер|バナー|横幅|橫幅|بانر|banner|banner|banner|banner|banner|banner|banner|banner|banneri|borði",
  none: "bez slike|без слике|bez slike|kein Bild|aucune image|sin imagen|nessuna immagine|sem imagem|sem imagem|geen afbeelding|brak obrazu|görsel yok|без слика|bez slike|brez slike|без изображения|nincs kép|без изображение|画像なし|无图片|無圖片|بدون صورة|tanpa gambar|bez obrázku|fără imagine|χωρίς εικόνα|uden billede|ingen bild|uten bilde|utan bilete|ei kuvaa|engin mynd",
  showcase:
    "izložbeno|изложбено|izložno|Showcase|vitrine|escaparate|vetrina|montra|vitrine|showcase|ekspozycja|vitrin|изложбено|izložno|predstavitveno|витрина|kiemelt|витрина|ショーケース|展示|展示|عرض|showcase|ukázka|vitrină|βιτρίνα|showcase|showcase|showcase|framsyning|esittely|sýning",
  editorial:
    "urednički|уреднички|urednički|editorial|éditorial|editorial|editoriale|editorial|editorial|redactioneel|edytorialny|editoryal|уреднички|urednički|uredniško|редакционный|szerkesztői|редакционен|エディトリアル|编辑|編輯|تحريري|editorial|redakční|editorial|συντακτικό|redaktionel|redaktionell|redaksjonell|redaksjonell|toimituksellinen|ritstjórnarlegt",
  comfortable:
    "udobno|удобно|udobno|komfortabel|confortable|cómodo|comodo|confortável|confortável|comfortabel|wygodne|rahat|удобно|udobno|udobno|комфортно|kényelmes|удобно|快適|舒适|舒適|مريح|nyaman|pohodlné|confortabil|άνετο|komfortabel|bekväm|komfortabel|komfortabel|mukava|þægilegt",
  compact:
    "kompaktno|компактно|kompaktno|kompakt|compact|compacto|compatto|compacto|compacto|compact|kompaktowe|kompakt|компактно|kompaktno|kompaktno|компактно|kompakt|компактно|コンパクト|紧凑|緊湊|مضغوط|ringkas|kompaktní|compact|συμπαγές|kompakt|kompakt|kompakt|kompakt|tiivis|þjappað",
  "left sidebar":
    "leva bočna traka|лева бочна трака|lijeva bočna traka|linke Seitenleiste|barre latérale gauche|barra lateral izquierda|barra laterale sinistra|barra lateral esquerda|barra lateral esquerda|linker zijbalk|lewy pasek boczny|sol kenar çubuğu|лева странична лента|lijeva bočna traka|leva stranska vrstica|левая боковая панель|bal oldalsáv|лява странична лента|左サイドバー|左侧边栏|左側邊欄|الشريط الجانبي الأيسر|sidebar kiri|levý postranní panel|bară laterală stânga|αριστερή πλευρική μπάρα|venstre sidepanel|vänster sidofält|venstre sidefelt|venstre sidefelt|vasen sivupalkki|vinstri hliðarstika",
  "top bar":
    "gornja traka|горња трака|gornja traka|obere Leiste|barre supérieure|barra superior|barra superiore|barra superior|barra superior|bovenbalk|górny pasek|üst çubuk|горна лента|gornja traka|zgornja vrstica|верхняя панель|felső sáv|горна лента|上部バー|顶部栏|頂部列|الشريط العلوي|bilah atas|horní lišta|bară superioară|επάνω μπάρα|topbjælke|toppfält|toppfelt|toppfelt|yläpalkki|efri stika",
  "mobile drawer":
    "mobilna fioka|мобилна фиока|mobilna ladica|mobiler Drawer|tiroir mobile|cajón móvil|drawer mobile|gaveta mobile|gaveta mobile|mobiele lade|szuflada mobilna|mobil çekmece|мобилна фиока|mobilna ladica|mobilni predal|мобильная панель|mobil fiók|мобилен drawer|モバイルドロワー|移动抽屉|行動抽屜|درج الموبايل|drawer mobile|mobilní panel|sertar mobil|mobile συρτάρι|mobil skuffe|mobil låda|mobil skuff|mobil skuff|mobiililaatikko|farsímaskúffa",
  "gallery left":
    "galerija levo|галерија лево|galerija lijevo|Galerie links|galerie à gauche|galería izquierda|galleria a sinistra|galeria à esquerda|galeria à esquerda|galerij links|galeria po lewej|galeri solda|галерија лево|galerija lijevo|galerija levo|галерея слева|galéria balra|галерия вляво|左ギャラリー|左侧图库|左側圖庫|معرض يسار|galeri kiri|galerie vlevo|galerie stânga|γκαλερί αριστερά|galleri venstre|galleri vänster|galleri venstre|galleri venstre|galleria vasemmalla|gallerí vinstra",
  "gallery top":
    "galerija gore|галерија горе|galerija gore|Galerie oben|galerie en haut|galería arriba|galleria in alto|galeria no topo|galeria no topo|galerij boven|galeria u góry|galeri üstte|галерија горе|galerija gore|galerija zgoraj|галерея сверху|galéria felül|галерия горе|上部ギャラリー|顶部图库|頂部圖庫|معرض أعلى|galeri atas|galerie nahoře|galerie sus|γκαλερί επάνω|galleri øverst|galleri överst|galleri øverst|galleri øvst|galleria ylhäällä|gallerí efst",
  carousel:
    "karusel|карусел|karusel|Karussell|carrousel|carrusel|carosello|carrossel|carrossel|carousel|karuzela|karusel|карусел|karusel|vrtiljak|карусель|körhinta|карусел|カルーセル|轮播|輪播|دائري|carousel|karusel|carusel|καρουζέλ|karrusel|karusell|karusell|karusell|karuselli|hringekja",
  physical:
    "fizički|физички|fizički|physisch|physique|físico|fisico|físico|físico|fysiek|fizyczny|fiziksel|физички|fizički|fizično|физический|fizikai|физически|物理商品|实物|實體|مادي|fisik|fyzický|fizic|φυσικό|fysisk|fysisk|fysisk|fysisk|fyysinen|líkamlegt",
  digital:
    "digitalni|дигитални|digitalni|digital|numérique|digital|digitale|digital|digital|digitaal|cyfrowy|dijital|дигитален|digitalni|digitalno|цифровой|digitális|дигитален|デジタル|数字|數位|رقمي|digital|digitální|digital|ψηφιακό|digital|digital|digital|digital|digitaalinen|stafrænt",
  service:
    "usluga|услуга|usluga|Service|service|servicio|servizio|serviço|serviço|dienst|usługa|hizmet|услуга|usluga|storitev|услуга|szolgáltatás|услуга|サービス|服务|服務|خدمة|layanan|služba|serviciu|υπηρεσία|service|tjänst|tjeneste|teneste|palvelu|þjónusta",
} satisfies Record<DeclaredStorefrontSource, string>;

type DeclaredStorefrontSource =
  (typeof DECLARED_STOREFRONT_SOURCE_STRINGS)[number];
type StorefrontSource = DeclaredStorefrontSource;

export const WEBSHOP_STOREFRONT_SOURCE_STRINGS = [
  ...DECLARED_STOREFRONT_SOURCE_STRINGS,
];

function createMap(language: LocalizedLanguage) {
  const languageIndex = LOCALIZED_LANGUAGES.indexOf(language);

  return Object.fromEntries(
    Object.entries(ROWS).map(([source, row]) => {
      const values = row.split("|");
      if (values.length !== LOCALIZED_LANGUAGES.length) {
        throw new Error(
          `Invalid webshop storefront translation row for ${source}.`,
        );
      }

      return [source, values[languageIndex] ?? source];
    }),
  ) as Record<StorefrontSource, string>;
}

export const WEBSHOP_STOREFRONT_SOURCE_TRANSLATIONS = Object.fromEntries(
  LOCALIZED_LANGUAGES.map((language) => [language, createMap(language)]),
) as Record<LocalizedLanguage, Record<StorefrontSource, string>>;
