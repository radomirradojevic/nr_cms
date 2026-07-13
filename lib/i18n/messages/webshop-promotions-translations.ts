import type { CmsLanguage } from "@/lib/i18n/languages";
import { BACKEND_WEBSHOP_MENU_SOURCE_TRANSLATIONS } from "@/lib/i18n/messages/backend-menu-translations";

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

export const WEBSHOP_PROMOTIONS_SOURCE_STRINGS = [
  "Actions",
  "Active",
  "Active coupons can be used at checkout. Inactive or archived coupons stay saved but cannot be redeemed.",
  "Active dates",
  "All eligible products",
  "All shops",
  "All statuses",
  "Always",
  "An active Webshop license and at least one Webshop content item are required to create coupons.",
  "An active Webshop license is required.",
  "Choose whether the coupon removes a percentage, a fixed amount, or shipping cost.",
  "Choose which webshop owns this coupon. This is hidden when there is only one shop.",
  "Clear",
  "Close help",
  "Code",
  "Conditions",
  "Coupon",
  "Coupon name",
  "Coupon not found",
  "Coupon status",
  "Coupon was not found.",
  "Coupons",
  "Create a checkout coupon without leaving the promotions list.",
  "Create a coupon to make it available during checkout.",
  "Create coupon",
  "Currency",
  "Currency {currency}",
  "Discount",
  "Discount amount. Percent coupons use 1-100; fixed amount coupons use normal currency units.",
  "Edit",
  "Edit existing only",
  "Edit {code}",
  "Ends",
  "Exclude categories",
  "Exclude products",
  "Filter",
  "Filters",
  "Forbidden.",
  "Free shipping",
  "Help",
  "Include categories",
  "Include products",
  "Internal display name for admins and summaries. Customers primarily use the code.",
  "Invalid product search.",
  "Limit where this coupon can apply. Leave all four lists empty to allow every eligible product. Include rules narrow the coupon to selected products or categories, and exclude rules remove products or categories from that eligible set.",
  "Maximum redemptions allowed for the same signed-in customer or email.",
  "Maximum total number of successful redemptions across all customers.",
  "Min {amount}",
  "Minimum cart subtotal before shipping and tax required before this coupon can be applied.",
  "Minimum subtotal",
  "New coupon",
  "Next",
  "No categories found.",
  "No coupons yet",
  "No end",
  "No excluded categories.",
  "No excluded products.",
  "No included categories.",
  "No included products.",
  "No matching coupons",
  "No minimum",
  "No products found.",
  "Now",
  "Optional",
  "Optional 3-letter currency restriction, such as RSD. Leave empty to allow the cart currency.",
  "Optional date and time when the coupon becomes available.",
  "Optional date and time when the coupon stops being valid.",
  "Page {page} of {pageCount}",
  "Per customer",
  "Previous",
  "Product and category targeting",
  "Promotions",
  "Remove",
  "Rows per page",
  "Save coupon",
  "Schedule and limits",
  "Search categories or subcategories",
  "Search categories to exclude",
  "Search code or name",
  "Search products by title, slug, or UUID",
  "Search products to exclude",
  "Searching products...",
  "Selected",
  "Showing {count} of {total}",
  "Showing {start}-{end} of {total} coupons",
  "Starts",
  "Status",
  "Summer sale",
  "The checkout code customers enter, for example SAVE10. Codes are stored uppercase.",
  "Try changing the search, status, or webshop filter.",
  "Type",
  "Update coupon settings and return to the current list view.",
  "Usage",
  "Usage limit",
  "Use this to block exact products from receiving the coupon. Product exclusions win even if the product is covered by an included category.",
  "Use this to block products in selected categories from receiving the coupon. Category exclusions win over included products or categories.",
  "Use this to make products in selected categories eligible. A selected parent category also covers products assigned to its child categories.",
  "Use this when only specific products should get the coupon. Search for a product, then add it to make that product eligible.",
  "Value",
  "Webshop",
  "{count} / page",
  "{count} coupon",
  "{count} coupons",
  "{count} exclusion",
  "{count} exclusions",
  "{count} include rule",
  "{count} include rules",
  "{count} per customer",
  "{count} products",
  "{item} is already selected in {label}.",
  "active",
  "archived",
  "digital",
  "draft",
  "fixed amount",
  "free shipping",
  "inactive",
  "paused",
  "percent",
  "physical",
  "service",
] as const;

type WebshopPromotionsSource =
  (typeof WEBSHOP_PROMOTIONS_SOURCE_STRINGS)[number];

const TERM_KEYS = [
  "actions",
  "active",
  "activeDates",
  "activeLower",
  "add",
  "added",
  "allEligibleProducts",
  "allShops",
  "allStatuses",
  "always",
  "archived",
  "clear",
  "closeHelp",
  "code",
  "conditions",
  "coupon",
  "couponLower",
  "couponName",
  "couponNotFound",
  "couponStatus",
  "couponWasNotFound",
  "coupons",
  "couponsLower",
  "createCoupon",
  "currency",
  "digital",
  "discount",
  "draft",
  "edit",
  "editExistingOnly",
  "ends",
  "excludeCategories",
  "excludeProducts",
  "exclusion",
  "exclusions",
  "filter",
  "filters",
  "fixedAmount",
  "freeShipping",
  "help",
  "inactive",
  "includeCategories",
  "includeProducts",
  "includeRule",
  "includeRules",
  "invalidProductSearch",
  "licenseRequiredShort",
  "min",
  "minimumSubtotal",
  "newCoupon",
  "next",
  "noCategoriesFound",
  "noCouponsYet",
  "noEnd",
  "noExcludedCategories",
  "noExcludedProducts",
  "noIncludedCategories",
  "noIncludedProducts",
  "noMatchingCoupons",
  "noMinimum",
  "noProductsFound",
  "now",
  "of",
  "optional",
  "page",
  "pageLower",
  "paused",
  "percent",
  "perCustomer",
  "perCustomerLower",
  "physical",
  "previous",
  "product",
  "productCategoryTargeting",
  "productSearchLoading",
  "products",
  "productsLower",
  "promotions",
  "remove",
  "rowsPerPage",
  "saveCoupon",
  "scheduleLimits",
  "searchCategories",
  "searchCategoriesExclude",
  "searchCodeOrName",
  "searchProducts",
  "searchProductsExclude",
  "selected",
  "service",
  "showing",
  "starts",
  "status",
  "summerSale",
  "type",
  "usage",
  "usageLimit",
  "value",
  "webshop",
  "forbidden",
  "genericCheckoutHelp",
  "genericCouponHelp",
  "genericDateHelp",
  "genericFieldHelp",
  "genericLicenseHelp",
  "genericLimitHelp",
  "genericSearchHelp",
  "genericTargetingHelp",
  "alreadySelectedIn",
] as const;

type TermKey = (typeof TERM_KEYS)[number];
type PromotionTerms = Record<TermKey, string>;

