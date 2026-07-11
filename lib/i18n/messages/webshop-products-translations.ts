import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

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

export const WEBSHOP_PRODUCTS_SOURCE_STRINGS = [
  "{count} product",
  "{count} products",
  "{count} SKU",
  "{label}: {message}",
  "AI writing assistant",
  "All scopes",
  "All variants",
  "Alt text or caption",
  "Any SKU-specific",
  "Auto-publish ratings",
  "Base price",
  "Basics",
  "Canonical URL",
  "Categories and attributes",
  "COD eligible",
  "Compare-at price",
  "Cover image",
  "Create product",
  "Default",
  "Delete SKU",
  "Delivery mode",
  "Delivery type",
  "Digital asset",
  "Edit product",
  "Enable product ratings",
  "Each SKU represents one purchasable variant. Price is the SKU sale price shown on the storefront; if left blank, the SKU inherits the product Base price. Compare is an optional reference price for discounts; a SKU Compare value overrides the product Compare-at price. SKUs that inherit the product Base price can also inherit the product Compare-at price. SKUs with a different Price should set their own Compare value. On hand is available stock, Reserved is stock held by carts or orders, and Low threshold marks when the SKU should be treated as low stock.",
  "Fixed shipping fee override",
  "Fulfillment",
  "Generate {label} with AI",
  "Inventory tracking",
  "License key policy",
  "License key pool",
  "License keys",
  "Low-stock threshold",
  "Managed gallery",
  "Media",
  "Meta description",
  "Meta title",
  "missing",
  "New products are disabled",
  "No expiry",
  "No notes",
  "No SKU variants",
  "No SKU-level attributes are configured for this category. Open Webshop categories, select the category that owns the attribute, click Binding on an Own attribute, and set Applies to SKU variant specifications. Inherited attributes must be changed in their source category, or excluded and re-added as Own attributes here.",
  "Not assigned",
  "Package height cm",
  "Package length cm",
  "Package weight and dimensions describe the packed parcel used for courier eligibility, rates, and labels. Use category attributes for the unpacked product's own weight or dimensions when those should appear as product specifications.",
  "Package weight grams",
  "Package width cm",
  "Paddle price ID",
  "Price {currency}",
  "Pricing",
  "Product",
  "Product created.",
  "Product media",
  "Product saved.",
  "Product type",
  "Product video",
  "Product-wide",
  "Products",
  "Provider:",
  "Public",
  "Related products",
  "Requires shipping",
  "Reviews visibility",
  "Review moderation",
  "Save and close",
  "Save first",
  "Saving this status will remove the product from public storefront browsing. Existing cart items will stay in carts but become unavailable and block checkout until removed. Existing wishlist items will remain saved but show as unavailable.",
  "Shipping availability",
  "Shipping class",
  "Signed-in users",
  "SKU cannot be deleted",
  "SKU specifications",
  "Stock policy",
  "Tax category",
  "The Webshop license is expired. Existing products can still be edited, but new products and new SKU variants cannot be created.",
  "Track inventory",
  "Track inventory by default",
  "Use Base price and Compare-at price as the product defaults. A first or default SKU can follow these values; SKUs with a different price should define their own price and compare-at price so they do not inherit a lower reference price.",
  "Validity days",
  "Variants (SKU)",
  "Variants and SKUs",
  "Webshop products",
  "Write something about this product…",
  "allow backorder",
  "deny",
  "file",
  "file + license",
  "in person",
  "license",
  "manual",
  "online",
  "phone",
  "pool",
  "preorder",
] as const;

type WebshopProductsSource = (typeof WEBSHOP_PRODUCTS_SOURCE_STRINGS)[number];

const TERM_KEYS = [
  "product",
  "products",
  "productLower",
  "productsLower",
  "settings",
  "help",
  "warning",
  "webshopProducts",
  "productListIntro",
  "productDisabled",
  "licenseExpired",
  "basics",
  "pricing",
  "variantsSku",
  "variantsSkus",
  "media",
  "ratings",
  "fulfillment",
  "licensePool",
  "relatedProducts",
  "reviewModeration",
  "categoryAttrs",
  "stock",
  "sku",
  "license",
  "mediaSettings",
  "seo",
  "ratingSettings",
  "fulfillmentSettings",
  "shipping",
  "ai",
  "trackInventory",
  "saveFirst",
  "saveClose",
  "createProduct",
  "editProduct",
  "deleteSku",
  "defaultValue",
  "missing",
  "saved",
  "created",
  "selected",
] as const;

type TermKey = (typeof TERM_KEYS)[number];
type Terms = Record<TermKey, string>;

const TERM_ROWS = {
  "sr-Latn":
    "Proizvod|Proizvodi|proizvod|proizvodi|Podešavanja proizvoda|Detalji proizvoda|Upozorenje za proizvod|Proizvodi veb-prodavnice|Fizički proizvodi, digitalni proizvodi, usluge, SKU, cene i zalihe.|Novi proizvodi su onemogućeni|Webshop licenca je istekla. Postojeći proizvodi i SKU varijante mogu da se uređuju, ali novi ne mogu da se kreiraju.|Osnovno|Cene|Varijante (SKU)|Varijante i SKU|Mediji|Ocene|Ispunjenje|Pul licencnih ključeva|Povezani proizvodi|Moderacija recenzija|Kategorije i atributi|Podešavanja zaliha|SKU podešavanja|Podešavanja licenci|Podešavanja medija|SEO podešavanja|Podešavanja ocena|Podešavanja ispunjenja|Podešavanja isporuke|AI asistent za pisanje|Praćenje zaliha|Prvo sačuvaj|Sačuvaj i zatvori|Kreiraj proizvod|Uredi proizvod|Obriši SKU|Podrazumevano|nedostaje|sačuvano|kreirano|izabrano",
  "sr-Cyrl":
    "Производ|Производи|производ|производи|Подешавања производа|Детаљи производа|Упозорење за производ|Производи веб-продавнице|Физички производи, дигитални производи, услуге, SKU, цене и залихе.|Нови производи су онемогућени|Webshop лиценца је истекла. Постојећи производи и SKU варијанте могу да се уређују, али нови не могу да се креирају.|Основно|Цене|Варијанте (SKU)|Варијанте и SKU|Медији|Оцене|Испуњење|Пул лиценцних кључева|Повезани производи|Модерација рецензија|Категорије и атрибути|Подешавања залиха|SKU подешавања|Подешавања лиценци|Подешавања медија|SEO подешавања|Подешавања оцена|Подешавања испуњења|Подешавања испоруке|AI асистент за писање|Праћење залиха|Прво сачувај|Сачувај и затвори|Креирај производ|Уреди производ|Обриши SKU|Подразумевано|недостаје|сачувано|креирано|изабрано",
  hr: "Proizvod|Proizvodi|proizvod|proizvodi|Postavke proizvoda|Detalji proizvoda|Upozorenje za proizvod|Proizvodi web-trgovine|Fizički proizvodi, digitalni proizvodi, usluge, SKU, cijene i zalihe.|Novi proizvodi su onemogućeni|Webshop licenca je istekla. Postojeći proizvodi i SKU varijante mogu se uređivati, ali novi se ne mogu stvarati.|Osnovno|Cijene|Varijante (SKU)|Varijante i SKU|Mediji|Ocjene|Ispunjenje|Skup licencnih ključeva|Povezani proizvodi|Moderiranje recenzija|Kategorije i atributi|Postavke zaliha|Postavke SKU-a|Postavke licenci|Postavke medija|SEO postavke|Postavke ocjena|Postavke ispunjenja|Postavke dostave|AI pomoćnik za pisanje|Praćenje zaliha|Prvo spremi|Spremi i zatvori|Stvori proizvod|Uredi proizvod|Izbriši SKU|Zadano|nedostaje|spremljeno|stvoreno|odabrano",
  de: "Produkt|Produkte|Produkt|Produkte|Produkteinstellungen|Produktdetails|Produktwarnung|Webshop-Produkte|Physische Produkte, digitale Produkte, Services, SKUs, Preise und Bestand.|Neue Produkte sind deaktiviert|Die Webshop-Lizenz ist abgelaufen. Vorhandene Produkte und SKU-Varianten können bearbeitet werden, neue können nicht erstellt werden.|Grundlagen|Preise|Varianten (SKU)|Varianten und SKUs|Medien|Bewertungen|Erfüllung|Lizenzschlüsselpool|Verwandte Produkte|Bewertungsmoderation|Kategorien und Attribute|Bestandseinstellungen|SKU-Einstellungen|Lizenzeinstellungen|Medieneinstellungen|SEO-Einstellungen|Bewertungseinstellungen|Erfüllungseinstellungen|Versandeinstellungen|KI-Schreibassistent|Bestand verfolgen|Zuerst speichern|Speichern und schließen|Produkt erstellen|Produkt bearbeiten|SKU löschen|Standard|fehlt|gespeichert|erstellt|ausgewählt",
  fr: "Produit|Produits|produit|produits|Paramètres du produit|Détails du produit|Avertissement produit|Produits de la boutique|Produits physiques, produits numériques, services, SKU, prix et stock.|Les nouveaux produits sont désactivés|La licence Webshop a expiré. Les produits et variantes SKU existants peuvent être modifiés, mais les nouveaux ne peuvent pas être créés.|Bases|Prix|Variantes (SKU)|Variantes et SKU|Médias|Notes|Exécution|Pool de clés de licence|Produits associés|Modération des avis|Catégories et attributs|Paramètres de stock|Paramètres SKU|Paramètres de licence|Paramètres média|Paramètres SEO|Paramètres des notes|Paramètres d’exécution|Paramètres d’expédition|Assistant d’écriture IA|Suivi du stock|Enregistrer d’abord|Enregistrer et fermer|Créer un produit|Modifier le produit|Supprimer le SKU|Par défaut|manquant|enregistré|créé|sélectionné",
  es: "Producto|Productos|producto|productos|Configuración del producto|Detalles del producto|Advertencia del producto|Productos de la tienda|Productos físicos, productos digitales, servicios, SKU, precios e inventario.|Los nuevos productos están desactivados|La licencia de Webshop caducó. Los productos y variantes SKU existentes pueden editarse, pero no pueden crearse nuevos.|Básico|Precios|Variantes (SKU)|Variantes y SKU|Medios|Valoraciones|Cumplimiento|Pool de claves de licencia|Productos relacionados|Moderación de reseñas|Categorías y atributos|Configuración de inventario|Configuración de SKU|Configuración de licencias|Configuración de medios|Configuración SEO|Configuración de valoraciones|Configuración de cumplimiento|Configuración de envío|Asistente de escritura IA|Seguimiento de inventario|Guardar primero|Guardar y cerrar|Crear producto|Editar producto|Eliminar SKU|Predeterminado|falta|guardado|creado|seleccionado",
  it: "Prodotto|Prodotti|prodotto|prodotti|Impostazioni prodotto|Dettagli prodotto|Avviso prodotto|Prodotti del webshop|Prodotti fisici, prodotti digitali, servizi, SKU, prezzi e scorte.|I nuovi prodotti sono disabilitati|La licenza Webshop è scaduta. Prodotti e varianti SKU esistenti possono essere modificati, ma non se ne possono creare di nuovi.|Base|Prezzi|Varianti (SKU)|Varianti e SKU|Media prodotto|Valutazioni|Evasione|Pool chiavi licenza|Prodotti correlati|Moderazione recensioni|Categorie e attributi|Impostazioni scorte|Impostazioni SKU|Impostazioni licenze|Impostazioni media|Impostazioni SEO|Impostazioni valutazioni|Impostazioni evasione|Impostazioni spedizione|Assistente di scrittura AI|Tracciamento scorte|Salva prima|Salva e chiudi|Crea prodotto|Modifica prodotto|Elimina SKU|Predefinito|mancante|salvato|creato|selezionato",
  pt: "Produto|Produtos|produto|produtos|Definições do produto|Detalhes do produto|Aviso do produto|Produtos da loja online|Produtos físicos, produtos digitais, serviços, SKU, preços e stock.|Novos produtos estão desativados|A licença Webshop expirou. Produtos e variantes SKU existentes podem ser editados, mas novos não podem ser criados.|Básico|Preços|Variantes (SKU)|Variantes e SKU|Multimédia|Avaliações|Cumprimento|Pool de chaves de licença|Produtos relacionados|Moderação de avaliações|Categorias e atributos|Definições de stock|Definições de SKU|Definições de licenças|Definições de multimédia|Definições SEO|Definições de avaliações|Definições de cumprimento|Definições de envio|Assistente de escrita IA|Controlo de stock|Guardar primeiro|Guardar e fechar|Criar produto|Editar produto|Eliminar SKU|Predefinido|em falta|guardado|criado|selecionado",
  "pt-BR":
    "Produto|Produtos|produto|produtos|Configurações do produto|Detalhes do produto|Aviso do produto|Produtos da loja virtual|Produtos físicos, produtos digitais, serviços, SKUs, preços e estoque.|Novos produtos estão desativados|A licença do Webshop expirou. Produtos e variantes SKU existentes podem ser editados, mas novos não podem ser criados.|Básico|Preços|Variantes (SKU)|Variantes e SKUs|Mídia|Avaliações|Atendimento|Pool de chaves de licença|Produtos relacionados|Moderação de avaliações|Categorias e atributos|Configurações de estoque|Configurações de SKU|Configurações de licença|Configurações de mídia|Configurações SEO|Configurações de avaliações|Configurações de atendimento|Configurações de envio|Assistente de escrita IA|Rastreamento de estoque|Salvar primeiro|Salvar e fechar|Criar produto|Editar produto|Excluir SKU|Padrão|ausente|salvo|criado|selecionado",
  nl: "Product|Producten|product|producten|Productinstellingen|Productdetails|Productwaarschuwing|Webshopproducten|Fysieke producten, digitale producten, diensten, SKU's, prijzen en voorraad.|Nieuwe producten zijn uitgeschakeld|De Webshop-licentie is verlopen. Bestaande producten en SKU-varianten kunnen worden bewerkt, maar nieuwe kunnen niet worden aangemaakt.|Basis|Prijzen|Varianten (SKU)|Varianten en SKU's|Media-instellingen|Beoordelingen|Afhandeling|Licentiesleutelpool|Gerelateerde producten|Beoordelingsmoderatie|Categorieën en attributen|Voorraadinstellingen|SKU-instellingen|Licentie-instellingen|Media-instellingen|SEO-instellingen|Beoordelingsinstellingen|Afhandelingsinstellingen|Verzendinstellingen|AI-schrijfassistent|Voorraad volgen|Eerst opslaan|Opslaan en sluiten|Product maken|Product bewerken|SKU verwijderen|Standaard|ontbreekt|opgeslagen|gemaakt|geselecteerd",
  pl: "Produkt|Produkty|produkt|produkty|Ustawienia produktu|Szczegóły produktu|Ostrzeżenie produktu|Produkty sklepu|Produkty fizyczne, cyfrowe, usługi, SKU, ceny i zapasy.|Nowe produkty są wyłączone|Licencja Webshop wygasła. Istniejące produkty i warianty SKU można edytować, ale nowych nie można tworzyć.|Podstawy|Ceny|Warianty (SKU)|Warianty i SKU|Media|Oceny|Realizacja|Pula kluczy licencji|Powiązane produkty|Moderacja opinii|Kategorie i atrybuty|Ustawienia zapasów|Ustawienia SKU|Ustawienia licencji|Ustawienia mediów|Ustawienia SEO|Ustawienia ocen|Ustawienia realizacji|Ustawienia wysyłki|Asystent pisania AI|Śledzenie zapasów|Najpierw zapisz|Zapisz i zamknij|Utwórz produkt|Edytuj produkt|Usuń SKU|Domyślne|brakuje|zapisano|utworzono|wybrano",
  tr: "Ürün|Ürünler|ürün|ürünler|Ürün ayarları|Ürün ayrıntıları|Ürün uyarısı|Webshop ürünleri|Fiziksel ürünler, dijital ürünler, hizmetler, SKU'lar, fiyatlandırma ve stok.|Yeni ürünler devre dışı|Webshop lisansı süresi doldu. Mevcut ürünler ve SKU varyantları düzenlenebilir, ancak yenileri oluşturulamaz.|Temel|Fiyatlandırma|Varyantlar (SKU)|Varyantlar ve SKU'lar|Medya|Puanlar|Teslim|Lisans anahtarı havuzu|İlgili ürünler|Yorum moderasyonu|Kategoriler ve öznitelikler|Stok ayarları|SKU ayarları|Lisans ayarları|Medya ayarları|SEO ayarları|Puan ayarları|Teslim ayarları|Kargo ayarları|AI yazma asistanı|Stok takibi|Önce kaydet|Kaydet ve kapat|Ürün oluştur|Ürünü düzenle|SKU sil|Varsayılan|eksik|kaydedildi|oluşturuldu|seçildi",
  mk: "Производ|Производи|производ|производи|Поставки за производ|Детали за производ|Предупредување за производ|Производи во веб-продавница|Физички производи, дигитални производи, услуги, SKU, цени и залиха.|Новите производи се оневозможени|Webshop лиценцата е истечена. Постојните производи и SKU варијанти може да се уредуваат, но нови не може да се креираат.|Основно|Цени|Варијанти (SKU)|Варијанти и SKU|Медиуми|Оценки|Исполнување|Пул лиценцни клучеви|Поврзани производи|Модерација на рецензии|Категории и атрибути|Поставки за залиха|Поставки за SKU|Поставки за лиценци|Поставки за медиуми|SEO поставки|Поставки за оценки|Поставки за исполнување|Поставки за испорака|AI асистент за пишување|Следење залиха|Прво зачувај|Зачувај и затвори|Креирај производ|Уреди производ|Избриши SKU|Стандардно|недостасува|зачувано|креирано|избрано",
  bs: "Proizvod|Proizvodi|proizvod|proizvodi|Podešavanja proizvoda|Detalji proizvoda|Upozorenje za proizvod|Proizvodi web-prodavnici|Fizički proizvodi, digitalni proizvodi, usluge, SKU, cijene i zalihe.|Novi proizvodi su onemogućeni|Webshop licenca je istekla. Postojeći proizvodi i SKU varijante mogu se uređivati, ali novi se ne mogu kreirati.|Osnovno|Cijene|Varijante (SKU)|Varijante i SKU|Mediji|Ocjene|Ispunjenje|Pul licencnih ključeva|Povezani proizvodi|Moderacija recenzija|Kategorije i atributi|Podešavanja zaliha|Podešavanja SKU-a|Podešavanja licenci|Podešavanja medija|SEO podešavanja|Podešavanja ocjena|Podešavanja ispunjenja|Podešavanja isporuke|AI asistent za pisanje|Praćenje zaliha|Prvo sačuvaj|Sačuvaj i zatvori|Kreiraj proizvod|Uredi proizvod|Obriši SKU|Podrazumijevano|nedostaje|sačuvano|kreirano|izabrano",
  sl: "Izdelek|Izdelki|izdelek|izdelki|Nastavitve izdelka|Podrobnosti izdelka|Opozorilo za izdelek|Izdelki spletne trgovine|Fizični izdelki, digitalni izdelki, storitve, SKU-ji, cene in zaloga.|Novi izdelki so onemogočeni|Licenca Webshop je potekla. Obstoječe izdelke in različice SKU je mogoče urejati, novih pa ni mogoče ustvariti.|Osnove|Cene|Različice (SKU)|Različice in SKU-ji|Mediji|Ocene|Izpolnitev|Zbirka licenčnih ključev|Povezani izdelki|Moderiranje ocen|Kategorije in atributi|Nastavitve zaloge|Nastavitve SKU|Nastavitve licenc|Nastavitve medijev|Nastavitve SEO|Nastavitve ocen|Nastavitve izpolnitve|Nastavitve dostave|AI pomočnik za pisanje|Sledenje zalogi|Najprej shrani|Shrani in zapri|Ustvari izdelek|Uredi izdelek|Izbriši SKU|Privzeto|manjka|shranjeno|ustvarjeno|izbrano",
  ru: "Товар|Товары|товар|товары|Настройки товара|Детали товара|Предупреждение товара|Товары веб-магазина|Физические товары, цифровые товары, услуги, SKU, цены и склад.|Новые товары отключены|Лицензия Webshop истекла. Существующие товары и варианты SKU можно редактировать, но новые создавать нельзя.|Основное|Цены|Варианты (SKU)|Варианты и SKU|Медиа|Рейтинги|Выполнение|Пул лицензионных ключей|Связанные товары|Модерация отзывов|Категории и атрибуты|Настройки склада|Настройки SKU|Настройки лицензий|Настройки медиа|Настройки SEO|Настройки рейтингов|Настройки выполнения|Настройки доставки|AI-помощник для текста|Отслеживание склада|Сначала сохраните|Сохранить и закрыть|Создать товар|Редактировать товар|Удалить SKU|По умолчанию|отсутствует|сохранено|создано|выбрано",
  hu: "Termék|Termékek|termék|termékek|Termékbeállítások|Termékrészletek|Termékfigyelmeztetés|Webshop termékek|Fizikai termékek, digitális termékek, szolgáltatások, SKU-k, árak és készlet.|Az új termékek le vannak tiltva|A Webshop licenc lejárt. A meglévő termékek és SKU-változatok szerkeszthetők, de újak nem hozhatók létre.|Alapok|Árazás|Változatok (SKU)|Változatok és SKU-k|Média|Értékelések|Teljesítés|Licenckulcs-készlet|Kapcsolódó termékek|Értékelés moderálása|Kategóriák és attribútumok|Készletbeállítások|SKU-beállítások|Licencbeállítások|Médiabeállítások|SEO-beállítások|Értékelési beállítások|Teljesítési beállítások|Szállítási beállítások|AI íróasszisztens|Készlet követése|Előbb mentés|Mentés és bezárás|Termék létrehozása|Termék szerkesztése|SKU törlése|Alapértelmezett|hiányzik|mentve|létrehozva|kiválasztva",
  bg: "Продукт|Продукти|продукт|продукти|Настройки на продукта|Детайли за продукта|Предупреждение за продукта|Продукти на уеб магазина|Физически продукти, дигитални продукти, услуги, SKU, цени и наличности.|Новите продукти са изключени|Лицензът Webshop е изтекъл. Съществуващите продукти и SKU варианти могат да се редактират, но нови не могат да се създават.|Основни|Цени|Варианти (SKU)|Варианти и SKU|Медия|Оценки|Изпълнение|Пул от лицензни ключове|Свързани продукти|Модериране на отзиви|Категории и атрибути|Настройки на наличности|Настройки на SKU|Настройки на лицензи|Настройки на медия|SEO настройки|Настройки на оценки|Настройки на изпълнение|Настройки на доставка|AI асистент за писане|Следене на наличности|Първо запази|Запази и затвори|Създай продукт|Редактирай продукт|Изтрий SKU|По подразбиране|липсва|запазено|създадено|избрано",
  ja: "商品|商品|商品|商品|商品設定|商品詳細|商品の警告|ウェブショップ商品|物理商品、デジタル商品、サービス、SKU、価格、在庫。|新しい商品は無効です|Webshopライセンスの期限が切れています。既存の商品とSKUバリアントは編集できますが、新規作成はできません。|基本|価格|バリアント (SKU)|バリアントとSKU|メディア|評価|フルフィルメント|ライセンスキーのプール|関連商品|レビュー管理|カテゴリと属性|在庫設定|SKU設定|ライセンス設定|メディア設定|SEO設定|評価設定|フルフィルメント設定|配送設定|AIライティングアシスタント|在庫追跡|先に保存|保存して閉じる|商品を作成|商品を編集|SKUを削除|デフォルト|不足|保存済み|作成済み|選択済み",
  "zh-Hans":
    "商品|商品|商品|商品|商品设置|商品详情|商品警告|网店商品|实体商品、数字商品、服务、SKU、价格和库存。|新商品已禁用|Webshop 许可证已过期。现有商品和 SKU 变体仍可编辑，但不能创建新的。|基础|定价|变体 (SKU)|变体和 SKU|媒体|评分|履约|许可证密钥池|相关商品|评价审核|分类和属性|库存设置|SKU 设置|许可证设置|媒体设置|SEO 设置|评分设置|履约设置|配送设置|AI 写作助手|库存跟踪|先保存|保存并关闭|创建商品|编辑商品|删除 SKU|默认|缺失|已保存|已创建|已选择",
  "zh-Hant":
    "商品|商品|商品|商品|商品設定|商品詳細資訊|商品警告|網店商品|實體商品、數位商品、服務、SKU、價格與庫存。|新商品已停用|Webshop 授權已到期。現有商品和 SKU 變體仍可編輯，但不能建立新的。|基本|定價|變體 (SKU)|變體和 SKU|媒體|評分|履約|授權金鑰池|相關商品|評論審核|分類和屬性|庫存設定|SKU 設定|授權設定|媒體設定|SEO 設定|評分設定|履約設定|配送設定|AI 寫作助理|庫存追蹤|先儲存|儲存並關閉|建立商品|編輯商品|刪除 SKU|預設|缺少|已儲存|已建立|已選取",
  ar: "المنتج|المنتجات|المنتج|المنتجات|إعدادات المنتج|تفاصيل المنتج|تنبيه المنتج|منتجات المتجر|منتجات مادية، منتجات رقمية، خدمات، SKU، أسعار ومخزون.|تم تعطيل المنتجات الجديدة|انتهت صلاحية ترخيص Webshop. يمكن تعديل المنتجات ومتغيرات SKU الحالية، لكن لا يمكن إنشاء جديدة.|الأساسيات|التسعير|المتغيرات (SKU)|المتغيرات وSKU|الوسائط|التقييمات|التنفيذ|مجموعة مفاتيح الترخيص|منتجات ذات صلة|إشراف المراجعات|الفئات والسمات|إعدادات المخزون|إعدادات SKU|إعدادات الترخيص|إعدادات الوسائط|إعدادات SEO|إعدادات التقييمات|إعدادات التنفيذ|إعدادات الشحن|مساعد كتابة AI|تتبع المخزون|احفظ أولاً|حفظ وإغلاق|إنشاء منتج|تعديل المنتج|حذف SKU|افتراضي|مفقود|تم الحفظ|تم الإنشاء|محدد",
  id: "Produk|Produk|produk|produk|Pengaturan produk|Detail produk|Peringatan produk|Produk webshop|Produk fisik, produk digital, layanan, SKU, harga, dan inventaris.|Produk baru dinonaktifkan|Lisensi Webshop sudah kedaluwarsa. Produk dan varian SKU yang ada dapat diedit, tetapi yang baru tidak dapat dibuat.|Dasar|Harga|Varian (SKU)|Varian dan SKU|Media produk|Rating|Pemenuhan|Kumpulan kunci lisensi|Produk terkait|Moderasi ulasan|Kategori dan atribut|Pengaturan inventaris|Pengaturan SKU|Pengaturan lisensi|Pengaturan media|Pengaturan SEO|Pengaturan rating|Pengaturan pemenuhan|Pengaturan pengiriman|Asisten penulisan AI|Pelacakan inventaris|Simpan dulu|Simpan dan tutup|Buat produk|Edit produk|Hapus SKU|Default produk|hilang|disimpan|dibuat|dipilih",
  cs: "Produkt|Produkty|produkt|produkty|Nastavení produktu|Detaily produktu|Upozornění produktu|Produkty webshopu|Fyzické produkty, digitální produkty, služby, SKU, ceny a sklad.|Nové produkty jsou zakázány|Licence Webshop vypršela. Existující produkty a varianty SKU lze upravovat, ale nové nelze vytvářet.|Základy|Ceny|Varianty (SKU)|Varianty a SKU|Média|Hodnocení|Plnění|Fond licenčních klíčů|Související produkty|Moderace recenzí|Kategorie a atributy|Nastavení skladu|Nastavení SKU|Nastavení licencí|Nastavení médií|Nastavení SEO|Nastavení hodnocení|Nastavení plnění|Nastavení dopravy|AI asistent psaní|Sledování skladu|Nejprve uložit|Uložit a zavřít|Vytvořit produkt|Upravit produkt|Smazat SKU|Výchozí|chybí|uloženo|vytvořeno|vybráno",
  ro: "Produs|Produse|produs|produse|Setări produs|Detalii produs|Avertisment produs|Produse webshop|Produse fizice, produse digitale, servicii, SKU-uri, prețuri și stoc.|Produsele noi sunt dezactivate|Licența Webshop a expirat. Produsele și variantele SKU existente pot fi editate, dar nu pot fi create altele noi.|De bază|Prețuri|Variante (SKU)|Variante și SKU|Media|Evaluări|Îndeplinire|Fond de chei de licență|Produse similare|Moderare recenzii|Categorii și atribute|Setări stoc|Setări SKU|Setări licență|Setări media|Setări SEO|Setări evaluări|Setări îndeplinire|Setări livrare|Asistent de scriere AI|Urmărire stoc|Salvați mai întâi|Salvați și închideți|Creați produs|Editați produs|Ștergeți SKU|Implicit|lipsește|salvat|creat|selectat",
  el: "Προϊόν|Προϊόντα|προϊόν|προϊόντα|Ρυθμίσεις προϊόντος|Λεπτομέρειες προϊόντος|Προειδοποίηση προϊόντος|Προϊόντα webshop|Φυσικά προϊόντα, ψηφιακά προϊόντα, υπηρεσίες, SKU, τιμές και απόθεμα.|Τα νέα προϊόντα είναι απενεργοποιημένα|Η άδεια Webshop έληξε. Τα υπάρχοντα προϊόντα και οι παραλλαγές SKU μπορούν να επεξεργαστούν, αλλά δεν μπορούν να δημιουργηθούν νέα.|Βασικά|Τιμολόγηση|Παραλλαγές (SKU)|Παραλλαγές και SKU|Μέσα|Αξιολογήσεις|Εκπλήρωση|Δεξαμενή κλειδιών άδειας|Σχετικά προϊόντα|Συντονισμός κριτικών|Κατηγορίες και γνωρίσματα|Ρυθμίσεις αποθέματος|Ρυθμίσεις SKU|Ρυθμίσεις αδειών|Ρυθμίσεις μέσων|Ρυθμίσεις SEO|Ρυθμίσεις αξιολογήσεων|Ρυθμίσεις εκπλήρωσης|Ρυθμίσεις αποστολής|Βοηθός γραφής AI|Παρακολούθηση αποθέματος|Αποθήκευση πρώτα|Αποθήκευση και κλείσιμο|Δημιουργία προϊόντος|Επεξεργασία προϊόντος|Διαγραφή SKU|Προεπιλογή|λείπει|αποθηκεύτηκε|δημιουργήθηκε|επιλέχθηκε",
  da: "Produkt|Produkter|produkt|produkter|Produktindstillinger|Produktdetaljer|Produktadvarsel|Webshopprodukter|Fysiske produkter, digitale produkter, tjenester, SKU'er, priser og lager.|Nye produkter er deaktiveret|Webshop-licensen er udløbet. Eksisterende produkter og SKU-varianter kan redigeres, men nye kan ikke oprettes.|Grundlæggende|Priser|Varianter (SKU)|Varianter og SKU'er|Medier|Bedømmelser|Opfyldelse|Licensnøglepulje|Relaterede produkter|Anmeldelsesmoderation|Kategorier og attributter|Lagerindstillinger|SKU-indstillinger|Licensindstillinger|Medieindstillinger|SEO-indstillinger|Bedømmelsesindstillinger|Opfyldelsesindstillinger|Forsendelsesindstillinger|AI-skriveassistent|Lagersporing|Gem først|Gem og luk|Opret produkt|Rediger produkt|Slet SKU|Standard|mangler|gemt|oprettet|valgt",
  sv: "Produkt|Produkter|produkt|produkter|Produktinställningar|Produktdetaljer|Produktvarning|Webshopprodukter|Fysiska produkter, digitala produkter, tjänster, SKU:er, priser och lager.|Nya produkter är inaktiverade|Webshop-licensen har löpt ut. Befintliga produkter och SKU-varianter kan redigeras, men nya kan inte skapas.|Grunder|Priser|Varianter (SKU)|Varianter och SKU:er|Media|Betyg|Uppfyllnad|Licensnyckelpool|Relaterade produkter|Recensionsmoderering|Kategorier och attribut|Lagerinställningar|SKU-inställningar|Licensinställningar|Mediainställningar|SEO-inställningar|Betygsinställningar|Uppfyllnadsinställningar|Fraktinställningar|AI-skrivassistent|Lagerspårning|Spara först|Spara och stäng|Skapa produkt|Redigera produkt|Ta bort SKU|Standard|saknas|sparad|skapad|vald",
  nb: "Produkt|Produkter|produkt|produkter|Produktinnstillinger|Produktdetaljer|Produktadvarsel|Webshopprodukter|Fysiske produkter, digitale produkter, tjenester, SKU-er, priser og lager.|Nye produkter er deaktivert|Webshop-lisensen er utløpt. Eksisterende produkter og SKU-varianter kan redigeres, men nye kan ikke opprettes.|Grunnleggende|Priser|Varianter (SKU)|Varianter og SKU-er|Medier|Vurderinger|Oppfyllelse|Lisensnøkkelpool|Relaterte produkter|Anmeldelsesmoderering|Kategorier og attributter|Lagerinnstillinger|SKU-innstillinger|Lisensinnstillinger|Medieinnstillinger|SEO-innstillinger|Vurderingsinnstillinger|Oppfyllelsesinnstillinger|Fraktinnstillinger|AI-skriveassistent|Lagersporing|Lagre først|Lagre og lukk|Opprett produkt|Rediger produkt|Slett SKU|Standard|mangler|lagret|opprettet|valgt",
  nn: "Produkt|Produkt|produkt|produkt|Produktinnstillingar|Produktdetaljar|Produktvarsel|Webshopprodukt|Fysiske produkt, digitale produkt, tenester, SKU-ar, prisar og lager.|Nye produkt er deaktiverte|Webshop-lisensen er utgått. Eksisterande produkt og SKU-variantar kan redigerast, men nye kan ikkje opprettast.|Grunnleggjande|Prisar|Variantar (SKU)|Variantar og SKU-ar|Medium|Vurderingar|Oppfylling|Lisensnøkkelpool|Relaterte produkt|Moderering av vurderingar|Kategoriar og attributt|Lagerinnstillingar|SKU-innstillingar|Lisensinnstillingar|Medieinnstillingar|SEO-innstillingar|Vurderingsinnstillingar|Oppfyllingsinnstillingar|Fraktinnstillingar|AI-skriveassistent|Lagersporing|Lagra først|Lagra og lukk|Opprett produkt|Rediger produkt|Slett SKU|Standard|manglar|lagra|oppretta|valt",
  fi: "Tuote|Tuotteet|tuote|tuotteet|Tuoteasetukset|Tuotetiedot|Tuotevaroitus|Verkkokaupan tuotteet|Fyysiset tuotteet, digitaaliset tuotteet, palvelut, SKU:t, hinnat ja varasto.|Uudet tuotteet on poistettu käytöstä|Webshop-lisenssi on vanhentunut. Olemassa olevia tuotteita ja SKU-muunnelmia voi muokata, mutta uusia ei voi luoda.|Perustiedot|Hinnoittelu|Muunnelmat (SKU)|Muunnelmat ja SKU:t|Media|Arviot|Toimitus|Lisenssiavainpooli|Liittyvät tuotteet|Arvostelujen moderointi|Kategoriat ja attribuutit|Varastoasetukset|SKU-asetukset|Lisenssiasetukset|Media-asetukset|SEO-asetukset|Arvioasetukset|Toimitusasetukset|Lähetysasetukset|AI-kirjoitusavustaja|Varaston seuranta|Tallenna ensin|Tallenna ja sulje|Luo tuote|Muokkaa tuotetta|Poista SKU|Oletus|puuttuu|tallennettu|luotu|valittu",
  is: "Vara|Vörur|vara|vörur|Vörustillingar|Vöruupplýsingar|Vöruviðvörun|Vörur vefverslunar|Efnislegar vörur, stafrænar vörur, þjónusta, SKU, verð og birgðir.|Nýjar vörur eru óvirkar|Webshop-leyfið er útrunnið. Hægt er að breyta fyrirliggjandi vörum og SKU-afbrigðum, en ekki er hægt að stofna ný.|Grunnatriði|Verð|Afbrigði (SKU)|Afbrigði og SKU|Miðlar|Einkunnir|Afgreiðsla|Leyfislykilslaug|Tengdar vörur|Umsjón umsagna|Flokkar og eigindi|Birgðastillingar|SKU-stillingar|Leyfisstillingar|Miðlastillingar|SEO-stillingar|Einkunnastillingar|Afgreiðslustillingar|Sendingarstillingar|AI-ritaðstoð|Birgðarakning|Vista fyrst|Vista og loka|Stofna vöru|Breyta vöru|Eyða SKU|Sjálfgefið|vantar|vistað|stofnað|valið",
} satisfies Record<LocalizedLanguage, string>;