const TERM_ROWS = {
  "sr-Latn":
    "Akcije|Aktivno|Aktivni datumi|aktivno|Dodaj|Dodato|Svi podobni proizvodi|Sve prodavnice|Sva stanja|Uvek|arhivirano|Očisti|Zatvori pomoć|Kod|Uslovi|Kupon|kupon|Naziv kupona|Kupon nije pronađen|Stanje kupona|Kupon nije pronađen.|Kuponi|kupona|Kreiraj kupon|Valuta|digitalno|Popust|nacrt|Izmeni|Samo izmena postojećih|Završava se|Isključi kategorije|Isključi proizvode|isključenje|isključenja|Filtriraj|Filteri|fiksni iznos|besplatna dostava|Pomoć|neaktivno|Uključi kategorije|Uključi proizvode|pravilo uključivanja|pravila uključivanja|Neispravna pretraga proizvoda.|Potrebna je aktivna Webshop licenca.|Min.|Minimalni međuzbir|Novi kupon|Sledeće|Kategorije nisu pronađene.|Još nema kupona|Bez kraja|Nema isključenih kategorija.|Nema isključenih proizvoda.|Nema uključenih kategorija.|Nema uključenih proizvoda.|Nema odgovarajućih kupona|Bez minimuma|Proizvodi nisu pronađeni.|Sada|od|Opcionalno|Strana|strani|pauzirano|procenat|Po kupcu|po kupcu|fizičko|Prethodno|Proizvod|Ciljanje proizvoda i kategorija|Pretraga proizvoda...|Proizvodi|proizvoda|Promocije|Ukloni|Redova po strani|Sačuvaj kupon|Raspored i limiti|Pretraži kategorije ili potkategorije|Pretraži kategorije za isključivanje|Pretraži kod ili naziv|Pretraži proizvode po naslovu, slugu ili UUID-u|Pretraži proizvode za isključivanje|Izabrano|usluga|Prikazano|Počinje|Stanje|Letnja akcija|Tip|Korišćenje|Limit korišćenja|Vrednost|Webshop|Zabranjeno.|Kuponi se koriste u naplati; neaktivni ili arhivirani kuponi ostaju sačuvani ali se ne mogu iskoristiti.|Podese kupon, popust, valutu i pravila za naplatu.|Izaberi opcioni datum i vreme važenja kupona.|Popuni i proveri ovo polje za kupon.|Za kreiranje kupona potrebna je aktivna Webshop licenca i bar jedan Webshop sadržaj.|Podesi ukupna i korisnička ograničenja korišćenja.|Promeni pretragu, stanje ili filter prodavnice.|Ograniči podobne proizvode i kategorije za ovaj kupon.|{item} je već izabrano u {label}.",
  "sr-Cyrl":
    "Акције|Активно|Активни датуми|активно|Додај|Додато|Сви подобни производи|Све продавнице|Сва стања|Увек|архивирано|Очисти|Затвори помоћ|Код|Услови|Купон|купон|Назив купона|Купон није пронађен|Стање купона|Купон није пронађен.|Купони|купона|Креирај купон|Валута|дигитално|Попуст|нацрт|Измени|Само измена постојећих|Завршава се|Искључи категорије|Искључи производе|искључење|искључења|Филтрирај|Филтери|фиксни износ|бесплатна достава|Помоћ|неактивно|Укључи категорије|Укључи производе|правило укључивања|правила укључивања|Неисправна претрага производа.|Потребна је активна Webshop лиценца.|Мин.|Минимални међузбир|Нови купон|Следеће|Категорије нису пронађене.|Још нема купона|Без краја|Нема искључених категорија.|Нема искључених производа.|Нема укључених категорија.|Нема укључених производа.|Нема одговарајућих купона|Без минимума|Производи нису пронађени.|Сада|од|Опционо|Страна|страни|паузирано|проценат|По купцу|по купцу|физичко|Претходно|Производ|Циљање производа и категорија|Претрага производа...|Производи|производа|Промоције|Уклони|Редова по страни|Сачувај купон|Распоред и лимити|Претражи категорије или поткатегорије|Претражи категорије за искључивање|Претражи код или назив|Претражи производе по наслову, slug-у или UUID-у|Претражи производе за искључивање|Изабрано|услуга|Приказано|Почиње|Стање|Летња акција|Тип|Коришћење|Лимит коришћења|Вредност|Webshop|Забрањено.|Купони се користе у наплати; неактивни или архивирани купони остају сачувани али се не могу искористити.|Подеси купон, попуст, валуту и правила за наплату.|Изабери опциони датум и време важења купона.|Попуни и провери ово поље за купон.|За креирање купона потребна је активна Webshop лиценца и бар један Webshop садржај.|Подеси укупна и корисничка ограничења коришћења.|Промени претрагу, стање или филтер продавнице.|Ограничи подобне производе и категорије за овај купон.|{item} је већ изабрано у {label}.",
  hr: "Radnje|Aktivno|Aktivni datumi|aktivno|Dodaj|Dodano|Svi prihvatljivi proizvodi|Sve trgovine|Sva stanja|Uvijek|arhivirano|Očisti|Zatvori pomoć|Kod|Uvjeti|Kupon|kupon|Naziv kupona|Kupon nije pronađen|Stanje kupona|Kupon nije pronađen.|Kuponi|kupona|Stvori kupon|Valuta|digitalno|Popust|skica|Uredi|Samo uređivanje postojećih|Završava|Isključi kategorije|Isključi proizvode|isključenje|isključenja|Filtriraj|Filtri|fiksni iznos|besplatna dostava|Pomoć|neaktivno|Uključi kategorije|Uključi proizvode|pravilo uključivanja|pravila uključivanja|Neispravna pretraga proizvoda.|Potrebna je aktivna Webshop licenca.|Min.|Minimalni međuzbroj|Novi kupon|Sljedeće|Kategorije nisu pronađene.|Još nema kupona|Bez kraja|Nema isključenih kategorija.|Nema isključenih proizvoda.|Nema uključenih kategorija.|Nema uključenih proizvoda.|Nema odgovarajućih kupona|Bez minimuma|Proizvodi nisu pronađeni.|Sada|od|Neobavezno|Stranica|stranici|pauzirano|postotak|Po kupcu|po kupcu|fizičko|Prethodno|Proizvod|Ciljanje proizvoda i kategorija|Pretraživanje proizvoda...|Proizvodi|proizvoda|Promocije|Ukloni|Redaka po stranici|Spremi kupon|Raspored i ograničenja|Pretraži kategorije ili podkategorije|Pretraži kategorije za isključivanje|Pretraži kod ili naziv|Pretraži proizvode po naslovu, slugu ili UUID-u|Pretraži proizvode za isključivanje|Odabrano|usluga|Prikazano|Počinje|Stanje|Ljetna akcija|Vrsta|Korištenje|Ograničenje korištenja|Vrijednost|Web-trgovina|Zabranjeno.|Kuponi se koriste pri naplati; neaktivni ili arhivirani kuponi ostaju spremljeni, ali se ne mogu iskoristiti.|Postavi kupon, popust, valutu i pravila naplate.|Odaberi neobavezan datum i vrijeme valjanosti kupona.|Ispuni i provjeri ovo polje kupona.|Za stvaranje kupona potrebna je aktivna Webshop licenca i barem jedna Webshop stavka sadržaja.|Postavi ukupna i korisnička ograničenja korištenja.|Promijeni pretragu, stanje ili filter trgovine.|Ograniči prihvatljive proizvode i kategorije za ovaj kupon.|{item} je već odabrano u {label}.",
  de: "Aktionen|Aktiv|Aktive Daten|aktiv|Hinzufügen|Hinzugefügt|Alle berechtigten Produkte|Alle Shops|Alle Zustände|Immer|archiviert|Leeren|Hilfe schließen|Gutscheincode|Bedingungen|Gutschein|Gutschein|Gutscheinname|Gutschein nicht gefunden|Gutscheinstatus|Gutschein wurde nicht gefunden.|Gutscheine|Gutscheine|Gutschein erstellen|Währung|digital|Rabatt|Entwurf|Bearbeiten|Nur bestehende bearbeiten|Endet|Kategorien ausschließen|Produkte ausschließen|Ausschluss|Ausschlüsse|Filtern|Filter|fester Betrag|kostenloser Versand|Hilfe|inaktiv|Kategorien einschließen|Produkte einschließen|Einschlussregel|Einschlussregeln|Ungültige Produktsuche.|Eine aktive Webshop-Lizenz ist erforderlich.|Mind.|Mindestzwischensumme|Neuer Gutschein|Weiter|Keine Kategorien gefunden.|Noch keine Gutscheine|Kein Ende|Keine ausgeschlossenen Kategorien.|Keine ausgeschlossenen Produkte.|Keine eingeschlossenen Kategorien.|Keine eingeschlossenen Produkte.|Keine passenden Gutscheine|Kein Minimum|Keine Produkte gefunden.|Jetzt|von|Optionales Feld|Seite|Seite|pausiert|Prozent|Pro Kunde|pro Kunde|physisch|Zurück|Produkt|Produkt- und Kategorie-Targeting|Produktsuche...|Produkte|Produkte|Aktionen|Entfernen|Zeilen pro Seite|Gutschein speichern|Zeitplan und Limits|Kategorien oder Unterkategorien suchen|Kategorien zum Ausschließen suchen|Code oder Name suchen|Produkte nach Titel, Slug oder UUID suchen|Produkte zum Ausschließen suchen|Ausgewählt|Service|Zeige|Beginnt|Zustand|Sommeraktion|Typ|Nutzung|Nutzungslimit|Wert|Webshop|Verboten.|Gutscheine werden im Checkout verwendet; inaktive oder archivierte Gutscheine bleiben gespeichert, können aber nicht eingelöst werden.|Gutschein, Rabatt, Währung und Checkout-Regeln konfigurieren.|Optionales Datum und Uhrzeit für die Gültigkeit des Gutscheins wählen.|Dieses Gutscheinfeld ausfüllen und prüfen.|Zum Erstellen von Gutscheinen sind eine aktive Webshop-Lizenz und mindestens ein Webshop-Inhaltselement erforderlich.|Gesamt- und Kundenlimits für die Nutzung konfigurieren.|Suche, Status oder Shop-Filter ändern.|Berechtigte Produkte und Kategorien für diesen Gutschein begrenzen.|{item} ist bereits in {label} ausgewählt.",
  fr: "Opérations|Actif|Dates actives|actif|Ajouter|Ajouté|Tous les produits éligibles|Toutes les boutiques|Tous les statuts|Toujours|archivé|Effacer|Fermer l'aide|Code coupon|Conditions|Coupon|coupon|Nom du coupon|Coupon introuvable|Statut du coupon|Coupon introuvable.|Coupons|coupons|Créer le coupon|Devise|numérique|Remise|brouillon|Modifier|Modifier l'existant uniquement|Se termine|Exclure des catégories|Exclure des produits|exclusion|exclusions|Filtrer|Filtres|montant fixe|livraison gratuite|Aide|inactif|Inclure des catégories|Inclure des produits|règle d'inclusion|règles d'inclusion|Recherche de produit invalide.|Une licence Webshop active est requise.|Min.|Sous-total minimal|Nouveau coupon|Suivant|Aucune catégorie trouvée.|Aucun coupon pour l'instant|Sans fin|Aucune catégorie exclue.|Aucun produit exclu.|Aucune catégorie incluse.|Aucun produit inclus.|Aucun coupon correspondant|Aucun minimum|Aucun produit trouvé.|Maintenant|sur|Facultatif|Page|page|en pause|pourcentage|Par client|par client|physique|Précédent|Produit|Ciblage des produits et catégories|Recherche de produits...|Produits|produits|Offres promo|Retirer|Lignes par page|Enregistrer le coupon|Planning et limites|Rechercher des catégories ou sous-catégories|Rechercher des catégories à exclure|Rechercher un code ou un nom|Rechercher des produits par titre, slug ou UUID|Rechercher des produits à exclure|Sélectionné|service|Affichage|Commence|Statut|Soldes d'été|Type|Utilisation|Limite d'utilisation|Valeur|Boutique|Interdit.|Les coupons s'utilisent au paiement; les coupons inactifs ou archivés restent enregistrés mais ne peuvent pas être utilisés.|Configurer le coupon, la remise, la devise et les règles de paiement.|Choisir une date et une heure facultatives de validité du coupon.|Renseigner et vérifier ce champ du coupon.|Une licence Webshop active et au moins un contenu Webshop sont requis pour créer des coupons.|Configurer les limites totales et par client.|Modifier la recherche, le statut ou le filtre de boutique.|Limiter les produits et catégories éligibles à ce coupon.|{item} est déjà sélectionné dans {label}.",
  es: "Acciones|Activo|Fechas activas|activo|Añadir|Añadido|Todos los productos elegibles|Todas las tiendas|Todos los estados|Siempre|archivado|Limpiar|Cerrar ayuda|Código de cupón|Condiciones|Cupón|cupón|Nombre del cupón|Cupón no encontrado|Estado del cupón|No se encontró el cupón.|Cupones|cupones|Crear cupón|Moneda|digital|Descuento|borrador|Editar|Editar solo existentes|Termina|Excluir categorías|Excluir productos|exclusión|exclusiones|Filtrar|Filtros|importe fijo|envío gratis|Ayuda|inactivo|Incluir categorías|Incluir productos|regla de inclusión|reglas de inclusión|Búsqueda de producto no válida.|Se requiere una licencia Webshop activa.|Mín.|Subtotal mínimo|Nuevo cupón|Siguiente|No se encontraron categorías.|Todavía no hay cupones|Sin fin|No hay categorías excluidas.|No hay productos excluidos.|No hay categorías incluidas.|No hay productos incluidos.|No hay cupones coincidentes|Sin mínimo|No se encontraron productos.|Ahora|de|Opcional|Página|página|pausado|porcentaje|Por cliente|por cliente|físico|Anterior|Producto|Segmentación de productos y categorías|Buscando productos...|Productos|productos|Promociones|Quitar|Filas por página|Guardar cupón|Programación y límites|Buscar categorías o subcategorías|Buscar categorías para excluir|Buscar código o nombre|Buscar productos por título, slug o UUID|Buscar productos para excluir|Seleccionado|servicio|Mostrando|Empieza|Estado|Oferta de verano|Tipo|Uso|Límite de uso|Valor|Webshop|Prohibido.|Los cupones se usan en el pago; los cupones inactivos o archivados quedan guardados pero no pueden canjearse.|Configura el cupón, descuento, moneda y reglas de pago.|Elige una fecha y hora opcionales de validez del cupón.|Completa y revisa este campo del cupón.|Se requiere una licencia Webshop activa y al menos un contenido Webshop para crear cupones.|Configura límites totales y por cliente.|Cambia la búsqueda, el estado o el filtro de tienda.|Limita los productos y categorías elegibles para este cupón.|{item} ya está seleccionado en {label}.",
  it: "Azioni|Attivo|Date attive|attivo|Aggiungi|Aggiunto|Tutti i prodotti idonei|Tutti i negozi|Tutti gli stati|Sempre|archiviato|Cancella|Chiudi guida|Codice coupon|Condizioni|Coupon|coupon|Nome coupon|Coupon non trovato|Stato coupon|Coupon non trovato.|Coupon|coupon|Crea coupon|Valuta|digitale|Sconto|bozza|Modifica|Modifica solo esistenti|Termina|Escludi categorie|Escludi prodotti|esclusione|esclusioni|Filtra|Filtri|importo fisso|spedizione gratuita|Guida|inattivo|Includi categorie|Includi prodotti|regola di inclusione|regole di inclusione|Ricerca prodotto non valida.|È richiesta una licenza Webshop attiva.|Min.|Subtotale minimo|Nuovo coupon|Successivo|Nessuna categoria trovata.|Ancora nessun coupon|Nessuna fine|Nessuna categoria esclusa.|Nessun prodotto escluso.|Nessuna categoria inclusa.|Nessun prodotto incluso.|Nessun coupon corrispondente|Nessun minimo|Nessun prodotto trovato.|Ora|di|Facoltativo|Pagina|pagina|in pausa|percentuale|Per cliente|per cliente|fisico|Precedente|Prodotto|Targeting prodotti e categorie|Ricerca prodotti...|Prodotti|prodotti|Promozioni|Rimuovi|Righe per pagina|Salva coupon|Pianificazione e limiti|Cerca categorie o sottocategorie|Cerca categorie da escludere|Cerca codice o nome|Cerca prodotti per titolo, slug o UUID|Cerca prodotti da escludere|Selezionato|servizio|Mostrati|Inizia|Stato|Saldi estivi|Tipo|Uso|Limite di utilizzo|Valore|Webshop|Vietato.|I coupon si usano al checkout; i coupon inattivi o archiviati restano salvati ma non possono essere riscattati.|Configura coupon, sconto, valuta e regole di checkout.|Scegli data e ora facoltative di validità del coupon.|Compila e verifica questo campo del coupon.|Per creare coupon servono una licenza Webshop attiva e almeno un contenuto Webshop.|Configura limiti totali e per cliente.|Cambia ricerca, stato o filtro negozio.|Limita prodotti e categorie idonei per questo coupon.|{item} è già selezionato in {label}.",
  pt: "Ações|Ativo|Datas ativas|ativo|Adicionar|Adicionado|Todos os produtos elegíveis|Todas as lojas|Todos os estados|Sempre|arquivado|Limpar|Fechar ajuda|Código do cupão|Condições|Cupão|cupão|Nome do cupão|Cupão não encontrado|Estado do cupão|Cupão não encontrado.|Cupões|cupões|Criar cupão|Moeda|digital|Desconto|rascunho|Editar|Editar apenas existentes|Termina|Excluir categorias|Excluir produtos|exclusão|exclusões|Filtrar|Filtros|montante fixo|envio grátis|Ajuda|inativo|Incluir categorias|Incluir produtos|regra de inclusão|regras de inclusão|Pesquisa de produto inválida.|É necessária uma licença Webshop ativa.|Mín.|Subtotal mínimo|Novo cupão|Seguinte|Nenhuma categoria encontrada.|Ainda não há cupões|Sem fim|Nenhuma categoria excluída.|Nenhum produto excluído.|Nenhuma categoria incluída.|Nenhum produto incluído.|Nenhum cupão correspondente|Sem mínimo|Nenhum produto encontrado.|Agora|de|Opcional|Página|página|em pausa|percentagem|Por cliente|por cliente|físico|Anterior|Produto|Segmentação de produtos e categorias|A pesquisar produtos...|Produtos|produtos|Promoções|Remover|Linhas por página|Guardar cupão|Agenda e limites|Pesquisar categorias ou subcategorias|Pesquisar categorias a excluir|Pesquisar código ou nome|Pesquisar produtos por título, slug ou UUID|Pesquisar produtos a excluir|Selecionado|serviço|A mostrar|Começa|Estado|Promoção de verão|Tipo|Utilização|Limite de utilização|Valor|Webshop|Proibido.|Os cupões são usados no checkout; cupões inativos ou arquivados ficam guardados mas não podem ser resgatados.|Configura o cupão, desconto, moeda e regras de checkout.|Escolhe data e hora opcionais de validade do cupão.|Preenche e verifica este campo do cupão.|Para criar cupões é necessária uma licença Webshop ativa e pelo menos um conteúdo Webshop.|Configura limites totais e por cliente.|Altera a pesquisa, estado ou filtro da loja.|Limita produtos e categorias elegíveis para este cupão.|{item} já está selecionado em {label}.",
  "pt-BR":
    "Ações|Ativo|Datas ativas|ativo|Adicionar|Adicionado|Todos os produtos elegíveis|Todas as lojas|Todos os status|Sempre|arquivado|Limpar|Fechar ajuda|Código do cupom|Condições|Cupom|cupom|Nome do cupom|Cupom não encontrado|Status do cupom|Cupom não encontrado.|Cupons|cupons|Criar cupom|Moeda|digital|Desconto|rascunho|Editar|Editar apenas existentes|Termina|Excluir categorias|Excluir produtos|exclusão|exclusões|Filtrar|Filtros|valor fixo|frete grátis|Ajuda|inativo|Incluir categorias|Incluir produtos|regra de inclusão|regras de inclusão|Pesquisa de produto inválida.|É necessária uma licença Webshop ativa.|Mín.|Subtotal mínimo|Novo cupom|Próximo|Nenhuma categoria encontrada.|Ainda não há cupons|Sem fim|Nenhuma categoria excluída.|Nenhum produto excluído.|Nenhuma categoria incluída.|Nenhum produto incluído.|Nenhum cupom correspondente|Sem mínimo|Nenhum produto encontrado.|Agora|de|Opcional|Página|página|pausado|percentual|Por cliente|por cliente|físico|Anterior|Produto|Segmentação de produtos e categorias|Pesquisando produtos...|Produtos|produtos|Promoções|Remover|Linhas por página|Salvar cupom|Agenda e limites|Pesquisar categorias ou subcategorias|Pesquisar categorias para excluir|Pesquisar código ou nome|Pesquisar produtos por título, slug ou UUID|Pesquisar produtos para excluir|Selecionado|serviço|Mostrando|Começa|Status|Promoção de verão|Tipo|Uso|Limite de uso|Valor|Webshop|Proibido.|Cupons são usados no checkout; cupons inativos ou arquivados ficam salvos, mas não podem ser resgatados.|Configure o cupom, desconto, moeda e regras de checkout.|Escolha data e hora opcionais de validade do cupom.|Preencha e confira este campo do cupom.|Para criar cupons é necessária uma licença Webshop ativa e pelo menos um conteúdo Webshop.|Configure limites totais e por cliente.|Altere a busca, status ou filtro da loja.|Limite produtos e categorias elegíveis para este cupom.|{item} já está selecionado em {label}.",
  nl: "Acties|Actief|Actieve datums|actief|Toevoegen|Toegevoegd|Alle geschikte producten|Alle winkels|Alle statussen|Altijd|gearchiveerd|Wissen|Help sluiten|Couponcode|Voorwaarden|Coupon|coupon|Couponnaam|Coupon niet gevonden|Couponstatus|Coupon is niet gevonden.|Coupons|coupons|Coupon maken|Valuta|digitaal|Korting|concept|Bewerken|Alleen bestaande bewerken|Eindigt|Categorieën uitsluiten|Producten uitsluiten|uitsluiting|uitsluitingen|Filteren|Filters|vast bedrag|gratis verzending|Help|inactief|Categorieën opnemen|Producten opnemen|opnameregel|opnameregels|Ongeldige productzoekopdracht.|Een actieve Webshop-licentie is vereist.|Min.|Minimum subtotaal|Nieuwe coupon|Volgende|Geen categorieën gevonden.|Nog geen coupons|Geen einde|Geen uitgesloten categorieën.|Geen uitgesloten producten.|Geen opgenomen categorieën.|Geen opgenomen producten.|Geen overeenkomende coupons|Geen minimum|Geen producten gevonden.|Nu|van|Optioneel veld|Pagina|pagina|gepauzeerd|percentage|Per klant|per klant|fysiek|Vorige|Product|Product- en categorietargeting|Producten zoeken...|Producten|producten|Acties|Verwijderen|Rijen per pagina|Coupon opslaan|Planning en limieten|Categorieën of subcategorieën zoeken|Categorieën zoeken om uit te sluiten|Code of naam zoeken|Producten zoeken op titel, slug of UUID|Producten zoeken om uit te sluiten|Geselecteerd|service|Weergegeven|Begint|Toestand|Zomeractie|Type|Gebruik|Gebruikslimiet|Waarde|Webshop|Verboden.|Coupons worden gebruikt bij afrekenen; inactieve of gearchiveerde coupons blijven opgeslagen maar kunnen niet worden ingewisseld.|Configureer coupon, korting, valuta en afrekenregels.|Kies optioneel datum en tijd voor geldigheid van de coupon.|Vul dit couponveld in en controleer het.|Voor coupons is een actieve Webshop-licentie en minimaal één Webshop-contentitem vereist.|Configureer totale en klantlimieten voor gebruik.|Wijzig zoekopdracht, status of winkelfilter.|Beperk geschikte producten en categorieën voor deze coupon.|{item} is al geselecteerd in {label}.",
  pl: "Akcje|Aktywny|Aktywne daty|aktywny|Dodaj|Dodano|Wszystkie kwalifikujące się produkty|Wszystkie sklepy|Wszystkie statusy|Zawsze|zarchiwizowany|Wyczyść|Zamknij pomoc|Kod kuponu|Warunki|Kupon|kupon|Nazwa kuponu|Nie znaleziono kuponu|Status kuponu|Nie znaleziono kuponu.|Kupony|kupony|Utwórz kupon|Waluta|cyfrowy|Rabat|szkic|Edytuj|Edytuj tylko istniejące|Kończy się|Wyklucz kategorie|Wyklucz produkty|wykluczenie|wykluczenia|Filtruj|Filtry|stała kwota|darmowa wysyłka|Pomoc|nieaktywny|Uwzględnij kategorie|Uwzględnij produkty|reguła uwzględnienia|reguły uwzględnienia|Nieprawidłowe wyszukiwanie produktu.|Wymagana jest aktywna licencja Webshop.|Min.|Minimalna suma częściowa|Nowy kupon|Następna|Nie znaleziono kategorii.|Brak kuponów|Bez końca|Brak wykluczonych kategorii.|Brak wykluczonych produktów.|Brak uwzględnionych kategorii.|Brak uwzględnionych produktów.|Brak pasujących kuponów|Bez minimum|Nie znaleziono produktów.|Teraz|z|Opcjonalne|Strona|stronie|wstrzymany|procent|Na klienta|na klienta|fizyczny|Poprzednia|Produkt|Kierowanie produktów i kategorii|Wyszukiwanie produktów...|Produkty|produktów|Promocje|Usuń|Wiersze na stronę|Zapisz kupon|Harmonogram i limity|Szukaj kategorii lub podkategorii|Szukaj kategorii do wykluczenia|Szukaj kodu lub nazwy|Szukaj produktów po tytule, slugu lub UUID|Szukaj produktów do wykluczenia|Wybrane|usługa|Pokazano|Zaczyna się|Stan|Letnia promocja|Typ|Użycie|Limit użycia|Wartość|Webshop|Zabronione.|Kupony są używane przy kasie; nieaktywne lub zarchiwizowane kupony pozostają zapisane, ale nie można ich wykorzystać.|Skonfiguruj kupon, rabat, walutę i reguły kasy.|Wybierz opcjonalną datę i godzinę ważności kuponu.|Wypełnij i sprawdź to pole kuponu.|Do tworzenia kuponów wymagana jest aktywna licencja Webshop i co najmniej jeden element treści Webshop.|Skonfiguruj limity łączne i na klienta.|Zmień wyszukiwanie, status lub filtr sklepu.|Ogranicz kwalifikujące się produkty i kategorie dla tego kuponu.|{item} jest już wybrane w {label}.",
  tr: "İşlemler|Aktif|Aktif tarihler|aktif|Ekle|Eklendi|Tüm uygun ürünler|Tüm mağazalar|Tüm durumlar|Her zaman|arşivlendi|Temizle|Yardımı kapat|Kupon kodu|Koşullar|Kupon|kupon|Kupon adı|Kupon bulunamadı|Kupon durumu|Kupon bulunamadı.|Kuponlar|kupon|Kupon oluştur|Para birimi|dijital|İndirim|taslak|Düzenle|Yalnızca mevcutları düzenle|Biter|Kategorileri hariç tut|Ürünleri hariç tut|hariç tutma|hariç tutmalar|Filtrele|Filtreler|sabit tutar|ücretsiz kargo|Yardım|pasif|Kategorileri dahil et|Ürünleri dahil et|dahil etme kuralı|dahil etme kuralları|Geçersiz ürün araması.|Aktif bir Webshop lisansı gereklidir.|Min.|Minimum ara toplam|Yeni kupon|Sonraki|Kategori bulunamadı.|Henüz kupon yok|Bitiş yok|Hariç tutulan kategori yok.|Hariç tutulan ürün yok.|Dahil edilen kategori yok.|Dahil edilen ürün yok.|Eşleşen kupon yok|Minimum yok|Ürün bulunamadı.|Şimdi|/|İsteğe bağlı|Sayfa|sayfa|duraklatıldı|yüzde|Müşteri başına|müşteri başına|fiziksel|Önceki|Ürün|Ürün ve kategori hedefleme|Ürünler aranıyor...|Ürünler|ürün|Promosyonlar|Kaldır|Sayfa başına satır|Kuponu kaydet|Zamanlama ve limitler|Kategori veya alt kategori ara|Hariç tutulacak kategorileri ara|Kod veya ad ara|Ürünleri başlık, slug veya UUID ile ara|Hariç tutulacak ürünleri ara|Seçili|hizmet|Gösteriliyor|Başlar|Durum|Yaz indirimi|Tür|Kullanım|Kullanım limiti|Değer|Webshop|Yasak.|Kuponlar ödeme sırasında kullanılır; pasif veya arşivlenmiş kuponlar kayıtlı kalır ancak kullanılamaz.|Kuponu, indirimi, para birimini ve ödeme kurallarını yapılandır.|Kupon geçerliliği için isteğe bağlı tarih ve saat seç.|Bu kupon alanını doldur ve kontrol et.|Kupon oluşturmak için aktif Webshop lisansı ve en az bir Webshop içerik öğesi gerekir.|Toplam ve müşteri başına kullanım limitlerini yapılandır.|Aramayı, durumu veya mağaza filtresini değiştir.|Bu kupon için uygun ürünleri ve kategorileri sınırla.|{item}, {label} içinde zaten seçili.",
  mk: "Акции|Активно|Активни датуми|активно|Додај|Додадено|Сите подобни производи|Сите продавници|Сите статуси|Секогаш|архивирано|Исчисти|Затвори помош|Код на купон|Услови|Купон|купон|Име на купон|Купонот не е пронајден|Статус на купон|Купонот не е пронајден.|Купони|купони|Креирај купон|Валута|дигитално|Попуст|нацрт|Уреди|Уреди само постојни|Завршува|Исклучи категории|Исклучи производи|исклучување|исклучувања|Филтрирај|Филтри|фиксна сума|бесплатна достава|Помош|неактивно|Вклучи категории|Вклучи производи|правило за вклучување|правила за вклучување|Невалидно пребарување производ.|Потребна е активна Webshop лиценца.|Мин.|Минимален меѓузбир|Нов купон|Следно|Не се пронајдени категории.|Сè уште нема купони|Без крај|Нема исклучени категории.|Нема исклучени производи.|Нема вклучени категории.|Нема вклучени производи.|Нема соодветни купони|Без минимум|Не се пронајдени производи.|Сега|од|Опционално|Страница|страница|паузирано|процент|По купувач|по купувач|физичко|Претходно|Производ|Целување производи и категории|Се пребаруваат производи...|Производи|производи|Промоции|Отстрани|Редови по страница|Зачувај купон|Распоред и лимити|Пребарај категории или подкатегории|Пребарај категории за исклучување|Пребарај код или име|Пребарај производи по наслов, slug или UUID|Пребарај производи за исклучување|Избрано|услуга|Прикажано|Почнува|Статус|Летна акција|Тип|Користење|Лимит на користење|Вредност|Webshop|Забрането.|Купоните се користат при наплата; неактивните или архивираните купони остануваат зачувани, но не можат да се искористат.|Подеси купон, попуст, валута и правила за наплата.|Избери опционален датум и време на важност на купонот.|Пополни и провери го ова поле за купон.|За креирање купони е потребна активна Webshop лиценца и барем една Webshop содржина.|Подеси вкупни и кориснички лимити за користење.|Промени пребарување, статус или филтер на продавница.|Ограничи подобни производи и категории за овој купон.|{item} е веќе избрано во {label}.",
  bs: "Akcije|Aktivno|Aktivni datumi|aktivno|Dodaj|Dodano|Svi podobni proizvodi|Sve prodavnice|Sva stanja|Uvijek|arhivirano|Očisti|Zatvori pomoć|Kod|Uslovi|Kupon|kupon|Naziv kupona|Kupon nije pronađen|Stanje kupona|Kupon nije pronađen.|Kuponi|kupona|Kreiraj kupon|Valuta|digitalno|Popust|nacrt|Uredi|Samo uređivanje postojećih|Završava|Isključi kategorije|Isključi proizvode|isključenje|isključenja|Filtriraj|Filteri|fiksni iznos|besplatna dostava|Pomoć|neaktivno|Uključi kategorije|Uključi proizvode|pravilo uključivanja|pravila uključivanja|Neispravna pretraga proizvoda.|Potrebna je aktivna Webshop licenca.|Min.|Minimalni međuzbir|Novi kupon|Sljedeće|Kategorije nisu pronađene.|Još nema kupona|Bez kraja|Nema isključenih kategorija.|Nema isključenih proizvoda.|Nema uključenih kategorija.|Nema uključenih proizvoda.|Nema odgovarajućih kupona|Bez minimuma|Proizvodi nisu pronađeni.|Sada|od|Opcionalno|Stranica|stranici|pauzirano|procenat|Po kupcu|po kupcu|fizičko|Prethodno|Proizvod|Ciljanje proizvoda i kategorija|Pretraga proizvoda...|Proizvodi|proizvoda|Promocije|Ukloni|Redova po stranici|Sačuvaj kupon|Raspored i limiti|Pretraži kategorije ili podkategorije|Pretraži kategorije za isključivanje|Pretraži kod ili naziv|Pretraži proizvode po naslovu, slugu ili UUID-u|Pretraži proizvode za isključivanje|Izabrano|usluga|Prikazano|Počinje|Stanje|Ljetna akcija|Tip|Korištenje|Limit korištenja|Vrijednost|Webshop|Zabranjeno.|Kuponi se koriste pri naplati; neaktivni ili arhivirani kuponi ostaju sačuvani, ali se ne mogu iskoristiti.|Podesi kupon, popust, valutu i pravila naplate.|Izaberi opcionalni datum i vrijeme važenja kupona.|Popuni i provjeri ovo polje kupona.|Za kreiranje kupona potrebna je aktivna Webshop licenca i bar jedan Webshop sadržaj.|Podesi ukupna i korisnička ograničenja korištenja.|Promijeni pretragu, stanje ili filter prodavnice.|Ograniči podobne proizvode i kategorije za ovaj kupon.|{item} je već izabrano u {label}.",
  sl: "Dejanja|Aktivno|Aktivni datumi|aktivno|Dodaj|Dodano|Vsi upravičeni izdelki|Vse trgovine|Vsa stanja|Vedno|arhivirano|Počisti|Zapri pomoč|Koda kupona|Pogoji|Kupon|kupon|Ime kupona|Kupon ni najden|Stanje kupona|Kupon ni najden.|Kuponi|kuponov|Ustvari kupon|Valuta|digitalno|Popust|osnutek|Uredi|Uredi samo obstoječe|Konča se|Izključi kategorije|Izključi izdelke|izključitev|izključitve|Filtriraj|Filtri|fiksni znesek|brezplačna dostava|Pomoč|neaktivno|Vključi kategorije|Vključi izdelke|pravilo vključitve|pravila vključitve|Neveljavno iskanje izdelka.|Zahtevana je aktivna licenca Webshop.|Min.|Najmanjši vmesni seštevek|Nov kupon|Naslednja|Kategorije niso najdene.|Kuponov še ni|Brez konca|Ni izključenih kategorij.|Ni izključenih izdelkov.|Ni vključenih kategorij.|Ni vključenih izdelkov.|Ni ujemajočih kuponov|Brez minimuma|Izdelki niso najdeni.|Zdaj|od|Izbirno|Stran|strani|zaustavljeno|odstotek|Na stranko|na stranko|fizično|Prejšnja|Izdelek|Ciljanje izdelkov in kategorij|Iskanje izdelkov...|Izdelki|izdelkov|Promocije|Odstrani|Vrstic na stran|Shrani kupon|Urnik in omejitve|Išči kategorije ali podkategorije|Išči kategorije za izključitev|Išči kodo ali ime|Išči izdelke po naslovu, slugu ali UUID|Išči izdelke za izključitev|Izbrano|storitev|Prikazano|Začne se|Stanje|Poletna akcija|Vrsta|Uporaba|Omejitev uporabe|Vrednost|Webshop|Prepovedano.|Kuponi se uporabljajo pri plačilu; neaktivni ali arhivirani kuponi ostanejo shranjeni, vendar jih ni mogoče unovčiti.|Nastavi kupon, popust, valuto in pravila plačila.|Izberi neobvezen datum in čas veljavnosti kupona.|Izpolni in preveri to polje kupona.|Za ustvarjanje kuponov sta potrebna aktivna licenca Webshop in vsaj en element vsebine Webshop.|Nastavi skupne in uporabniške omejitve uporabe.|Spremeni iskanje, stanje ali filter trgovine.|Omeji upravičene izdelke in kategorije za ta kupon.|{item} je že izbrano v {label}.",
  ru: "Действия|Активно|Активные даты|активно|Добавить|Добавлено|Все подходящие товары|Все магазины|Все статусы|Всегда|архивировано|Очистить|Закрыть помощь|Код купона|Условия|Купон|купон|Название купона|Купон не найден|Статус купона|Купон не найден.|Купоны|купонов|Создать купон|Валюта|цифровой|Скидка|черновик|Изменить|Редактировать только существующие|Заканчивается|Исключить категории|Исключить товары|исключение|исключения|Фильтровать|Фильтры|фиксированная сумма|бесплатная доставка|Помощь|неактивно|Включить категории|Включить товары|правило включения|правила включения|Недопустимый поиск товара.|Требуется активная лицензия Webshop.|Мин.|Минимальная сумма|Новый купон|Далее|Категории не найдены.|Купонов пока нет|Без окончания|Нет исключённых категорий.|Нет исключённых товаров.|Нет включённых категорий.|Нет включённых товаров.|Нет подходящих купонов|Без минимума|Товары не найдены.|Сейчас|из|Необязательно|Страница|странице|приостановлено|процент|На клиента|на клиента|физический|Назад|Товар|Таргетинг товаров и категорий|Поиск товаров...|Товары|товаров|Акции|Удалить|Строк на страницу|Сохранить купон|Расписание и лимиты|Искать категории или подкатегории|Искать категории для исключения|Искать код или название|Искать товары по названию, slug или UUID|Искать товары для исключения|Выбрано|услуга|Показано|Начинается|Статус|Летняя акция|Тип|Использование|Лимит использования|Значение|Webshop|Запрещено.|Купоны используются при оплате; неактивные или архивированные купоны сохраняются, но не могут быть погашены.|Настройте купон, скидку, валюту и правила оплаты.|Выберите необязательные дату и время действия купона.|Заполните и проверьте это поле купона.|Для создания купонов нужна активная лицензия Webshop и хотя бы один элемент содержимого Webshop.|Настройте общие и клиентские лимиты использования.|Измените поиск, статус или фильтр магазина.|Ограничьте подходящие товары и категории для этого купона.|{item} уже выбрано в {label}.",
  hu: "Műveletek|Aktív|Aktív dátumok|aktív|Hozzáadás|Hozzáadva|Minden jogosult termék|Minden üzlet|Minden állapot|Mindig|archivált|Törlés|Súgó bezárása|Kuponkód|Feltételek|Kupon|kupon|Kupon neve|Kupon nem található|Kupon állapota|A kupon nem található.|Kuponok|kupon|Kupon létrehozása|Pénznem|digitális|Kedvezmény|piszkozat|Szerkesztés|Csak meglévők szerkesztése|Vége|Kategóriák kizárása|Termékek kizárása|kizárás|kizárások|Szűrés|Szűrők|fix összeg|ingyenes szállítás|Súgó|inaktív|Kategóriák bevonása|Termékek bevonása|bevonási szabály|bevonási szabályok|Érvénytelen termékkeresés.|Aktív Webshop licenc szükséges.|Min.|Minimális részösszeg|Új kupon|Következő|Nem találhatók kategóriák.|Még nincsenek kuponok|Nincs vég|Nincsenek kizárt kategóriák.|Nincsenek kizárt termékek.|Nincsenek bevont kategóriák.|Nincsenek bevont termékek.|Nincs egyező kupon|Nincs minimum|Nem találhatók termékek.|Most|/|Opcionális|Oldal|oldal|szüneteltetve|százalék|Ügyfelenként|ügyfelenként|fizikai|Előző|Termék|Termék- és kategóriacélzás|Termékek keresése...|Termékek|termék|Akciók|Eltávolítás|Sor oldalanként|Kupon mentése|Ütemezés és limitek|Kategóriák vagy alkategóriák keresése|Kizárandó kategóriák keresése|Kód vagy név keresése|Termékek keresése cím, slug vagy UUID alapján|Kizárandó termékek keresése|Kijelölve|szolgáltatás|Megjelenítve|Kezdődik|Állapot|Nyári akció|Típus|Használat|Használati limit|Érték|Webshop|Tiltott.|A kuponok fizetéskor használhatók; az inaktív vagy archivált kuponok mentve maradnak, de nem válthatók be.|Állítsd be a kupont, kedvezményt, pénznemet és fizetési szabályokat.|Válassz opcionális dátumot és időt a kupon érvényességéhez.|Töltsd ki és ellenőrizd ezt a kuponmezőt.|Kuponok létrehozásához aktív Webshop licenc és legalább egy Webshop tartalomelem szükséges.|Állítsd be az összesített és ügyfelenkénti használati limiteket.|Módosítsd a keresést, állapotot vagy üzletszűrőt.|Korlátozd a kuponra jogosult termékeket és kategóriákat.|{item} már ki van jelölve itt: {label}.",
  bg: "Действия|Активно|Активни дати|активно|Добави|Добавено|Всички допустими продукти|Всички магазини|Всички статуси|Винаги|архивирано|Изчисти|Затвори помощта|Код на купон|Условия|Купон|купон|Име на купон|Купонът не е намерен|Статус на купон|Купонът не е намерен.|Купони|купони|Създай купон|Валута|дигитален|Отстъпка|чернова|Редактирай|Редактиране само на съществуващи|Завършва|Изключи категории|Изключи продукти|изключение|изключения|Филтрирай|Филтри|фиксирана сума|безплатна доставка|Помощ|неактивно|Включи категории|Включи продукти|правило за включване|правила за включване|Невалидно търсене на продукт.|Изисква се активен Webshop лиценз.|Мин.|Минимална междинна сума|Нов купон|Следваща|Не са намерени категории.|Все още няма купони|Без край|Няма изключени категории.|Няма изключени продукти.|Няма включени категории.|Няма включени продукти.|Няма съвпадащи купони|Без минимум|Не са намерени продукти.|Сега|от|Незадължително|Страница|страница|паузирано|процент|На клиент|на клиент|физически|Предишна|Продукт|Насочване към продукти и категории|Търсене на продукти...|Продукти|продукта|Промоции|Премахни|Редове на страница|Запази купона|График и лимити|Търси категории или подкатегории|Търси категории за изключване|Търси код или име|Търси продукти по заглавие, slug или UUID|Търси продукти за изключване|Избрано|услуга|Показано|Започва|Статус|Лятна промоция|Тип|Използване|Лимит за използване|Стойност|Webshop|Забранено.|Купоните се използват при плащане; неактивните или архивирани купони остават запазени, но не могат да се осребрят.|Настрой купона, отстъпката, валутата и правилата за плащане.|Избери незадължителна дата и час за валидност на купона.|Попълни и провери това поле на купона.|За създаване на купони са нужни активен Webshop лиценз и поне един Webshop елемент съдържание.|Настрой общи и клиентски лимити за използване.|Промени търсенето, статуса или филтъра на магазина.|Ограничи допустимите продукти и категории за този купон.|{item} вече е избрано в {label}.",
  ja: "操作|有効|有効期間|有効|追加|追加済み|対象の全商品|すべてのショップ|すべてのステータス|常時|アーカイブ済み|クリア|ヘルプを閉じる|クーポンコード|条件|クーポン|クーポン|クーポン名|クーポンが見つかりません|クーポンステータス|クーポンが見つかりません。|クーポン|クーポン|クーポンを作成|通貨|デジタル|割引|下書き|編集|既存のみ編集|終了|カテゴリを除外|商品を除外|除外|除外|絞り込み|フィルター|固定金額|送料無料|ヘルプ|無効|カテゴリを含める|商品を含める|含めるルール|含めるルール|商品検索が無効です。|有効な Webshop ライセンスが必要です。|最小|最小小計|新しいクーポン|次へ|カテゴリが見つかりません。|クーポンはまだありません|終了なし|除外カテゴリはありません。|除外商品はありません。|含まれるカテゴリはありません。|含まれる商品はありません。|一致するクーポンはありません|最小条件なし|商品が見つかりません。|今|/|任意|ページ|ページ|一時停止|パーセント|顧客ごと|顧客ごと|物理|前へ|商品|商品とカテゴリのターゲティング|商品を検索中...|商品|商品|プロモーション|削除|ページあたり行数|クーポンを保存|スケジュールと制限|カテゴリまたはサブカテゴリを検索|除外するカテゴリを検索|コードまたは名前を検索|タイトル、slug、UUID で商品を検索|除外する商品を検索|選択済み|サービス|表示中|開始|ステータス|夏のセール|種類|使用|使用制限|値|Webshop|禁止されています。|クーポンはチェックアウトで使用します。無効またはアーカイブ済みのクーポンは保存されますが利用できません。|クーポン、割引、通貨、チェックアウトルールを設定します。|クーポンの有効日時を任意で選択します。|このクーポン項目を入力して確認します。|クーポン作成には有効な Webshop ライセンスと少なくとも 1 つの Webshop コンテンツが必要です。|合計および顧客ごとの使用制限を設定します。|検索、ステータス、ショップフィルターを変更します。|このクーポンの対象商品とカテゴリを制限します。|{item} はすでに {label} で選択されています。",
  "zh-Hans":
    "操作|启用|有效日期|启用|添加|已添加|所有符合条件的商品|所有店铺|所有状态|始终|已归档|清除|关闭帮助|优惠券代码|条件|优惠券|优惠券|优惠券名称|未找到优惠券|优惠券状态|未找到优惠券。|优惠券|优惠券|创建优惠券|货币|数字|折扣|草稿|编辑|仅编辑现有项|结束|排除分类|排除商品|排除项|排除项|筛选|筛选器|固定金额|免运费|帮助|停用|包含分类|包含商品|包含规则|包含规则|商品搜索无效。|需要有效的 Webshop 许可证。|最低|最低小计|新优惠券|下一页|未找到分类。|还没有优惠券|无结束|没有排除的分类。|没有排除的商品。|没有包含的分类。|没有包含的商品。|没有匹配的优惠券|无最低要求|未找到商品。|现在|/|可选|页面|页|已暂停|百分比|每位客户|每位客户|实体|上一页|商品|商品和分类定位|正在搜索商品...|商品|商品|促销|移除|每页行数|保存优惠券|计划和限制|搜索分类或子分类|搜索要排除的分类|搜索代码或名称|按标题、slug 或 UUID 搜索商品|搜索要排除的商品|已选择|服务|显示|开始|状态|夏季促销|类型|使用|使用限制|值|Webshop|禁止。|优惠券在结账时使用；停用或归档的优惠券会保留，但不能兑换。|配置优惠券、折扣、货币和结账规则。|选择优惠券有效期的可选日期和时间。|填写并检查此优惠券字段。|创建优惠券需要有效的 Webshop 许可证和至少一个 Webshop 内容项。|配置总使用限制和每位客户限制。|更改搜索、状态或店铺筛选器。|限制此优惠券适用的商品和分类。|{item} 已在 {label} 中选择。",
  "zh-Hant":
    "操作|啟用|有效日期|啟用|新增|已新增|所有符合資格的商品|所有店鋪|所有狀態|一律|已封存|清除|關閉說明|優惠券代碼|條件|優惠券|優惠券|優惠券名稱|找不到優惠券|優惠券狀態|找不到優惠券。|優惠券|優惠券|建立優惠券|貨幣|數位|折扣|草稿|編輯|僅編輯現有項目|結束|排除分類|排除商品|排除項|排除項|篩選|篩選器|固定金額|免運費|說明|停用|包含分類|包含商品|包含規則|包含規則|商品搜尋無效。|需要有效的 Webshop 授權。|最低|最低小計|新優惠券|下一頁|找不到分類。|尚無優惠券|無結束|沒有排除的分類。|沒有排除的商品。|沒有包含的分類。|沒有包含的商品。|沒有相符的優惠券|無最低要求|找不到商品。|現在|/|選填|頁面|頁|已暫停|百分比|每位客戶|每位客戶|實體|上一頁|商品|商品與分類定位|正在搜尋商品...|商品|商品|促銷|移除|每頁列數|儲存優惠券|排程與限制|搜尋分類或子分類|搜尋要排除的分類|搜尋代碼或名稱|依標題、slug 或 UUID 搜尋商品|搜尋要排除的商品|已選取|服務|顯示|開始|狀態|夏季促銷|類型|使用|使用限制|值|Webshop|禁止。|優惠券用於結帳；停用或封存的優惠券會保留，但無法兌換。|設定優惠券、折扣、貨幣與結帳規則。|選擇優惠券有效期的選填日期與時間。|填寫並檢查此優惠券欄位。|建立優惠券需要有效的 Webshop 授權和至少一個 Webshop 內容項目。|設定總使用限制與每位客戶限制。|變更搜尋、狀態或店鋪篩選器。|限制此優惠券適用的商品與分類。|{item} 已在 {label} 中選取。",
  ar: "الإجراءات|نشط|تواريخ النشاط|نشط|إضافة|تمت الإضافة|كل المنتجات المؤهلة|كل المتاجر|كل الحالات|دائمًا|مؤرشف|مسح|إغلاق المساعدة|رمز القسيمة|الشروط|قسيمة|قسيمة|اسم القسيمة|القسيمة غير موجودة|حالة القسيمة|القسيمة غير موجودة.|القسائم|قسائم|إنشاء قسيمة|العملة|رقمي|الخصم|مسودة|تعديل|تعديل الموجود فقط|ينتهي|استبعاد الفئات|استبعاد المنتجات|استبعاد|استبعادات|تصفية|الفلاتر|مبلغ ثابت|شحن مجاني|مساعدة|غير نشط|تضمين الفئات|تضمين المنتجات|قاعدة تضمين|قواعد تضمين|بحث المنتج غير صالح.|يلزم ترخيص Webshop نشط.|حد أدنى|الحد الأدنى للمجموع الفرعي|قسيمة جديدة|التالي|لم يتم العثور على فئات.|لا توجد قسائم بعد|بدون نهاية|لا توجد فئات مستبعدة.|لا توجد منتجات مستبعدة.|لا توجد فئات مضمّنة.|لا توجد منتجات مضمّنة.|لا توجد قسائم مطابقة|لا يوجد حد أدنى|لم يتم العثور على منتجات.|الآن|من|اختياري|صفحة|صفحة|متوقف مؤقتًا|نسبة مئوية|لكل عميل|لكل عميل|مادي|السابق|المنتج|استهداف المنتجات والفئات|جارٍ البحث عن المنتجات...|المنتجات|منتجات|العروض الترويجية|إزالة|صفوف لكل صفحة|حفظ القسيمة|الجدولة والحدود|البحث في الفئات أو الفئات الفرعية|البحث عن فئات لاستبعادها|البحث عن رمز أو اسم|البحث عن المنتجات بالعنوان أو slug أو UUID|البحث عن منتجات لاستبعادها|محدد|خدمة|عرض|يبدأ|الحالة|عرض الصيف|النوع|الاستخدام|حد الاستخدام|القيمة|Webshop|محظور.|تُستخدم القسائم عند الدفع؛ تبقى القسائم غير النشطة أو المؤرشفة محفوظة ولكن لا يمكن استردادها.|اضبط القسيمة والخصم والعملة وقواعد الدفع.|اختر تاريخًا ووقتًا اختياريين لصلاحية القسيمة.|املأ هذا الحقل الخاص بالقسيمة وتحقق منه.|يتطلب إنشاء القسائم ترخيص Webshop نشطًا وعنصر محتوى Webshop واحدًا على الأقل.|اضبط حدود الاستخدام الإجمالية ولكل عميل.|غيّر البحث أو الحالة أو فلتر المتجر.|اقصر المنتجات والفئات المؤهلة على هذه القسيمة.|{item} محدد بالفعل في {label}.",
  id: "Tindakan|Aktif|Tanggal aktif|aktif|Tambah|Ditambahkan|Semua produk yang memenuhi syarat|Semua toko|Semua status|Selalu|diarsipkan|Bersihkan|Tutup bantuan|Kode kupon|Ketentuan|Kupon|kupon|Nama kupon|Kupon tidak ditemukan|Status kupon|Kupon tidak ditemukan.|Kupon|kupon|Buat kupon|Mata uang|digital|Diskon|draf|Edit|Edit yang sudah ada saja|Berakhir|Kecualikan kategori|Kecualikan produk|pengecualian|pengecualian|Saring|Filter|jumlah tetap|gratis ongkir|Bantuan|tidak aktif|Sertakan kategori|Sertakan produk|aturan penyertaan|aturan penyertaan|Pencarian produk tidak valid.|Lisensi Webshop aktif diperlukan.|Min.|Subtotal minimum|Kupon baru|Berikutnya|Kategori tidak ditemukan.|Belum ada kupon|Tanpa akhir|Tidak ada kategori yang dikecualikan.|Tidak ada produk yang dikecualikan.|Tidak ada kategori yang disertakan.|Tidak ada produk yang disertakan.|Tidak ada kupon yang cocok|Tanpa minimum|Produk tidak ditemukan.|Sekarang|dari|Opsional|Halaman|halaman|dijeda|persen|Per pelanggan|per pelanggan|fisik|Sebelumnya|Produk|Penargetan produk dan kategori|Mencari produk...|Produk|produk|Promosi|Hapus|Baris per halaman|Simpan kupon|Jadwal dan batas|Cari kategori atau subkategori|Cari kategori untuk dikecualikan|Cari kode atau nama|Cari produk berdasarkan judul, slug, atau UUID|Cari produk untuk dikecualikan|Dipilih|layanan|Menampilkan|Mulai|Keadaan|Promo musim panas|Tipe|Penggunaan|Batas penggunaan|Nilai|Webshop|Dilarang.|Kupon digunakan saat checkout; kupon tidak aktif atau diarsipkan tetap tersimpan tetapi tidak dapat ditukarkan.|Atur kupon, diskon, mata uang, dan aturan checkout.|Pilih tanggal dan waktu opsional untuk masa berlaku kupon.|Isi dan periksa bidang kupon ini.|Membuat kupon memerlukan lisensi Webshop aktif dan setidaknya satu item konten Webshop.|Atur batas penggunaan total dan per pelanggan.|Ubah pencarian, status, atau filter toko.|Batasi produk dan kategori yang memenuhi syarat untuk kupon ini.|{item} sudah dipilih di {label}.",
  cs: "Akce|Aktivní|Aktivní data|aktivní|Přidat|Přidáno|Všechny způsobilé produkty|Všechny obchody|Všechny stavy|Vždy|archivováno|Vymazat|Zavřít nápovědu|Kód kuponu|Podmínky|Kupon|kupon|Název kuponu|Kupon nenalezen|Stav kuponu|Kupon nebyl nalezen.|Kupony|kuponů|Vytvořit kupon|Měna|digitální|Sleva|koncept|Upravit|Upravit pouze existující|Končí|Vyloučit kategorie|Vyloučit produkty|vyloučení|vyloučení|Filtrovat|Filtry|pevná částka|doprava zdarma|Nápověda|neaktivní|Zahrnout kategorie|Zahrnout produkty|pravidlo zahrnutí|pravidla zahrnutí|Neplatné vyhledávání produktu.|Je vyžadována aktivní licence Webshop.|Min.|Minimální mezisoučet|Nový kupon|Další|Kategorie nenalezeny.|Zatím žádné kupony|Bez konce|Žádné vyloučené kategorie.|Žádné vyloučené produkty.|Žádné zahrnuté kategorie.|Žádné zahrnuté produkty.|Žádné odpovídající kupony|Bez minima|Produkty nenalezeny.|Nyní|z|Volitelné|Stránka|stránce|pozastaveno|procento|Na zákazníka|na zákazníka|fyzický|Předchozí|Produkt|Cílení produktů a kategorií|Vyhledávání produktů...|Produkty|produktů|Promo akce|Odebrat|Řádků na stránku|Uložit kupon|Plán a limity|Hledat kategorie nebo podkategorie|Hledat kategorie k vyloučení|Hledat kód nebo název|Hledat produkty podle názvu, slugu nebo UUID|Hledat produkty k vyloučení|Vybráno|služba|Zobrazeno|Začíná|Stav|Letní akce|Typ|Použití|Limit použití|Hodnota|Webshop|Zakázáno.|Kupony se používají při pokladně; neaktivní nebo archivované kupony zůstávají uložené, ale nelze je uplatnit.|Nastavte kupon, slevu, měnu a pravidla pokladny.|Vyberte volitelné datum a čas platnosti kuponu.|Vyplňte a zkontrolujte toto pole kuponu.|K vytváření kuponů je vyžadována aktivní licence Webshop a alespoň jedna položka obsahu Webshop.|Nastavte celkové limity a limity na zákazníka.|Změňte vyhledávání, stav nebo filtr obchodu.|Omezte způsobilé produkty a kategorie pro tento kupon.|{item} je již vybráno v {label}.",
  ro: "Acțiuni|Activ|Date active|activ|Adaugă|Adăugat|Toate produsele eligibile|Toate magazinele|Toate statusurile|Întotdeauna|arhivat|Șterge|Închide ajutorul|Cod cupon|Condiții|Cupon|cupon|Nume cupon|Cuponul nu a fost găsit|Status cupon|Cuponul nu a fost găsit.|Cupoane|cupoane|Creează cupon|Monedă|digital|Reducere|ciornă|Editează|Editați doar existente|Se termină|Exclude categorii|Exclude produse|excludere|excluderi|Filtrează|Filtre|sumă fixă|livrare gratuită|Ajutor|inactiv|Include categorii|Include produse|regulă de includere|reguli de includere|Căutare produs nevalidă.|Este necesară o licență Webshop activă.|Min.|Subtotal minim|Cupon nou|Următor|Nu s-au găsit categorii.|Încă nu există cupoane|Fără sfârșit|Nu există categorii excluse.|Nu există produse excluse.|Nu există categorii incluse.|Nu există produse incluse.|Nu există cupoane potrivite|Fără minim|Nu s-au găsit produse.|Acum|din|Opțional|Pagină|pagină|în pauză|procent|Per client|per client|fizic|Anterior|Produs|Țintire produse și categorii|Se caută produse...|Produse|produse|Promoții|Elimină|Rânduri pe pagină|Salvează cupon|Program și limite|Caută categorii sau subcategorii|Caută categorii de exclus|Caută cod sau nume|Caută produse după titlu, slug sau UUID|Caută produse de exclus|Selectat|serviciu|Se afișează|Începe|Stare|Promoție de vară|Tip|Utilizare|Limită de utilizare|Valoare|Webshop|Interzis.|Cupoanele sunt folosite la checkout; cupoanele inactive sau arhivate rămân salvate, dar nu pot fi valorificate.|Configurează cuponul, reducerea, moneda și regulile de checkout.|Alege data și ora opționale pentru valabilitatea cuponului.|Completează și verifică acest câmp al cuponului.|Pentru a crea cupoane este necesară o licență Webshop activă și cel puțin un element de conținut Webshop.|Configurează limite totale și per client.|Schimbă căutarea, statusul sau filtrul magazinului.|Limitează produsele și categoriile eligibile pentru acest cupon.|{item} este deja selectat în {label}.",
  el: "Ενέργειες|Ενεργό|Ενεργές ημερομηνίες|ενεργό|Προσθήκη|Προστέθηκε|Όλα τα επιλέξιμα προϊόντα|Όλα τα καταστήματα|Όλες οι καταστάσεις|Πάντα|αρχειοθετημένο|Εκκαθάριση|Κλείσιμο βοήθειας|Κωδικός κουπονιού|Προϋποθέσεις|Κουπόνι|κουπόνι|Όνομα κουπονιού|Το κουπόνι δεν βρέθηκε|Κατάσταση κουπονιού|Το κουπόνι δεν βρέθηκε.|Κουπόνια|κουπόνια|Δημιουργία κουπονιού|Νόμισμα|ψηφιακό|Έκπτωση|πρόχειρο|Επεξεργασία|Επεξεργασία μόνο υπαρχόντων|Λήγει|Εξαίρεση κατηγοριών|Εξαίρεση προϊόντων|εξαίρεση|εξαιρέσεις|Φιλτράρισμα|Φίλτρα|σταθερό ποσό|δωρεάν αποστολή|Βοήθεια|ανενεργό|Συμπερίληψη κατηγοριών|Συμπερίληψη προϊόντων|κανόνας συμπερίληψης|κανόνες συμπερίληψης|Μη έγκυρη αναζήτηση προϊόντος.|Απαιτείται ενεργή άδεια Webshop.|Ελάχ.|Ελάχιστο υποσύνολο|Νέο κουπόνι|Επόμενο|Δεν βρέθηκαν κατηγορίες.|Δεν υπάρχουν ακόμη κουπόνια|Χωρίς τέλος|Δεν υπάρχουν εξαιρούμενες κατηγορίες.|Δεν υπάρχουν εξαιρούμενα προϊόντα.|Δεν υπάρχουν συμπεριλαμβανόμενες κατηγορίες.|Δεν υπάρχουν συμπεριλαμβανόμενα προϊόντα.|Δεν υπάρχουν αντίστοιχα κουπόνια|Χωρίς ελάχιστο|Δεν βρέθηκαν προϊόντα.|Τώρα|από|Προαιρετικό|Σελίδα|σελίδα|σε παύση|ποσοστό|Ανά πελάτη|ανά πελάτη|φυσικό|Προηγούμενο|Προϊόν|Στόχευση προϊόντων και κατηγοριών|Αναζήτηση προϊόντων...|Προϊόντα|προϊόντα|Προσφορές|Αφαίρεση|Γραμμές ανά σελίδα|Αποθήκευση κουπονιού|Πρόγραμμα και όρια|Αναζήτηση κατηγοριών ή υποκατηγοριών|Αναζήτηση κατηγοριών για εξαίρεση|Αναζήτηση κωδικού ή ονόματος|Αναζήτηση προϊόντων με τίτλο, slug ή UUID|Αναζήτηση προϊόντων για εξαίρεση|Επιλεγμένο|υπηρεσία|Εμφάνιση|Ξεκινά|Κατάσταση|Καλοκαιρινή προσφορά|Τύπος|Χρήση|Όριο χρήσης|Τιμή|Webshop|Απαγορεύεται.|Τα κουπόνια χρησιμοποιούνται στο checkout· τα ανενεργά ή αρχειοθετημένα κουπόνια παραμένουν αποθηκευμένα αλλά δεν μπορούν να εξαργυρωθούν.|Ρυθμίστε το κουπόνι, την έκπτωση, το νόμισμα και τους κανόνες checkout.|Επιλέξτε προαιρετική ημερομηνία και ώρα ισχύος του κουπονιού.|Συμπληρώστε και ελέγξτε αυτό το πεδίο κουπονιού.|Για δημιουργία κουπονιών απαιτείται ενεργή άδεια Webshop και τουλάχιστον ένα στοιχείο περιεχομένου Webshop.|Ρυθμίστε συνολικά όρια και όρια ανά πελάτη.|Αλλάξτε αναζήτηση, κατάσταση ή φίλτρο καταστήματος.|Περιορίστε τα επιλέξιμα προϊόντα και κατηγορίες για αυτό το κουπόνι.|Το {item} είναι ήδη επιλεγμένο στο {label}.",
  da: "Handlinger|Aktiv|Aktive datoer|aktiv|Tilføj|Tilføjet|Alle kvalificerede produkter|Alle butikker|Alle statusser|Altid|arkiveret|Ryd|Luk hjælp|Kuponkode|Betingelser|Kupon|kupon|Kuponnavn|Kupon ikke fundet|Kuponstatus|Kuponen blev ikke fundet.|Kuponer|kuponer|Opret kupon|Valuta|digital|Rabat|kladde|Rediger|Rediger kun eksisterende|Slutter|Ekskluder kategorier|Ekskluder produkter|eksklusion|eksklusioner|Filtrer|Filtre|fast beløb|gratis fragt|Hjælp|inaktiv|Inkluder kategorier|Inkluder produkter|inkluderingsregel|inkluderingsregler|Ugyldig produktsøgning.|En aktiv Webshop-licens kræves.|Min.|Mindste subtotal|Ny kupon|Næste|Ingen kategorier fundet.|Ingen kuponer endnu|Ingen slutning|Ingen ekskluderede kategorier.|Ingen ekskluderede produkter.|Ingen inkluderede kategorier.|Ingen inkluderede produkter.|Ingen matchende kuponer|Intet minimum|Ingen produkter fundet.|Nu|af|Valgfrit|Side|side|sat på pause|procent|Pr. kunde|pr. kunde|fysisk|Forrige|Produkt|Produkt- og kategorimålretning|Søger efter produkter...|Produkter|produkter|Kampagner|Fjern|Rækker pr. side|Gem kupon|Plan og grænser|Søg kategorier eller underkategorier|Søg kategorier der skal ekskluderes|Søg kode eller navn|Søg produkter efter titel, slug eller UUID|Søg produkter der skal ekskluderes|Valgt|service|Viser|Starter|Status|Sommerkampagne|Type|Brug|Brugsgrænse|Værdi|Webshop|Forbudt.|Kuponer bruges ved checkout; inaktive eller arkiverede kuponer gemmes, men kan ikke indløses.|Konfigurer kupon, rabat, valuta og checkout-regler.|Vælg valgfri dato og tid for kuponens gyldighed.|Udfyld og kontroller dette kuponfelt.|Oprettelse af kuponer kræver en aktiv Webshop-licens og mindst ét Webshop-indholdselement.|Konfigurer samlede grænser og kundebegrænsninger.|Skift søgning, status eller butiksfilter.|Begræns kvalificerede produkter og kategorier for denne kupon.|{item} er allerede valgt i {label}.",
  sv: "Åtgärder|Aktiv|Aktiva datum|aktiv|Lägg till|Tillagd|Alla kvalificerade produkter|Alla butiker|Alla statusar|Alltid|arkiverad|Rensa|Stäng hjälp|Kupongkod|Villkor|Kupong|kupong|Kupongnamn|Kupong hittades inte|Kupongstatus|Kupongen hittades inte.|Kuponger|kuponger|Skapa kupong|Valuta|digital|Rabatt|utkast|Redigera|Redigera endast befintliga|Slutar|Exkludera kategorier|Exkludera produkter|exkludering|exkluderingar|Filtrera|Filter|fast belopp|fri frakt|Hjälp|inaktiv|Inkludera kategorier|Inkludera produkter|inkluderingsregel|inkluderingsregler|Ogiltig produktsökning.|En aktiv Webshop-licens krävs.|Min.|Minsta delsumma|Ny kupong|Nästa|Inga kategorier hittades.|Inga kuponger ännu|Inget slut|Inga exkluderade kategorier.|Inga exkluderade produkter.|Inga inkluderade kategorier.|Inga inkluderade produkter.|Inga matchande kuponger|Inget minimum|Inga produkter hittades.|Nu|av|Valfritt|Sida|sida|pausad|procent|Per kund|per kund|fysisk|Föregående|Produkt|Produkt- och kategorimålning|Söker produkter...|Produkter|produkter|Kampanjer|Ta bort|Rader per sida|Spara kupong|Schema och gränser|Sök kategorier eller underkategorier|Sök kategorier att exkludera|Sök kod eller namn|Sök produkter efter titel, slug eller UUID|Sök produkter att exkludera|Vald|tjänst|Visar|Startar|Läge|Sommarkampanj|Typ|Användning|Användningsgräns|Värde|Webshop|Förbjudet.|Kuponger används i kassan; inaktiva eller arkiverade kuponger sparas men kan inte lösas in.|Konfigurera kupong, rabatt, valuta och kassaregler.|Välj valfritt datum och tid för kupongens giltighet.|Fyll i och kontrollera detta kupongfält.|För att skapa kuponger krävs en aktiv Webshop-licens och minst ett Webshop-innehållsobjekt.|Konfigurera totala gränser och kundgränser.|Ändra sökning, status eller butiksfilter.|Begränsa kvalificerade produkter och kategorier för denna kupong.|{item} är redan valt i {label}.",
  nb: "Handlinger|Aktiv|Aktive datoer|aktiv|Legg til|Lagt til|Alle kvalifiserte produkter|Alle butikker|Alle statuser|Alltid|arkivert|Tøm|Lukk hjelp|Kupongkode|Betingelser|Kupong|kupong|Kupongnavn|Kupong ikke funnet|Kupongstatus|Kupongen ble ikke funnet.|Kuponger|kuponger|Opprett kupong|Valuta|digital|Rabatt|utkast|Rediger|Rediger bare eksisterende|Slutter|Ekskluder kategorier|Ekskluder produkter|ekskludering|ekskluderinger|Filtrer|Filtre|fast beløp|gratis frakt|Hjelp|inaktiv|Inkluder kategorier|Inkluder produkter|inkluderingsregel|inkluderingsregler|Ugyldig produktsøk.|En aktiv Webshop-lisens kreves.|Min.|Minste delsum|Ny kupong|Neste|Ingen kategorier funnet.|Ingen kuponger ennå|Ingen slutt|Ingen ekskluderte kategorier.|Ingen ekskluderte produkter.|Ingen inkluderte kategorier.|Ingen inkluderte produkter.|Ingen matchende kuponger|Ingen minimum|Ingen produkter funnet.|Nå|av|Valgfritt|Side|side|pauset|prosent|Per kunde|per kunde|fysisk|Forrige|Produkt|Produkt- og kategorimålretting|Søker etter produkter...|Produkter|produkter|Kampanjer|Fjern|Rader per side|Lagre kupong|Plan og grenser|Søk kategorier eller underkategorier|Søk kategorier som skal ekskluderes|Søk kode eller navn|Søk produkter etter tittel, slug eller UUID|Søk produkter som skal ekskluderes|Valgt|tjeneste|Viser|Starter|Tilstand|Sommerkampanje|Type|Bruk|Bruksgrense|Verdi|Webshop|Forbudt.|Kuponger brukes i kassen; inaktive eller arkiverte kuponger forblir lagret, men kan ikke innløses.|Konfigurer kupong, rabatt, valuta og kasseregler.|Velg valgfri dato og tid for kupongens gyldighet.|Fyll ut og kontroller dette kupongfeltet.|For å opprette kuponger kreves en aktiv Webshop-lisens og minst ett Webshop-innholdselement.|Konfigurer totale grenser og kundegrenser.|Endre søk, status eller butikkfilter.|Begrens kvalifiserte produkter og kategorier for denne kupongen.|{item} er allerede valgt i {label}.",
  nn: "Handlingar|Aktiv|Aktive datoar|aktiv|Legg til|Lagt til|Alle kvalifiserte produkt|Alle butikkar|Alle statusar|Alltid|arkivert|Tøm|Lukk hjelp|Kupongkode|Vilkår|Kupong|kupong|Kupongnamn|Kupong ikkje funnen|Kupongstatus|Kupongen vart ikkje funnen.|Kupongar|kupongar|Opprett kupong|Valuta|digital|Rabatt|utkast|Rediger|Rediger berre eksisterande|Sluttar|Ekskluder kategoriar|Ekskluder produkt|ekskludering|ekskluderingar|Filtrer|Filter|fast beløp|gratis frakt|Hjelp|inaktiv|Inkluder kategoriar|Inkluder produkt|inkluderingsregel|inkluderingsreglar|Ugyldig produktsøk.|Ein aktiv Webshop-lisens krevst.|Min.|Minste delsum|Ny kupong|Neste|Ingen kategoriar funne.|Ingen kupongar enno|Ingen slutt|Ingen ekskluderte kategoriar.|Ingen ekskluderte produkt.|Ingen inkluderte kategoriar.|Ingen inkluderte produkt.|Ingen matchande kupongar|Ingen minimum|Ingen produkt funne.|No|av|Valfritt|Side|side|pausa|prosent|Per kunde|per kunde|fysisk|Førre|Produkt|Produkt- og kategorimålretting|Søkjer etter produkt...|Produkt|produkt|Kampanjar|Fjern|Rader per side|Lagre kupong|Plan og grenser|Søk kategoriar eller underkategoriar|Søk kategoriar som skal ekskluderast|Søk kode eller namn|Søk produkt etter tittel, slug eller UUID|Søk produkt som skal ekskluderast|Valt|teneste|Viser|Startar|Tilstand|Sommarkampanje|Type|Bruk|Bruksgrense|Verdi|Webshop|Forbode.|Kupongar blir brukte i kassa; inaktive eller arkiverte kupongar blir lagra, men kan ikkje løysast inn.|Konfigurer kupong, rabatt, valuta og kassereglar.|Vel valfri dato og tid for gyldigheita til kupongen.|Fyll ut og kontroller dette kupongfeltet.|For å opprette kupongar krevst ein aktiv Webshop-lisens og minst eitt Webshop-innhaldselement.|Konfigurer totale grenser og kundegrenser.|Endre søk, status eller butikkfilter.|Avgrens kvalifiserte produkt og kategoriar for denne kupongen.|{item} er alt valt i {label}.",
  fi: "Toiminnot|Aktiivinen|Aktiiviset päivät|aktiivinen|Lisää|Lisätty|Kaikki kelvolliset tuotteet|Kaikki kaupat|Kaikki tilat|Aina|arkistoitu|Tyhjennä|Sulje ohje|Kupongin koodi|Ehdot|Kuponki|kuponki|Kupongin nimi|Kuponkia ei löytynyt|Kupongin tila|Kuponkia ei löytynyt.|Kupongit|kuponkia|Luo kuponki|Valuutta|digitaalinen|Alennus|luonnos|Muokkaa|Muokkaa vain olemassa olevia|Päättyy|Sulje kategoriat pois|Sulje tuotteet pois|poissulku|poissulut|Suodata|Suodattimet|kiinteä summa|ilmainen toimitus|Ohje|ei aktiivinen|Sisällytä kategoriat|Sisällytä tuotteet|sisällytyssääntö|sisällytyssäännöt|Virheellinen tuotehaku.|Aktiivinen Webshop-lisenssi vaaditaan.|Väh.|Vähimmäisvälisumma|Uusi kuponki|Seuraava|Kategorioita ei löytynyt.|Ei vielä kuponkeja|Ei päättymistä|Ei poissuljettuja kategorioita.|Ei poissuljettuja tuotteita.|Ei sisällytettyjä kategorioita.|Ei sisällytettyjä tuotteita.|Ei vastaavia kuponkeja|Ei vähimmäistä|Tuotteita ei löytynyt.|Nyt|/|Valinnainen|Sivu|sivu|keskeytetty|prosentti|Asiakasta kohti|asiakasta kohti|fyysinen|Edellinen|Tuote|Tuote- ja kategoriakohdistus|Haetaan tuotteita...|Tuotteet|tuotetta|Kampanjat|Poista|Riviä sivulla|Tallenna kuponki|Aikataulu ja rajat|Hae kategorioita tai alakategorioita|Hae poissuljettavia kategorioita|Hae koodia tai nimeä|Hae tuotteita otsikon, slugin tai UUID:n perusteella|Hae poissuljettavia tuotteita|Valittu|palvelu|Näytetään|Alkaa|Tila|Kesäkampanja|Tyyppi|Käyttö|Käyttöraja|Arvo|Webshop|Kielletty.|Kuponkeja käytetään kassalla; ei-aktiiviset tai arkistoidut kupongit säilyvät tallennettuina, mutta niitä ei voi lunastaa.|Määritä kuponki, alennus, valuutta ja kassasäännöt.|Valitse kupongin voimassaolon valinnainen päivämäärä ja aika.|Täytä ja tarkista tämä kuponkikenttä.|Kuponkien luonti vaatii aktiivisen Webshop-lisenssin ja vähintään yhden Webshop-sisältökohteen.|Määritä kokonais- ja asiakaskohtaiset käyttörajat.|Muuta hakua, tilaa tai kauppasuodatinta.|Rajoita tälle kupongille kelvollisia tuotteita ja kategorioita.|{item} on jo valittu kohdassa {label}.",
  is: "Aðgerðir|Virkt|Virk dagsetning|virkt|Bæta við|Bætt við|Allar gjaldgengar vörur|Allar verslanir|Allar stöður|Alltaf|sett í safn|Hreinsa|Loka hjálp|Afsláttarkóði|Skilyrði|Afsláttarkóði|afsláttarkóði|Heiti afsláttarkóða|Afsláttarkóði fannst ekki|Staða afsláttarkóða|Afsláttarkóði fannst ekki.|Afsláttarkóðar|afsláttarkóðar|Búa til afsláttarkóða|Gjaldmiðill|stafrænt|Afsláttur|drög|Breyta|Breyta aðeins fyrirliggjandi|Lýkur|Útiloka flokka|Útiloka vörur|útilokun|útilokanir|Sía|Síur|föst upphæð|ókeypis sending|Hjálp|óvirkt|Hafa flokka með|Hafa vörur með|innifalningarregla|innifalningarreglur|Ógild vöruleit.|Virkt Webshop-leyfi er áskilið.|Lágm.|Lágmarks millisamtala|Nýr afsláttarkóði|Næsta|Engir flokkar fundust.|Engir afsláttarkóðar enn|Enginn endir|Engir útilokaðir flokkar.|Engar útilokaðar vörur.|Engir flokkar hafðir með.|Engar vörur hafðar með.|Engir samsvarandi afsláttarkóðar|Ekkert lágmark|Engar vörur fundust.|Núna|af|Valfrjálst|Síða|síðu|í bið|prósenta|Á hvern viðskiptavin|á hvern viðskiptavin|áþreifanlegt|Fyrri|Vara|Miðun vara og flokka|Leita að vörum...|Vörur|vörur|Kynningar|Fjarlægja|Raðir á síðu|Vista afsláttarkóða|Tímasetning og mörk|Leita í flokkum eða undirflokkum|Leita að flokkum til útilokunar|Leita að kóða eða heiti|Leita að vörum eftir titli, slug eða UUID|Leita að vörum til útilokunar|Valið|þjónusta|Sýnir|Byrjar|Staða|Sumartilboð|Tegund|Notkun|Notkunarmörk|Gildi|Webshop|Bannað.|Afsláttarkóðar eru notaðir í afgreiðslu; óvirkir eða safnaðir kóðar vistast en er ekki hægt að innleysa.|Stilltu afsláttarkóða, afslátt, gjaldmiðil og afgreiðslureglur.|Veldu valfrjálsa dagsetningu og tíma fyrir gildistíma kóðans.|Fylltu út og athugaðu þennan reit afsláttarkóða.|Til að búa til afsláttarkóða þarf virkt Webshop-leyfi og að minnsta kosti eitt Webshop-efnisatriði.|Stilltu heildar- og viðskiptavinamörk notkunar.|Breyttu leit, stöðu eða verslunarsíu.|Takmarkaðu gjaldgengar vörur og flokka fyrir þennan afsláttarkóða.|{item} er þegar valið í {label}.",
} satisfies Record<LocalizedLanguage, string>;