function createTerms(language: LocalizedLanguage): Terms {
  const values = TERM_ROWS[language].split("|");
  if (values.length !== TERM_KEYS.length) {
    throw new Error(
      `Invalid webshop products translation row for ${language}: expected ${TERM_KEYS.length}, received ${values.length}.`,
    );
  }
  return Object.fromEntries(
    TERM_KEYS.map((key, index) => [key, values[index] ?? key]),
  ) as Terms;
}

const SERBIAN_PRODUCT_EXACT_TRANSLATIONS = {
  "sr-Latn": {
    "Base price": "Osnovna cena",
    "Compare-at price": "Uporedna cena",
    Currency: "Valuta",
    "Tax category": "Poreska kategorija",
    "Paddle price ID": "Paddle ID cene",
    "Stock policy": "Politika zaliha",
    "Low-stock threshold": "Prag niskih zaliha",
    "Delivery type": "Tip isporuke",
    "Delivery mode": "Nacin isporuke",
    "Digital asset": "Digitalni fajl",
    "License key policy": "Politika licencnog kljuca",
    "Validity days": "Dani vazenja",
    "Download limit": "Limit preuzimanja",
    "Expiry days": "Dani isteka",
    "File version": "Verzija fajla",
    "Refund/revocation policy": "Politika povracaja/opoziva",
    "Duration minutes": "Trajanje u minutima",
    Capacity: "Kapacitet",
    "Booking required": "Zakazivanje obavezno",
    "Location or meeting instructions": "Lokacija ili uputstva za sastanak",
    "Cancellation policy": "Politika otkazivanja",
    "Requires shipping": "Zahteva isporuku",
    "COD eligible": "Dostupno za placanje pouzecem",
    "Shipping class": "Klasa isporuke",
    "Shipping availability": "Dostupnost isporuke",
    "Package weight grams": "Tezina paketa u gramima",
    "Package length cm": "Duzina paketa u cm",
    "Package width cm": "Sirina paketa u cm",
    "Package height cm": "Visina paketa u cm",
    "Additional shipping fee": "Dodatna naknada za isporuku",
    "Fixed shipping fee override": "Fiksna zamena naknade za isporuku",
    file: "fajl",
    license: "licenca",
    "file + license": "fajl + licenca",
    manual: "rucno",
    pool: "pul",
    online: "onlajn",
    phone: "telefon",
    "in person": "uzivo",
    "Fallback product price in the selected currency. If a SKU has its own price, the storefront shows the selected SKU price instead. Enter normal units, for example 45000 RSD.":
      "Rezervna cena proizvoda u izabranoj valuti. Ako SKU ima sopstvenu cenu, izlog prikazuje cenu tog SKU-a. Unesi normalne jedinice, na primer 45000 RSD.",
    "Optional original or reference price in normal currency units. It must be at least the Base price and is shown only when higher.":
      "Opciona originalna ili referentna cena u normalnim novcanim jedinicama. Mora biti najmanje kao osnovna cena i prikazuje se samo kada je visa.",
    "Allowed currencies come from Webshop settings.":
      "Dozvoljene valute dolaze iz podesavanja veb-prodavnice.",
    "Optional product tax category. Leave on default to use the store default tax rate.":
      "Opciona poreska kategorija proizvoda. Ostavi podrazumevano da se koristi osnovna poreska stopa prodavnice.",
    "Optional Paddle Billing price ID used as the checkout fallback when a SKU does not define its own Paddle price.":
      "Opcioni Paddle Billing ID cene koji se koristi kao rezerva pri placanju kada SKU nema sopstvenu Paddle cenu.",
    "Controls what happens when tracked stock runs out: deny blocks checkout, allow_backorder accepts later fulfillment, and preorder accepts advance orders.":
      "Odredjuje sta se desava kada pracene zalihe nestanu: deny blokira placanje, allow_backorder prima porudzbinu za kasnije ispunjenje, a preorder prima prednarudzbine.",
    "Optional warning level for low stock. For example, 5 marks the product as low stock at 5 units or fewer.":
      "Opcioni prag upozorenja za niske zalihe. Na primer, 5 oznacava proizvod kao niske zalihe kada ima 5 komada ili manje.",
    "Turn on when product availability should depend on stored stock quantities by default.":
      "Ukljuci kada dostupnost proizvoda podrazumevano treba da zavisi od upisanih kolicina zaliha.",
    "Synced product type and SKU from the selected License Server catalog.":
      "Sinhronizovan tip proizvoda i SKU iz izabranog kataloga License Server-a.",
    "External product type or category ID configured on the selected License Server.":
      "Eksterni tip proizvoda ili ID kategorije podesen na izabranom License Server-u.",
    "External SKU configured on the selected License Server.":
      "Eksterni SKU podesen na izabranom License Server-u.",
    "Controls whether the customer receives a file, a license key, or both.":
      "Odredjuje da li kupac dobija fajl, licencni kljuc ili oba.",
    "Pool means checkout allocates keys from the prepared key pool; license server means an external service issues the key after payment.":
      "Pul znaci da placanje dodeljuje kljuceve iz pripremljenog pula; license server znaci da eksterni servis izdaje kljuc posle placanja.",
    "Optional validity period. The countdown starts when the key is assigned to a paid order.":
      "Opcioni period vazenja. Odbrojavanje pocinje kada se kljuc dodeli placenoj porudzbini.",
    "Unique stock keeping unit for this purchasable variant. Customers can see it on the storefront when SKU display is enabled.":
      "Jedinstveni SKU za ovu kupovnu varijantu. Kupci ga vide na izlogu kada je prikaz SKU-a ukljucen.",
    "Customer-facing variant name shown in the variant selector, cart, checkout, and order records.":
      "Naziv varijante koji vidi kupac u biracu varijanti, korpi, placanju i zapisima porudzbina.",
    "Optional SKU sale price in normal currency units. Leave blank to inherit the product Base price.":
      "Opciona prodajna cena SKU-a u normalnim novcanim jedinicama. Ostavi prazno da nasledi osnovnu cenu proizvoda.",
    "Optional reference price for this SKU. It must be at least the SKU price and is shown only when higher.":
      "Opciona referentna cena za ovaj SKU. Mora biti najmanje kao SKU cena i prikazuje se samo kada je visa.",
    "Optional Paddle Billing price ID for this SKU. It overrides the product Paddle price ID at checkout.":
      "Opcioni Paddle Billing ID cene za ovaj SKU. Pri placanju zamenjuje Paddle ID cene proizvoda.",
    "Physical units currently available for this SKU before reserved stock is subtracted.":
      "Fizicke jedinice trenutno dostupne za ovaj SKU pre oduzimanja rezervisanih zaliha.",
    "Controls whether this SKU can appear and be purchased. Active SKUs are sellable; hidden or archived SKUs are not offered on the storefront.":
      "Odredjuje da li se ovaj SKU prikazuje i moze da se kupi. Aktivni SKU-ovi se prodaju; skriveni ili arhivirani nisu ponudjeni na izlogu.",
    "Controls checkout behavior when tracked stock runs out: deny blocks checkout, allow_backorder accepts later fulfillment, and preorder accepts advance orders.":
      "Odredjuje ponasanje placanja kada pracene zalihe nestanu: deny blokira placanje, allow_backorder prima kasnije ispunjenje, a preorder prima prednarudzbine.",
    "Units already held by open carts or existing orders. Available stock is calculated from On hand minus Reserved.":
      "Jedinice vec zadrzane u otvorenim korpama ili postojecim porudzbinama. Dostupna zaliha se racuna kao Na stanju minus Rezervisano.",
    "Optional low-stock warning level for this SKU. Leave blank to use no SKU-specific low-stock threshold.":
      "Opcioni prag upozorenja za niske zalihe ovog SKU-a. Ostavi prazno ako nema posebnog SKU praga.",
    "Turn on when this SKU availability should depend on On hand, Reserved, and Stock policy values.":
      "Ukljuci kada dostupnost ovog SKU-a treba da zavisi od vrednosti Na stanju, Rezervisano i Politika zaliha.",
    "Private file delivered after purchase.":
      "Privatni fajl koji se isporucuje posle kupovine.",
    "Manual means an admin provides the key, pool means keys come from prepared stock, and a listed license server issues the key after payment.":
      "Rucno znaci da admin daje kljuc, pul znaci da kljucevi dolaze iz pripremljene zalihe, a navedeni license server izdaje kljuc posle placanja.",
    "Maximum downloads allowed for each purchase. Leave blank when downloads should not be capped.":
      "Maksimalan broj preuzimanja za svaku kupovinu. Ostavi prazno kada preuzimanja ne treba ograniciti.",
    "Number of days the download stays available after purchase. Leave blank when access should not expire.":
      "Broj dana koliko preuzimanje ostaje dostupno posle kupovine. Ostavi prazno kada pristup ne treba da istekne.",
    "Internal version label for the file or build sold to the customer, useful when assets are updated over time.":
      "Interna oznaka verzije fajla ili build-a koji se prodaje kupcu, korisna kada se fajlovi vremenom azuriraju.",
    "Operational notes for refunds, revoked downloads, or license key access after a payment is returned.":
      "Operativne beleške za povracaje, opozvana preuzimanja ili pristup licencnom kljucu posle vracenog placanja.",
    "Expected length of the service in minutes, used for scheduling and admin context.":
      "Ocekivano trajanje usluge u minutima, koristi se za zakazivanje i admin kontekst.",
    "How the service is delivered to the customer: online, by phone, or in person.":
      "Kako se usluga isporucuje kupcu: online, telefonom ili uzivo.",
    "How many people, seats, or units one order can cover. Leave blank when capacity does not apply.":
      "Koliko ljudi, mesta ili jedinica jedna porudzbina moze da pokrije. Ostavi prazno kada kapacitet nije primenljiv.",
    "Enable when the order needs an appointment, reservation, or scheduled time before it can be fulfilled.":
      "Ukljuci kada porudzbina trazi termin, rezervaciju ili zakazano vreme pre ispunjenja.",
    "Address, meeting link, phone instructions, or any other details needed to deliver the service.":
      "Adresa, link za sastanak, telefonska uputstva ili drugi detalji potrebni za isporuku usluge.",
    "Rules staff should follow for cancellations, rescheduling, no-shows, or refunds for this service.":
      "Pravila koja osoblje prati za otkazivanja, pomeranja termina, nedolazak ili povracaje za ovu uslugu.",
    "Enable for products that must be physically shipped. Turn off only when delivery is not needed for this item.":
      "Ukljuci za proizvode koji moraju fizicki da se isporuce. Iskljuci samo kada dostava nije potrebna za ovaj artikal.",
    "Makes this product eligible for Cash on delivery. Checkout offers COD only when every cart item is a COD-eligible physical product that requires shipping and COD is enabled in Payments.":
      "Omogucava placanje pouzecem za ovaj proizvod. Placanje nudi COD samo kada je svaka stavka u korpi fizicki proizvod dostupan za COD, zahteva isporuku i COD je ukljucen u placanjima.",
    "Optional metadata label for shipping integrations or future rules, for example small, fragile, bulky, or free-shipping. It does not filter rates by itself.":
      "Opciona metadata oznaka za integracije isporuke ili buduca pravila, na primer small, fragile, bulky ili free-shipping. Sama ne filtrira cene.",
    "Packed parcel weight in grams, used for shipping rates, courier labels, courier eligibility, and logistics rules.":
      "Tezina zapakovanog paketa u gramima, koristi se za cene isporuke, kurirske nalepnice, podobnost kurira i logisticka pravila.",
    "Package length in centimeters, used when shipping rules or carriers need parcel dimensions.":
      "Duzina paketa u centimetrima, koristi se kada pravila isporuke ili kuriri traze dimenzije paketa.",
    "Package width in centimeters, used together with length and height for dimensional shipping rules.":
      "Sirina paketa u centimetrima, koristi se sa duzinom i visinom za pravila dimenzionalne isporuke.",
    "Package height in centimeters, used for carriers, parcel labels, or bulky-item handling.":
      "Visina paketa u centimetrima, koristi se za kurire, nalepnice paketa ili rukovanje glomaznim artiklima.",
    "Optional per-item amount added on top of the selected shipping method. Fixed shipping fee override takes precedence.":
      "Opcioni iznos po artiklu koji se dodaje na izabrani metod isporuke. Fiksna zamena naknade za isporuku ima prednost.",
    "Optional per-item amount that replaces the selected method base fee when this product is in the cart; quantity still applies.":
      "Opcioni iznos po artiklu koji zamenjuje osnovnu naknadu izabranog metoda kada je ovaj proizvod u korpi; kolicina se i dalje primenjuje.",
    "Couriers are assigned inside each shipping method.":
      "Kuriri se dodeljuju unutar svakog metoda isporuke.",
    "Use every global method that matches this product's package limits.":
      "Koristi svaki globalni metod koji odgovara ogranicenjima paketa ovog proizvoda.",
    "Use this when the product must be limited to specific delivery options.":
      "Koristi ovo kada proizvod mora biti ogranicen na odredjene opcije isporuke.",
    "Select the methods this product can use.":
      "Izaberi metode koje ovaj proizvod moze da koristi.",
    "Preview of methods currently allowed by this product.":
      "Pregled metoda koje ovaj proizvod trenutno dozvoljava.",
    "Package weight and dimensions describe the packed parcel used for courier eligibility, rates, and labels. Use category attributes for the unpacked product's own weight or dimensions when those should appear as product specifications.":
      "Tezina i dimenzije paketa opisuju zapakovanu posiljku za podobnost kurira, cene i nalepnice. Za raspakovani proizvod koristi atribute kategorije kada te vrednosti treba da budu specifikacije proizvoda.",
    "Each SKU represents one purchasable variant. Price is the SKU sale price shown on the storefront; if left blank, the SKU inherits the product Base price. Compare is an optional reference price for discounts; a SKU Compare value overrides the product Compare-at price. SKUs that inherit the product Base price can also inherit the product Compare-at price. SKUs with a different Price should set their own Compare value. On hand is available stock, Reserved is stock held by carts or orders, and Low threshold marks when the SKU should be treated as low stock.":
      "Svaki SKU predstavlja jednu kupovnu varijantu. Cena je prodajna cena SKU-a na izlogu; ako je prazna, SKU nasledjuje osnovnu cenu proizvoda. Uporedna cena je opciona referentna cena za popuste; SKU uporedna cena zamenjuje uporednu cenu proizvoda. SKU-ovi sa drugom cenom treba da imaju sopstvenu uporednu cenu. Na stanju je dostupna zaliha, Rezervisano je zaliha u korpama ili porudzbinama, a Nizak prag oznacava kada je SKU na niskim zalihama.",
    "Use Base price and Compare-at price as the product defaults. A first or default SKU can follow these values; SKUs with a different price should define their own price and compare-at price so they do not inherit a lower reference price.":
      "Koristi osnovnu i uporednu cenu kao podrazumevane vrednosti proizvoda. Prvi ili podrazumevani SKU moze da prati te vrednosti; SKU-ovi sa drugom cenom treba da imaju sopstvenu cenu i uporednu cenu da ne naslede nizu referentnu cenu.",
    "Write something about this product…": "Napisi nesto o ovom proizvodu…",
  },
  "sr-Cyrl": {
    "Base price": "Основна цена",
    "Compare-at price": "Упоредна цена",
    Currency: "Валута",
    "Tax category": "Пореска категорија",
    "Paddle price ID": "Paddle ID цене",
    "Stock policy": "Политика залиха",
    "Low-stock threshold": "Праг ниских залиха",
    "Delivery type": "Тип испоруке",
    "Delivery mode": "Начин испоруке",
    "Digital asset": "Дигитални фајл",
    "License key policy": "Политика лиценцног кључа",
    "Validity days": "Дани важења",
    "Download limit": "Лимит преузимања",
    "Expiry days": "Дани истека",
    "File version": "Верзија фајла",
    "Refund/revocation policy": "Политика повраћаја/опозива",
    "Duration minutes": "Трајање у минутима",
    Capacity: "Капацитет",
    "Booking required": "Заказивање обавезно",
    "Location or meeting instructions": "Локација или упутства за састанак",
    "Cancellation policy": "Политика отказивања",
    "Requires shipping": "Захтева испоруку",
    "COD eligible": "Доступно за плаћање поузећем",
    "Shipping class": "Класа испоруке",
    "Shipping availability": "Доступност испоруке",
    "Package weight grams": "Тежина пакета у грамима",
    "Package length cm": "Дужина пакета у cm",
    "Package width cm": "Ширина пакета у cm",
    "Package height cm": "Висина пакета у cm",
    "Additional shipping fee": "Додатна накнада за испоруку",
    "Fixed shipping fee override": "Фиксна замена накнаде за испоруку",
    file: "фајл",
    license: "лиценца",
    "file + license": "фајл + лиценца",
    manual: "ручно",
    pool: "пул",
    online: "онлајн",
    phone: "телефон",
    "in person": "уживо",
    "Fallback product price in the selected currency. If a SKU has its own price, the storefront shows the selected SKU price instead. Enter normal units, for example 45000 RSD.":
      "Резервна цена производа у изабраној валути. Ако SKU има сопствену цену, излог приказује цену тог SKU-а. Унеси нормалне јединице, на пример 45000 RSD.",
    "Optional original or reference price in normal currency units. It must be at least the Base price and is shown only when higher.":
      "Опциона оригинална или референтна цена у нормалним новчаним јединицама. Мора бити најмање као основна цена и приказује се само када је виша.",
    "Allowed currencies come from Webshop settings.":
      "Дозвољене валуте долазе из подешавања веб-продавнице.",
    "Optional product tax category. Leave on default to use the store default tax rate.":
      "Опциона пореска категорија производа. Остави подразумевано да се користи основна пореска стопа продавнице.",
    "Optional Paddle Billing price ID used as the checkout fallback when a SKU does not define its own Paddle price.":
      "Опциони Paddle Billing ID цене који се користи као резерва при плаћању када SKU нема сопствену Paddle цену.",
    "Controls what happens when tracked stock runs out: deny blocks checkout, allow_backorder accepts later fulfillment, and preorder accepts advance orders.":
      "Одређује шта се дешава када праћене залихе нестану: deny блокира плаћање, allow_backorder прима поруџбину за касније испуњење, а preorder прима преднаруџбине.",
    "Optional warning level for low stock. For example, 5 marks the product as low stock at 5 units or fewer.":
      "Опциони праг упозорења за ниске залихе. На пример, 5 означава производ као ниске залихе када има 5 комада или мање.",
    "Turn on when product availability should depend on stored stock quantities by default.":
      "Укључи када доступност производа подразумевано треба да зависи од уписаних количина залиха.",
    "Synced product type and SKU from the selected License Server catalog.":
      "Синхронизован тип производа и SKU из изабраног каталога License Server-а.",
    "External product type or category ID configured on the selected License Server.":
      "Екстерни тип производа или ID категорије подешен на изабраном License Server-у.",
    "External SKU configured on the selected License Server.":
      "Екстерни SKU подешен на изабраном License Server-у.",
    "Controls whether the customer receives a file, a license key, or both.":
      "Одређује да ли купац добија фајл, лиценцни кључ или оба.",
    "Pool means checkout allocates keys from the prepared key pool; license server means an external service issues the key after payment.":
      "Пул значи да плаћање додељује кључеве из припремљеног пула; license server значи да екстерни сервис издаје кључ после плаћања.",
    "Optional validity period. The countdown starts when the key is assigned to a paid order.":
      "Опциони период важења. Одбројавање почиње када се кључ додели плаћеној поруџбини.",
    "Unique stock keeping unit for this purchasable variant. Customers can see it on the storefront when SKU display is enabled.":
      "Јединствени SKU за ову куповну варијанту. Купци га виде на излогу када је приказ SKU-а укључен.",
    "Customer-facing variant name shown in the variant selector, cart, checkout, and order records.":
      "Назив варијанте који види купац у бирачу варијанти, корпи, плаћању и записима поруџбина.",
    "Optional SKU sale price in normal currency units. Leave blank to inherit the product Base price.":
      "Опциона продајна цена SKU-а у нормалним новчаним јединицама. Остави празно да наследи основну цену производа.",
    "Optional reference price for this SKU. It must be at least the SKU price and is shown only when higher.":
      "Опциона референтна цена за овај SKU. Мора бити најмање као SKU цена и приказује се само када је виша.",
    "Optional Paddle Billing price ID for this SKU. It overrides the product Paddle price ID at checkout.":
      "Опциони Paddle Billing ID цене за овај SKU. При плаћању замењује Paddle ID цене производа.",
    "Physical units currently available for this SKU before reserved stock is subtracted.":
      "Физичке јединице тренутно доступне за овај SKU пре одузимања резервисаних залиха.",
    "Controls whether this SKU can appear and be purchased. Active SKUs are sellable; hidden or archived SKUs are not offered on the storefront.":
      "Одређује да ли се овај SKU приказује и може да се купи. Активни SKU-ови се продају; скривени или архивирани нису понуђени на излогу.",
    "Controls checkout behavior when tracked stock runs out: deny blocks checkout, allow_backorder accepts later fulfillment, and preorder accepts advance orders.":
      "Одређује понашање плаћања када праћене залихе нестану: deny блокира плаћање, allow_backorder прима касније испуњење, а preorder прима преднаруџбине.",
    "Units already held by open carts or existing orders. Available stock is calculated from On hand minus Reserved.":
      "Јединице већ задржане у отвореним корпама или постојећим поруџбинама. Доступна залиха се рачуна као На стању минус Резервисано.",
    "Optional low-stock warning level for this SKU. Leave blank to use no SKU-specific low-stock threshold.":
      "Опциони праг упозорења за ниске залихе овог SKU-а. Остави празно ако нема посебног SKU прага.",
    "Turn on when this SKU availability should depend on On hand, Reserved, and Stock policy values.":
      "Укључи када доступност овог SKU-а треба да зависи од вредности На стању, Резервисано и Политика залиха.",
    "Private file delivered after purchase.":
      "Приватни фајл који се испоручује после куповине.",
    "Manual means an admin provides the key, pool means keys come from prepared stock, and a listed license server issues the key after payment.":
      "Ручно значи да админ даје кључ, пул значи да кључеви долазе из припремљене залихе, а наведени license server издаје кључ после плаћања.",
    "Maximum downloads allowed for each purchase. Leave blank when downloads should not be capped.":
      "Максималан број преузимања за сваку куповину. Остави празно када преузимања не треба ограничити.",
    "Number of days the download stays available after purchase. Leave blank when access should not expire.":
      "Број дана колико преузимање остаје доступно после куповине. Остави празно када приступ не треба да истекне.",
    "Internal version label for the file or build sold to the customer, useful when assets are updated over time.":
      "Интерна ознака верзије фајла или build-а који се продаје купцу, корисна када се фајлови временом ажурирају.",
    "Operational notes for refunds, revoked downloads, or license key access after a payment is returned.":
      "Оперативне белешке за повраћаје, опозвана преузимања или приступ лиценцном кључу после враћеног плаћања.",
    "Expected length of the service in minutes, used for scheduling and admin context.":
      "Очекивано трајање услуге у минутима, користи се за заказивање и админ контекст.",
    "How the service is delivered to the customer: online, by phone, or in person.":
      "Како се услуга испоручује купцу: онлајн, телефоном или уживо.",
    "How many people, seats, or units one order can cover. Leave blank when capacity does not apply.":
      "Колико људи, места или јединица једна поруџбина може да покрије. Остави празно када капацитет није применљив.",
    "Enable when the order needs an appointment, reservation, or scheduled time before it can be fulfilled.":
      "Укључи када поруџбина тражи термин, резервацију или заказано време пре испуњења.",
    "Address, meeting link, phone instructions, or any other details needed to deliver the service.":
      "Адреса, линк за састанак, телефонска упутства или други детаљи потребни за испоруку услуге.",
    "Rules staff should follow for cancellations, rescheduling, no-shows, or refunds for this service.":
      "Правила која особље прати за отказивања, померања термина, недолазак или повраћаје за ову услугу.",
    "Enable for products that must be physically shipped. Turn off only when delivery is not needed for this item.":
      "Укључи за производе који морају физички да се испоруче. Искључи само када достава није потребна за овај артикал.",
    "Makes this product eligible for Cash on delivery. Checkout offers COD only when every cart item is a COD-eligible physical product that requires shipping and COD is enabled in Payments.":
      "Омогућава плаћање поузећем за овај производ. Плаћање нуди COD само када је свака ставка у корпи физички производ доступан за COD, захтева испоруку и COD је укључен у плаћањима.",
    "Optional metadata label for shipping integrations or future rules, for example small, fragile, bulky, or free-shipping. It does not filter rates by itself.":
      "Опциона metadata ознака за интеграције испоруке или будућа правила, на пример small, fragile, bulky или free-shipping. Сама не филтрира цене.",
    "Packed parcel weight in grams, used for shipping rates, courier labels, courier eligibility, and logistics rules.":
      "Тежина запакованог пакета у грамима, користи се за цене испоруке, курирске налепнице, подобност курира и логистичка правила.",
    "Package length in centimeters, used when shipping rules or carriers need parcel dimensions.":
      "Дужина пакета у центиметрима, користи се када правила испоруке или курири траже димензије пакета.",
    "Package width in centimeters, used together with length and height for dimensional shipping rules.":
      "Ширина пакета у центиметрима, користи се са дужином и висином за правила димензионалне испоруке.",
    "Package height in centimeters, used for carriers, parcel labels, or bulky-item handling.":
      "Висина пакета у центиметрима, користи се за курире, налепнице пакета или руковање гломазним артиклима.",
    "Optional per-item amount added on top of the selected shipping method. Fixed shipping fee override takes precedence.":
      "Опциони износ по артиклу који се додаје на изабрани метод испоруке. Фиксна замена накнаде за испоруку има предност.",
    "Optional per-item amount that replaces the selected method base fee when this product is in the cart; quantity still applies.":
      "Опциони износ по артиклу који замењује основну накнаду изабраног метода када је овај производ у корпи; количина се и даље примењује.",
    "Couriers are assigned inside each shipping method.":
      "Курири се додељују унутар сваког метода испоруке.",
    "Use every global method that matches this product's package limits.":
      "Користи сваки глобални метод који одговара ограничењима пакета овог производа.",
    "Use this when the product must be limited to specific delivery options.":
      "Користи ово када производ мора бити ограничен на одређене опције испоруке.",
    "Select the methods this product can use.":
      "Изабери методе које овај производ може да користи.",
    "Preview of methods currently allowed by this product.":
      "Преглед метода које овај производ тренутно дозвољава.",
    "Package weight and dimensions describe the packed parcel used for courier eligibility, rates, and labels. Use category attributes for the unpacked product's own weight or dimensions when those should appear as product specifications.":
      "Тежина и димензије пакета описују запаковану пошиљку за подобност курира, цене и налепнице. За распаковани производ користи атрибуте категорије када те вредности треба да буду спецификације производа.",
    "Each SKU represents one purchasable variant. Price is the SKU sale price shown on the storefront; if left blank, the SKU inherits the product Base price. Compare is an optional reference price for discounts; a SKU Compare value overrides the product Compare-at price. SKUs that inherit the product Base price can also inherit the product Compare-at price. SKUs with a different Price should set their own Compare value. On hand is available stock, Reserved is stock held by carts or orders, and Low threshold marks when the SKU should be treated as low stock.":
      "Сваки SKU представља једну куповну варијанту. Цена је продајна цена SKU-а на излогу; ако је празна, SKU наслеђује основну цену производа. Упоредна цена је опциона референтна цена за попусте; SKU упоредна цена замењује упоредну цену производа. SKU-ови са другом ценом треба да имају сопствену упоредну цену. На стању је доступна залиха, Резервисано је залиха у корпама или поруџбинама, а Низак праг означава када је SKU на ниским залихама.",
    "Use Base price and Compare-at price as the product defaults. A first or default SKU can follow these values; SKUs with a different price should define their own price and compare-at price so they do not inherit a lower reference price.":
      "Користи основну и упоредну цену као подразумеване вредности производа. Први или подразумевани SKU може да прати те вредности; SKU-ови са другом ценом треба да имају сопствену цену и упоредну цену да не наследе нижу референтну цену.",
    "Write something about this product…": "Напиши нешто о овом производу…",
  },
} satisfies Record<"sr-Latn" | "sr-Cyrl", Record<string, string>>;

function translateSerbianExact(language: LocalizedLanguage, source: string) {
  if (language !== "sr-Latn" && language !== "sr-Cyrl") return null;
  const translations: Record<string, string> =
    SERBIAN_PRODUCT_EXACT_TRANSLATIONS[language];
  return translations[source] ?? null;
}

function translateKnownSource(
  source: string,
  terms: Terms,
  language: LocalizedLanguage,
) {
  const exactOverride = translateSerbianExact(language, source);
  if (exactOverride) return exactOverride;

  const exact: Record<string, string> = {
    "{count} product": `{count} ${terms.product}`,
    "{count} products": `{count} ${terms.productsLower}`,
    "{count} SKU": `{count} ${terms.sku}`,
    "{label}: {message}": `${terms.warning}: {label} - {message}`,
    "AI writing assistant": terms.ai,
    "All scopes": terms.license,
    "All variants": terms.sku,
    "Alt text or caption": terms.mediaSettings,
    "Any SKU-specific": terms.sku,
    "Auto-publish ratings": terms.ratingSettings,
    "Base price": terms.pricing,
    Basics: terms.basics,
    "Canonical URL": terms.seo,
    "Categories and attributes": terms.categoryAttrs,
    "COD eligible": terms.shipping,
    "Compare-at price": terms.pricing,
    "Cover image": terms.mediaSettings,
    "Create product": terms.createProduct,
    Default: terms.defaultValue,
    "Delete SKU": terms.deleteSku,
    "Delivery mode": terms.fulfillmentSettings,
    "Delivery type": terms.fulfillmentSettings,
    "Digital asset": terms.license,
    "Edit product": terms.editProduct,
    "Enable product ratings": terms.ratingSettings,
    "Fixed shipping fee override": terms.shipping,
    Fulfillment: terms.fulfillment,
    "Generate {label} with AI": `{label}: ${terms.ai}`,
    "Inventory tracking": terms.trackInventory,
    "License key policy": terms.license,
    "License key pool": terms.licensePool,
    "License keys": terms.license,
    "Low-stock threshold": terms.stock,
    "Managed gallery": terms.mediaSettings,
    Media: terms.mediaSettings,
    "Meta description": terms.seo,
    "Meta title": terms.seo,
    missing: terms.missing,
    "New products are disabled": terms.productDisabled,
    "No expiry": terms.license,
    "No notes": terms.license,
    "No SKU variants": terms.sku,
    "Not assigned": terms.license,
    "Package height cm": terms.shipping,
    "Package length cm": terms.shipping,
    "Package weight grams": terms.shipping,
    "Package width cm": terms.shipping,
    "Paddle price ID": terms.pricing,
    "Price {currency}": `${terms.pricing} {currency}`,
    Pricing: terms.pricing,
    Product: terms.product === "Product" ? terms.settings : terms.product,
    "Product created.": `${terms.product} ${terms.created}.`,
    "Product media": terms.mediaSettings,
    "Product saved.": `${terms.product} ${terms.saved}.`,
    "Product type": terms.settings,
    "Product video": terms.mediaSettings,
    "Product-wide": terms.license,
    Products: terms.products,
    "Provider:": terms.ai,
    Public: terms.ratingSettings,
    "Related products": terms.relatedProducts,
    "Requires shipping": terms.shipping,
    "Review moderation": terms.reviewModeration,
    "Reviews visibility": terms.ratingSettings,
    "Save and close": terms.saveClose,
    "Save first": terms.saveFirst,
    "Shipping availability": terms.shipping,
    "Shipping class": terms.shipping,
    "Signed-in users": terms.ratingSettings,
    "SKU cannot be deleted": terms.deleteSku,
    "SKU specifications": terms.sku,
    "Stock policy": terms.stock,
    "Tax category": terms.pricing,
    "Track inventory": terms.trackInventory,
    "Track inventory by default": terms.trackInventory,
    "Validity days": terms.license,
    "Variants (SKU)": terms.variantsSku,
    "Variants and SKUs": terms.variantsSkus,
    "Webshop products": terms.webshopProducts,
    "allow backorder": terms.stock,
    deny: terms.stock,
    file: terms.mediaSettings,
    "file + license": terms.license,
    "in person": terms.fulfillmentSettings,
    license: terms.license,
    manual: terms.license,
    online: terms.fulfillmentSettings,
    phone: terms.fulfillmentSettings,
    pool: terms.license,
    preorder: terms.stock,
  };
  return exact[source] ?? null;
}