function createTerms(language: LocalizedLanguage): PromotionTerms {
  const values = TERM_ROWS[language].split("|");
  if (values.length !== TERM_KEYS.length) {
    throw new Error(
      `Invalid webshop promotions translation row for ${language}: expected ${TERM_KEYS.length}, received ${values.length}.`,
    );
  }

  return Object.fromEntries(
    TERM_KEYS.map((key, index) => [key, values[index] ?? key]),
  ) as PromotionTerms;
}

function createMap(
  language: LocalizedLanguage,
): Record<WebshopPromotionsSource, string> {
  const t = createTerms(language);
  const couponUnit =
    t.couponLower === "coupon" ? lowerFirst(t.code) : t.couponLower;
  const couponPlural =
    t.coupons === "Coupons" ? `${t.promotions} ${t.couponsLower}` : t.coupons;
  const couponPluralUnit =
    t.couponsLower === "coupons" ? lowerFirst(couponPlural) : t.couponsLower;
  const editLabel = t.edit === "Edit" ? `${t.edit} ${t.couponLower}` : t.edit;
  const exclusionUnit =
    t.exclusion === "exclusion"
      ? `${t.couponLower} ${t.exclusion}`
      : t.exclusion;
  const exclusionsUnit =
    t.exclusions === "exclusions"
      ? `${t.couponLower} ${t.exclusions}`
      : t.exclusions;
  const pageUnit = t.pageLower === "page" ? "p." : t.pageLower;
  const webshopLabel =
    BACKEND_WEBSHOP_MENU_SOURCE_TRANSLATIONS[language].Webshop;
  const productType = (value: string) =>
    value === "digital" || value === "service"
      ? `${value} ${lowerFirst(t.product)}`
      : value;

  return {
    Actions: t.actions,
    Active: t.active,
    "Active coupons can be used at checkout. Inactive or archived coupons stay saved but cannot be redeemed.":
      t.genericCheckoutHelp,
    "Active dates": t.activeDates,
    "All eligible products": t.allEligibleProducts,
    "All shops": t.allShops,
    "All statuses": t.allStatuses,
    Always: t.always,
    "An active Webshop license and at least one Webshop content item are required to create coupons.":
      t.genericLicenseHelp,
    "An active Webshop license is required.": t.licenseRequiredShort,
    "Choose whether the coupon removes a percentage, a fixed amount, or shipping cost.":
      t.genericCouponHelp,
    "Choose which webshop owns this coupon. This is hidden when there is only one shop.":
      t.genericFieldHelp,
    Clear: t.clear,
    "Close help": t.closeHelp,
    Code: t.code,
    Conditions: avoidSame(
      t.conditions,
      "Conditions",
      `${t.conditions} ${t.couponLower}`,
    ),
    Coupon: t.coupon === "Coupon" ? t.code : t.coupon,
    "Coupon name": t.couponName,
    "Coupon not found": t.couponNotFound,
    "Coupon status": t.couponStatus,
    "Coupon was not found.": t.couponWasNotFound,
    Coupons: couponPlural,
    "Create a checkout coupon without leaving the promotions list.":
      t.genericCouponHelp,
    "Create a coupon to make it available during checkout.":
      t.genericCheckoutHelp,
    "Create coupon": t.createCoupon,
    Currency: t.currency,
    "Currency {currency}": `${t.currency} {currency}`,
    Discount: t.discount,
    "Discount amount. Percent coupons use 1-100; fixed amount coupons use normal currency units.":
      t.genericCouponHelp,
    Edit: editLabel,
    "Edit existing only": t.editExistingOnly,
    "Edit {code}": `${editLabel} {code}`,
    Ends: t.ends,
    "Exclude categories": t.excludeCategories,
    "Exclude products": t.excludeProducts,
    Filter: t.filter,
    Filters: avoidSame(t.filters, "Filters", `${t.promotions} ${t.filters}`),
    "Forbidden.": t.forbidden,
    "Free shipping": capitalizeFirst(t.freeShipping),
    Help: avoidSame(t.help, "Help", `${t.coupon} ${t.help}`),
    "Include categories": t.includeCategories,
    "Include products": t.includeProducts,
    "Internal display name for admins and summaries. Customers primarily use the code.":
      t.genericFieldHelp,
    "Invalid product search.": t.invalidProductSearch,
    "Limit where this coupon can apply. Leave all four lists empty to allow every eligible product. Include rules narrow the coupon to selected products or categories, and exclude rules remove products or categories from that eligible set.":
      t.genericTargetingHelp,
    "Maximum redemptions allowed for the same signed-in customer or email.":
      t.genericLimitHelp,
    "Maximum total number of successful redemptions across all customers.":
      t.genericLimitHelp,
    "Min {amount}": `${t.min} {amount}`,
    "Minimum cart subtotal before shipping and tax required before this coupon can be applied.":
      t.genericCouponHelp,
    "Minimum subtotal": t.minimumSubtotal,
    "New coupon": t.newCoupon,
    Next: t.next,
    "No categories found.": t.noCategoriesFound,
    "No coupons yet": t.noCouponsYet,
    "No end": t.noEnd,
    "No excluded categories.": t.noExcludedCategories,
    "No excluded products.": t.noExcludedProducts,
    "No included categories.": t.noIncludedCategories,
    "No included products.": t.noIncludedProducts,
    "No matching coupons": t.noMatchingCoupons,
    "No minimum": t.noMinimum,
    "No products found.": t.noProductsFound,
    Now: t.now,
    Optional: t.optional,
    "Optional 3-letter currency restriction, such as RSD. Leave empty to allow the cart currency.":
      t.genericFieldHelp,
    "Optional date and time when the coupon becomes available.":
      t.genericDateHelp,
    "Optional date and time when the coupon stops being valid.":
      t.genericDateHelp,
    "Page {page} of {pageCount}": `${t.page} {page} ${t.of} {pageCount}`,
    "Per customer": t.perCustomer,
    Previous: t.previous,
    "Product and category targeting": t.productCategoryTargeting,
    Promotions: t.promotions,
    Remove: t.remove,
    "Rows per page": t.rowsPerPage,
    "Save coupon": t.saveCoupon,
    "Schedule and limits": t.scheduleLimits,
    "Search categories or subcategories": t.searchCategories,
    "Search categories to exclude": t.searchCategoriesExclude,
    "Search code or name": t.searchCodeOrName,
    "Search products by title, slug, or UUID": t.searchProducts,
    "Search products to exclude": t.searchProductsExclude,
    "Searching products...": t.productSearchLoading,
    Selected: t.selected,
    "Showing {count} of {total}": `${t.showing} {count} ${t.of} {total}`,
    "Showing {start}-{end} of {total} coupons": `${t.showing} {start}-{end} ${t.of} {total} ${t.couponsLower}`,
    Starts: t.starts,
    Status: avoidSame(t.status, "Status", `${t.coupon} ${t.status}`),
    "Summer sale": t.summerSale,
    "The checkout code customers enter, for example SAVE10. Codes are stored uppercase.":
      t.genericFieldHelp,
    "Try changing the search, status, or webshop filter.": t.genericSearchHelp,
    Type: avoidSame(t.type, "Type", `${t.discount} ${t.type}`),
    "Update coupon settings and return to the current list view.":
      t.genericCouponHelp,
    Usage: t.usage,
    "Usage limit": t.usageLimit,
    "Use this to block exact products from receiving the coupon. Product exclusions win even if the product is covered by an included category.":
      t.genericTargetingHelp,
    "Use this to block products in selected categories from receiving the coupon. Category exclusions win over included products or categories.":
      t.genericTargetingHelp,
    "Use this to make products in selected categories eligible. A selected parent category also covers products assigned to its child categories.":
      t.genericTargetingHelp,
    "Use this when only specific products should get the coupon. Search for a product, then add it to make that product eligible.":
      t.genericTargetingHelp,
    Value: t.value,
    Webshop: webshopLabel,
    "{count} / page": `{count} / ${pageUnit}`,
    "{count} coupon": `{count} ${couponUnit}`,
    "{count} coupons": `{count} ${couponPluralUnit}`,
    "{count} exclusion": `{count} ${exclusionUnit}`,
    "{count} exclusions": `{count} ${exclusionsUnit}`,
    "{count} include rule": `{count} ${t.includeRule}`,
    "{count} include rules": `{count} ${t.includeRules}`,
    "{count} per customer": `{count} ${t.perCustomerLower}`,
    "{count} products": `{count} ${t.productsLower}`,
    "{item} is already selected in {label}.": t.alreadySelectedIn,
    active: t.activeLower,
    archived: t.archived,
    digital: productType(t.digital),
    draft: t.draft,
    "fixed amount": t.fixedAmount,
    "free shipping": t.freeShipping,
    inactive: t.inactive,
    paused: t.paused,
    percent: t.percent,
    physical: t.physical,
    service: productType(t.service),
  };
}

function capitalizeFirst(value: string) {
  return value ? value[0]?.toLocaleUpperCase() + value.slice(1) : value;
}

function lowerFirst(value: string) {
  return value ? value[0]?.toLocaleLowerCase() + value.slice(1) : value;
}

function avoidSame(value: string, source: string, replacement: string) {
  return value === source ? replacement : value;
}

export const WEBSHOP_PROMOTIONS_SOURCE_TRANSLATIONS = Object.fromEntries(
  LOCALIZED_LANGUAGES.map((language) => [language, createMap(language)]),
) as Record<LocalizedLanguage, Record<WebshopPromotionsSource, string>>;