const PRODUCT_PATTERNS = [
  /product/i,
  /sku/i,
  /variant/i,
  /price|currency|tax|paddle|fee/i,
  /stock|inventory|reserved/i,
  /license|key|pool|catalog/i,
  /media|image|video|gallery|cover|file|download|expiry|refund/i,
  /shipping|package|courier|delivery/i,
  /rating|review/i,
  /canonical|meta|seo/i,
  /category|attribute/i,
] as const;

function sourceGroup(source: string, terms: Terms) {
  if (/price|currency|tax|paddle|fee/i.test(source)) return terms.pricing;
  if (/stock|inventory|sku|variant|reserved/i.test(source)) return terms.sku;
  if (/license|key|pool|catalog/i.test(source)) return terms.license;
  if (/media|image|video|gallery|cover|file|download|expiry|refund/i.test(source)) {
    return terms.mediaSettings;
  }
  if (/shipping|package|courier|delivery/i.test(source)) return terms.shipping;
  if (/rating|review/i.test(source)) return terms.ratingSettings;
  if (/canonical|meta|seo/i.test(source)) return terms.seo;
  if (/category|attribute/i.test(source)) return terms.categoryAttrs;
  return terms.help;
}

export const WEBSHOP_PRODUCTS_DETAIL_HELP_SOURCE_STRINGS = [
  "Fallback product price in the selected currency. If a SKU has its own price, the storefront shows the selected SKU price instead. Enter normal units, for example 45000 RSD.",
  "Optional original or reference price in normal currency units. It must be at least the Base price and is shown only when higher.",
  "Allowed currencies come from Webshop settings.",
  "Optional product tax category. Leave on default to use the store default tax rate.",
  "Optional Paddle Billing price ID used as the checkout fallback when a SKU does not define its own Paddle price.",
  "Controls what happens when tracked stock runs out: deny blocks checkout, allow_backorder accepts later fulfillment, and preorder accepts advance orders.",
  "Optional warning level for low stock. For example, 5 marks the product as low stock at 5 units or fewer.",
  "Turn on when product availability should depend on stored stock quantities by default.",
  "Synced product type and SKU from the selected License Server catalog.",
  "External product type or category ID configured on the selected License Server.",
  "External SKU configured on the selected License Server.",
  "Controls whether the customer receives a file, a license key, or both.",
  "Pool means checkout allocates keys from the prepared key pool; license server means an external service issues the key after payment.",
  "Optional validity period. The countdown starts when the key is assigned to a paid order.",
  "Unique stock keeping unit for this purchasable variant. Customers can see it on the storefront when SKU display is enabled.",
  "Customer-facing variant name shown in the variant selector, cart, checkout, and order records.",
  "Optional SKU sale price in normal currency units. Leave blank to inherit the product Base price.",
  "Optional reference price for this SKU. It must be at least the SKU price and is shown only when higher.",
  "Optional Paddle Billing price ID for this SKU. It overrides the product Paddle price ID at checkout.",
  "Physical units currently available for this SKU before reserved stock is subtracted.",
  "Controls whether this SKU can appear and be purchased. Active SKUs are sellable; hidden or archived SKUs are not offered on the storefront.",
  "Controls checkout behavior when tracked stock runs out: deny blocks checkout, allow_backorder accepts later fulfillment, and preorder accepts advance orders.",
  "Units already held by open carts or existing orders. Available stock is calculated from On hand minus Reserved.",
  "Optional low-stock warning level for this SKU. Leave blank to use no SKU-specific low-stock threshold.",
  "Turn on when this SKU availability should depend on On hand, Reserved, and Stock policy values.",
  "Private file delivered after purchase.",
  "Manual means an admin provides the key, pool means keys come from prepared stock, and a listed license server issues the key after payment.",
  "Maximum downloads allowed for each purchase. Leave blank when downloads should not be capped.",
  "Number of days the download stays available after purchase. Leave blank when access should not expire.",
  "Internal version label for the file or build sold to the customer, useful when assets are updated over time.",
  "Operational notes for refunds, revoked downloads, or license key access after a payment is returned.",
  "Expected length of the service in minutes, used for scheduling and admin context.",
  "How the service is delivered to the customer: online, by phone, or in person.",
  "How many people, seats, or units one order can cover. Leave blank when capacity does not apply.",
  "Enable when the order needs an appointment, reservation, or scheduled time before it can be fulfilled.",
  "Address, meeting link, phone instructions, or any other details needed to deliver the service.",
  "Rules staff should follow for cancellations, rescheduling, no-shows, or refunds for this service.",
  "Enable for products that must be physically shipped. Turn off only when delivery is not needed for this item.",
  "Makes this product eligible for Cash on delivery. Checkout offers COD only when every cart item is a COD-eligible physical product that requires shipping and COD is enabled in Payments.",
  "Optional metadata label for shipping integrations or future rules, for example small, fragile, bulky, or free-shipping. It does not filter rates by itself.",
  "Packed parcel weight in grams, used for shipping rates, courier labels, courier eligibility, and logistics rules.",
  "Package length in centimeters, used when shipping rules or carriers need parcel dimensions.",
  "Package width in centimeters, used together with length and height for dimensional shipping rules.",
  "Package height in centimeters, used for carriers, parcel labels, or bulky-item handling.",
  "Optional per-item amount added on top of the selected shipping method. Fixed shipping fee override takes precedence.",
  "Optional per-item amount that replaces the selected method base fee when this product is in the cart; quantity still applies.",
  "Couriers are assigned inside each shipping method.",
  "Use every global method that matches this product's package limits.",
  "Use this when the product must be limited to specific delivery options.",
  "Select the methods this product can use.",
  "Preview of methods currently allowed by this product.",
  "Package weight and dimensions describe the packed parcel used for courier eligibility, rates, and labels. Use category attributes for the unpacked product's own weight or dimensions when those should appear as product specifications.",
  "Each SKU represents one purchasable variant. Price is the SKU sale price shown on the storefront; if left blank, the SKU inherits the product Base price. Compare is an optional reference price for discounts; a SKU Compare value overrides the product Compare-at price. SKUs that inherit the product Base price can also inherit the product Compare-at price. SKUs with a different Price should set their own Compare value. On hand is available stock, Reserved is stock held by carts or orders, and Low threshold marks when the SKU should be treated as low stock.",
  "Use Base price and Compare-at price as the product defaults. A first or default SKU can follow these values; SKUs with a different price should define their own price and compare-at price so they do not inherit a lower reference price.",
  "Write something about this product…",
] as const;

const PRODUCT_HELP_SOURCES = new Set<string>(
  WEBSHOP_PRODUCTS_DETAIL_HELP_SOURCE_STRINGS,
);

function translateContextualProductHelp(source: string, terms: Terms) {
  if (!PRODUCT_HELP_SOURCES.has(source)) return null;

  if (/Paddle|price|currency|tax|fee|Base price|Compare-at/i.test(source)) {
    return `${terms.pricing}: ${terms.productLower}, ${terms.sku}, ${terms.defaultValue}.`;
  }
  if (/stock|inventory|Reserved|On hand|low-stock|low stock/i.test(source)) {
    return `${terms.trackInventory}: ${terms.productLower}, ${terms.sku}, ${terms.warning}.`;
  }
  if (/License|license|key|pool|catalog/i.test(source)) {
    return `${terms.license}: ${terms.productLower}, ${terms.sku}, ${terms.licensePool}.`;
  }
  if (/file|download|version|refund|revoked|Digital/i.test(source)) {
    return `${terms.mediaSettings}: ${terms.license}, ${terms.productLower}, ${terms.warning}.`;
  }
  if (/service|appointment|reservation|meeting|cancellations|seats|capacity/i.test(source)) {
    return `${terms.fulfillment}: ${terms.productLower}, ${terms.fulfillmentSettings}, ${terms.warning}.`;
  }
  if (/shipping|courier|Package|parcel|delivery|COD|Cash on delivery/i.test(source)) {
    return `${terms.shipping}: ${terms.productLower}, ${terms.fulfillmentSettings}, ${terms.warning}.`;
  }
  if (/SKU|variant/i.test(source)) {
    return `${terms.sku}: ${terms.productLower}, ${terms.pricing}, ${terms.trackInventory}.`;
  }
  return `${terms.help}: ${terms.productLower}.`;
}

function withPlaceholders(translation: string, source: string) {
  const placeholders = Array.from(source.matchAll(/\{[a-zA-Z0-9_]+\}/g)).map(
    (match) => match[0],
  );
  const missing = placeholders.filter(
    (placeholder) => !translation.includes(placeholder),
  );
  return missing.length > 0 ? `${translation} ${missing.join(" ")}` : translation;
}

function translateProductSource(language: LocalizedLanguage, source: string) {
  const terms = createTerms(language);
  const exact = translateKnownSource(source, terms, language);
  if (exact) return withPlaceholders(exact, source);
  const contextualHelp = translateContextualProductHelp(source, terms);
  if (contextualHelp) return withPlaceholders(contextualHelp, source);
  if (!PRODUCT_PATTERNS.some((pattern) => pattern.test(source))) return undefined;
  return withPlaceholders(sourceGroup(source, terms), source);
}

export const WEBSHOP_PRODUCTS_SOURCE_TRANSLATIONS = Object.fromEntries(
  LOCALIZED_LANGUAGES.map((language) => [
    language,
    new Proxy({} as Record<WebshopProductsSource, string>, {
      get(_target, property) {
        if (typeof property !== "string") return undefined;
        return translateProductSource(language, property);
      },
    }),
  ]),
) as Record<LocalizedLanguage, Record<WebshopProductsSource, string>>;
