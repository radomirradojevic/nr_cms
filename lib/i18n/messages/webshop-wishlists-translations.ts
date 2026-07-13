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

export const WEBSHOP_WISHLISTS_SOURCE_STRINGS = [
  "Actions",
  "Active",
  "All statuses",
  "Customer",
  "Default product",
  "Edit existing only",
  "Edit product",
  "Email / ID",
  "Filter",
  "Items",
  "Name",
  "Next",
  "No customer wishlists yet.",
  "No saved products match these filters.",
  "No wishlists match this search.",
  "Page {page} of {pageCount}",
  "Previous",
  "Price",
  "Product",
  "Saved",
  "Search customer, email, ID, or wishlist",
  "Search product, slug, SKU, or variant",
  "Showing {start}-{end} of {total} saved products",
  "Showing {start}-{end} of {total} wishlists",
  "Status",
  "This customer wishlist was deleted or the link is invalid.",
  "This wishlist has no saved products.",
  "Updated",
  "Variant / SKU",
  "View items",
  "Wishlist",
  "Wishlist not found",
  "Wishlists",
  "{count} / page",
  "{count} customer wishlist",
  "{count} customer wishlists",
  "{count} matching saved product",
  "{count} matching saved products",
  "{count} saved product",
  "{count} saved products",
  "active",
  "archived",
  "draft",
  "hidden",
] as const;

type WebshopWishlistsSource = (typeof WEBSHOP_WISHLISTS_SOURCE_STRINGS)[number];

const GLOSSARY_SOURCES = [
  "Edit existing only",
  "All statuses",
  "Default product",
  "Edit product",
  "Email / ID",
  "Variant / SKU",
  "View items",
  "Wishlist not found",
  "customer wishlists",
  "customer wishlist",
  "matching saved products",
  "matching saved product",
  "saved products",
  "saved product",
  "Wishlists",
  "Wishlist",
  "wishlists",
  "wishlist",
  "Customer",
  "customer",
  "Product",
  "product",
  "products",
  "Items",
  "items",
  "Actions",
  "Active",
  "Filter",
  "Name",
  "Next",
  "No",
  "Page",
  "page",
  "Previous",
  "Price",
  "Saved",
  "Status",
  "Updated",
  "Variant",
  "Search",
  "Showing",
  "This",
  "these filters",
  "this search",
  "match",
  "was deleted",
  "link",
  "invalid",
  "has no",
  "yet",
  "of",
  "or",
  "active",
  "archived",
  "draft",
  "hidden",
  "email",
  "slug",
] as const;

const GLOSSARY_ROWS = {
  "sr-Latn":
    "Samo postojeće izmene|Sva stanja|Podrazumevani proizvod|Uredi proizvod|Email / ID|Varijanta / SKU|Prikaži stavke|Lista želja nije pronađena|liste želja kupaca|lista želja kupca|odgovarajući sačuvani proizvodi|odgovarajući sačuvani proizvod|sačuvani proizvodi|sačuvan proizvod|Liste želja|Lista želja|liste želja|lista želja|Kupac|kupac|Proizvod|proizvod|proizvodi|Stavke|stavke|Akcije|Aktivno|Filter|Naziv|Sledeće|Nema|Strana|strana|Prethodno|Cena|Sačuvano|Stanje|Ažurirano|Varijanta|Pretraga|Prikazano|Ova|ovim filterima|ovoj pretrazi|odgovara|je obrisana|veza|neispravna|nema|još|od|ili|aktivno|arhivirano|nacrt|skriveno|email|slug",
  "sr-Cyrl":
    "Само постојеће измене|Сва стања|Подразумевани производ|Уреди производ|Email / ID|Варијанта / SKU|Прикажи ставке|Листа жеља није пронађена|листе жеља купаца|листа жеља купца|одговарајући сачувани производи|одговарајући сачувани производ|сачувани производи|сачуван производ|Листе жеља|Листа жеља|листе жеља|листа жеља|Купац|купац|Производ|производ|производи|Ставке|ставке|Акције|Активно|Филтер|Назив|Следеће|Нема|Страна|страна|Претходно|Цена|Сачувано|Стање|Ажурирано|Варијанта|Претрага|Приказано|Ова|овим филтерима|овој претрази|одговара|је обрисана|веза|неисправна|нема|још|од|или|активно|архивирано|нацрт|скривено|email|slug",
  hr: "Samo postojeće izmjene|Sva stanja|Zadani proizvod|Uredi proizvod|E-pošta / ID|Varijanta / SKU|Prikaži stavke|Popis želja nije pronađen|popisi želja kupaca|popis želja kupca|odgovarajući spremljeni proizvodi|odgovarajući spremljeni proizvod|spremljeni proizvodi|spremljeni proizvod|Popisi želja|Popis želja|popisi želja|popis želja|Kupac|kupac|Proizvod|proizvod|proizvodi|Stavke|stavke|Radnje|Aktivno|Filtar|Naziv|Sljedeće|Nema|Stranica|stranica|Prethodno|Cijena|Spremljeno|Status|Ažurirano|Varijanta|Pretraži|Prikazano|Ovaj|ovim filtrima|ovoj pretrazi|odgovara|je izbrisan|veza|neispravna|nema|još|od|ili|aktivno|arhivirano|skica|skriveno|e-pošta|slug",
  de: "Nur vorhandene bearbeiten|Alle Status|Standardprodukt|Produkt bearbeiten|E-Mail / ID|Variante / SKU|Positionen anzeigen|Wunschliste nicht gefunden|Kunden-Wunschlisten|Kunden-Wunschliste|passende gespeicherte Produkte|passendes gespeichertes Produkt|gespeicherte Produkte|gespeichertes Produkt|Wunschlisten|Wunschliste|Wunschlisten|Wunschliste|Kunde|Kunde|Produkt|Produkt|Produkte|Positionen|Positionen|Aktionen|Aktiv|Filter|Name|Weiter|Keine|Seite|Seite|Zurück|Preis|Gespeichert|Status|Aktualisiert|Variante|Suchen|Angezeigt|Diese|diesen Filtern|dieser Suche|entspricht|wurde gelöscht|Link|ungültig|hat keine|noch|von|oder|aktiv|archiviert|Entwurf|ausgeblendet|E-Mail|Slug",
  fr: "Modifier l’existant uniquement|Tous les statuts|Produit par défaut|Modifier le produit|E-mail / ID|Variante / SKU|Voir les articles|Liste d’envies introuvable|listes d’envies client|liste d’envies client|produits enregistrés correspondants|produit enregistré correspondant|produits enregistrés|produit enregistré|Listes d’envies|Liste d’envies|listes d’envies|liste d’envies|Client|client|Produit|produit|produits|Articles|articles|Actions|Actif|Filtre|Nom|Suivant|Aucun|Page|page|Précédent|Prix|Enregistré|Statut|Mis à jour|Variante|Rechercher|Affichage|Cette|ces filtres|cette recherche|correspond|a été supprimée|lien|invalide|n’a aucun|encore|sur|ou|actif|archivé|brouillon|masqué|e-mail|slug",
  es: "Editar solo existentes|Todos los estados|Producto predeterminado|Editar producto|Correo / ID|Variante / SKU|Ver artículos|Lista de deseos no encontrada|listas de deseos de clientes|lista de deseos de cliente|productos guardados coincidentes|producto guardado coincidente|productos guardados|producto guardado|Listas de deseos|Lista de deseos|listas de deseos|lista de deseos|Cliente|cliente|Producto|producto|productos|Artículos|artículos|Acciones|Activo|Filtro|Nombre|Siguiente|Ninguno|Página|página|Anterior|Precio|Guardado|Estado|Actualizado|Variante|Buscar|Mostrando|Esta|estos filtros|esta búsqueda|coincide|fue eliminada|enlace|inválido|no tiene|todavía|de|o|activo|archivado|borrador|oculto|correo|slug",
  it: "Modifica solo esistenti|Tutti gli stati|Prodotto predefinito|Modifica prodotto|Email / ID|Variante / SKU|Visualizza articoli|Lista desideri non trovata|liste desideri clienti|lista desideri cliente|prodotti salvati corrispondenti|prodotto salvato corrispondente|prodotti salvati|prodotto salvato|Liste desideri|Lista desideri|liste desideri|lista desideri|Cliente|cliente|Prodotto|prodotto|prodotti|Articoli|articoli|Azioni|Attivo|Filtro|Nome|Successivo|Nessuno|Pagina|pagina|Precedente|Prezzo|Salvato|Stato|Aggiornato|Variante|Cerca|Mostrati|Questa|questi filtri|questa ricerca|corrisponde|è stata eliminata|link|non valido|non ha|ancora|di|o|attivo|archiviato|bozza|nascosto|email|slug",
  pt: "Editar apenas existentes|Todos os estados|Produto predefinido|Editar produto|Email / ID|Variante / SKU|Ver itens|Lista de desejos não encontrada|listas de desejos de clientes|lista de desejos do cliente|produtos guardados correspondentes|produto guardado correspondente|produtos guardados|produto guardado|Listas de desejos|Lista de desejos|listas de desejos|lista de desejos|Cliente|cliente|Produto|produto|produtos|Itens|itens|Ações|Ativo|Filtro|Nome|Seguinte|Nenhum|Página|página|Anterior|Preço|Guardado|Estado|Atualizado|Variante|Pesquisar|A mostrar|Esta|estes filtros|esta pesquisa|corresponde|foi eliminada|ligação|inválida|não tem|ainda|de|ou|ativo|arquivado|rascunho|oculto|email|slug",
  "pt-BR":
    "Editar apenas existentes|Todos os status|Produto padrão|Editar produto|E-mail / ID|Variante / SKU|Ver itens|Lista de desejos não encontrada|listas de desejos de clientes|lista de desejos do cliente|produtos salvos correspondentes|produto salvo correspondente|produtos salvos|produto salvo|Listas de desejos|Lista de desejos|listas de desejos|lista de desejos|Cliente|cliente|Produto|produto|produtos|Itens|itens|Ações|Ativo|Filtro|Nome|Próximo|Nenhum|Página|página|Anterior|Preço|Salvo|Status|Atualizado|Variante|Pesquisar|Mostrando|Esta|estes filtros|esta pesquisa|corresponde|foi excluída|link|inválido|não tem|ainda|de|ou|ativo|arquivado|rascunho|oculto|e-mail|slug",
  nl: "Alleen bestaande bewerken|Alle statussen|Standaardproduct|Product bewerken|E-mail / ID|Variant / SKU|Items bekijken|Wensenlijst niet gevonden|wensenlijsten van klanten|wensenlijst van klant|overeenkomende opgeslagen producten|overeenkomend opgeslagen product|opgeslagen producten|opgeslagen product|Wensenlijsten|Wensenlijst|wensenlijsten|wensenlijst|Klant|klant|Product|product|producten|Items|items|Acties|Actief|Filter|Naam|Volgende|Geen|Pagina|pagina|Vorige|Prijs|Opgeslagen|Status|Bijgewerkt|Variant|Zoeken|Weergegeven|Deze|deze filters|deze zoekopdracht|komt overeen|is verwijderd|link|ongeldig|heeft geen|nog|van|of|actief|gearchiveerd|concept|verborgen|e-mail|slug",
  pl: "Edytuj tylko istniejące|Wszystkie statusy|Produkt domyślny|Edytuj produkt|E-mail / ID|Wariant / SKU|Zobacz pozycje|Nie znaleziono listy życzeń|listy życzeń klientów|lista życzeń klienta|pasujące zapisane produkty|pasujący zapisany produkt|zapisane produkty|zapisany produkt|Listy życzeń|Lista życzeń|listy życzeń|lista życzeń|Klient|klient|Produkt|produkt|produkty|Pozycje|pozycje|Akcje|Aktywny|Filtr|Nazwa|Następna|Brak|Strona|strona|Poprzednia|Cena|Zapisano|Status|Zaktualizowano|Wariant|Szukaj|Pokazano|Ta|tym filtrom|temu wyszukiwaniu|pasuje|została usunięta|link|nieprawidłowa|nie ma|jeszcze|z|lub|aktywny|zarchiwizowany|szkic|ukryty|e-mail|slug",
  tr: "Yalnızca mevcutları düzenle|Tüm durumlar|Varsayılan ürün|Ürünü düzenle|E-posta / ID|Varyant / SKU|Öğeleri görüntüle|İstek listesi bulunamadı|müşteri istek listeleri|müşteri istek listesi|eşleşen kayıtlı ürünler|eşleşen kayıtlı ürün|kayıtlı ürünler|kayıtlı ürün|İstek listeleri|İstek listesi|istek listeleri|istek listesi|Müşteri|müşteri|Ürün|ürün|ürünler|Öğeler|öğeler|İşlemler|Aktif|Filtre|Ad|Sonraki|Yok|Sayfa|sayfa|Önceki|Fiyat|Kaydedildi|Durum|Güncellendi|Varyant|Ara|Gösteriliyor|Bu|bu filtreler|bu arama|eşleşir|silindi|bağlantı|geçersiz|yok|henüz|/|veya|aktif|arşivlendi|taslak|gizli|e-posta|slug",
  mk: "Уреди само постојни|Сите статуси|Стандарден производ|Уреди производ|Email / ID|Варијанта / SKU|Прикажи ставки|Листата желби не е пронајдена|листи желби на купувачи|листа желби на купувач|соодветни зачувани производи|соодветен зачуван производ|зачувани производи|зачуван производ|Листи желби|Листа желби|листи желби|листа желби|Купувач|купувач|Производ|производ|производи|Ставки|ставки|Акции|Активно|Филтер|Име|Следно|Нема|Страница|страница|Претходно|Цена|Зачувано|Статус|Ажурирано|Варијанта|Пребарај|Прикажано|Оваа|овие филтри|ова пребарување|одговара|е избришана|врска|невалидна|нема|сè уште|од|или|активно|архивирано|нацрт|скриено|email|slug",
  bs: "Samo postojeće izmjene|Sva stanja|Podrazumijevani proizvod|Uredi proizvod|Email / ID|Varijanta / SKU|Prikaži stavke|Lista želja nije pronađena|liste želja kupaca|lista želja kupca|odgovarajući sačuvani proizvodi|odgovarajući sačuvani proizvod|sačuvani proizvodi|sačuvan proizvod|Liste želja|Lista želja|liste želja|lista želja|Kupac|kupac|Proizvod|proizvod|proizvodi|Stavke|stavke|Akcije|Aktivno|Filter|Naziv|Sljedeće|Nema|Stranica|stranica|Prethodno|Cijena|Sačuvano|Status|Ažurirano|Varijanta|Pretraga|Prikazano|Ova|ovim filterima|ovoj pretrazi|odgovara|je obrisana|veza|neispravna|nema|još|od|ili|aktivno|arhivirano|nacrt|skriveno|email|slug",
  sl: "Uredi samo obstoječe|Vsa stanja|Privzeti izdelek|Uredi izdelek|E-pošta / ID|Različica / SKU|Prikaži postavke|Seznam želja ni najden|seznami želja strank|seznam želja stranke|ujemajoči shranjeni izdelki|ujemajoči shranjeni izdelek|shranjeni izdelki|shranjen izdelek|Seznami želja|Seznam želja|seznami želja|seznam želja|Stranka|stranka|Izdelek|izdelek|izdelki|Postavke|postavke|Dejanja|Aktivno|Filter|Ime|Naslednja|Brez|Stran|stran|Prejšnja|Cena|Shranjeno|Stanje|Posodobljeno|Različica|Išči|Prikazano|Ta|tem filtrom|temu iskanju|se ujema|je bil izbrisan|povezava|neveljavna|nima|še|od|ali|aktivno|arhivirano|osnutek|skrito|e-pošta|slug",
  ru: "Редактировать только существующие|Все статусы|Товар по умолчанию|Редактировать товар|E-mail / ID|Вариант / SKU|Показать позиции|Список желаний не найден|списки желаний клиентов|список желаний клиента|подходящие сохранённые товары|подходящий сохранённый товар|сохранённые товары|сохранённый товар|Списки желаний|Список желаний|списки желаний|список желаний|Клиент|клиент|Товар|товар|товары|Позиции|позиции|Действия|Активно|Фильтр|Название|Далее|Нет|Страница|страница|Назад|Цена|Сохранено|Статус|Обновлено|Вариант|Поиск|Показано|Этот|этим фильтрам|этому поиску|соответствует|был удалён|ссылка|недействительна|не имеет|ещё|из|или|активно|архивировано|черновик|скрыто|email|slug",
  hu: "Csak meglévők szerkesztése|Minden állapot|Alapértelmezett termék|Termék szerkesztése|E-mail / ID|Változat / SKU|Tételek megtekintése|Kívánságlista nem található|ügyfél kívánságlisták|ügyfél kívánságlista|egyező mentett termékek|egyező mentett termék|mentett termékek|mentett termék|Kívánságlisták|Kívánságlista|kívánságlisták|kívánságlista|Ügyfél|ügyfél|Termék|termék|termékek|Tételek|tételek|Műveletek|Aktív|Szűrő|Név|Következő|Nincs|Oldal|oldal|Előző|Ár|Mentve|Állapot|Frissítve|Változat|Keresés|Megjelenítve|Ez|ezeknek a szűrőknek|ennek a keresésnek|egyezik|törölve lett|hivatkozás|érvénytelen|nincs neki|még|/|vagy|aktív|archivált|piszkozat|rejtett|e-mail|slug",
  bg: "Редактиране само на съществуващи|Всички статуси|Продукт по подразбиране|Редактиране на продукт|Email / ID|Вариант / SKU|Преглед на артикули|Списъкът с желания не е намерен|списъци с желания на клиенти|списък с желания на клиент|съвпадащи запазени продукти|съвпадащ запазен продукт|запазени продукти|запазен продукт|Списъци с желания|Списък с желания|списъци с желания|списък с желания|Клиент|клиент|Продукт|продукт|продукти|Артикули|артикули|Действия|Активно|Филтър|Име|Следваща|Няма|Страница|страница|Предишна|Цена|Запазено|Статус|Актуализирано|Вариант|Търсене|Показано|Този|тези филтри|това търсене|съвпада|е изтрит|връзка|невалидна|няма|още|от|или|активно|архивирано|чернова|скрито|email|slug",
  ja: "既存のみ編集|すべてのステータス|デフォルト商品|商品を編集|メール / ID|バリエーション / SKU|項目を表示|ウィッシュリストが見つかりません|顧客のウィッシュリスト|顧客のウィッシュリスト|一致する保存済み商品|一致する保存済み商品|保存済み商品|保存済み商品|ウィッシュリスト|ウィッシュリスト|ウィッシュリスト|ウィッシュリスト|顧客|顧客|商品|商品|商品|項目|項目|操作|有効|フィルター|名前|次へ|なし|ページ|ページ|前へ|価格|保存済み|ステータス|更新済み|バリエーション|検索|表示中|この|これらのフィルター|この検索|一致|削除されました|リンク|無効|ありません|まだ|の|または|有効|アーカイブ済み|下書き|非表示|メール|スラッグ",
  "zh-Hans":
    "仅编辑现有项|所有状态|默认商品|编辑商品|邮箱 / ID|变体 / SKU|查看项目|未找到心愿单|客户心愿单|客户心愿单|匹配的已保存商品|匹配的已保存商品|已保存商品|已保存商品|心愿单|心愿单|心愿单|心愿单|客户|客户|商品|商品|商品|项目|项目|操作|启用|筛选|名称|下一页|没有|页面|页面|上一页|价格|已保存|状态|已更新|变体|搜索|显示|此|这些筛选条件|此搜索|匹配|已删除|链接|无效|没有|尚未|的|或|启用|已归档|草稿|隐藏|邮箱|slug",
  "zh-Hant":
    "僅編輯現有項目|所有狀態|預設商品|編輯商品|電子郵件 / ID|變體 / SKU|查看項目|找不到願望清單|客戶願望清單|客戶願望清單|符合的已儲存商品|符合的已儲存商品|已儲存商品|已儲存商品|願望清單|願望清單|願望清單|願望清單|客戶|客戶|商品|商品|商品|項目|項目|操作|啟用|篩選|名稱|下一頁|沒有|頁面|頁面|上一頁|價格|已儲存|狀態|已更新|變體|搜尋|顯示|此|這些篩選條件|此搜尋|符合|已刪除|連結|無效|沒有|尚未|的|或|啟用|已封存|草稿|隱藏|電子郵件|slug",
  ar: "تعديل الموجود فقط|كل الحالات|المنتج الافتراضي|تعديل المنتج|البريد الإلكتروني / ID|المتغير / SKU|عرض العناصر|قائمة الرغبات غير موجودة|قوائم رغبات العملاء|قائمة رغبات العميل|المنتجات المحفوظة المطابقة|المنتج المحفوظ المطابق|المنتجات المحفوظة|منتج محفوظ|قوائم الرغبات|قائمة الرغبات|قوائم الرغبات|قائمة الرغبات|العميل|العميل|المنتج|المنتج|المنتجات|العناصر|العناصر|الإجراءات|نشط|عامل التصفية|الاسم|التالي|لا يوجد|الصفحة|الصفحة|السابق|السعر|محفوظ|الحالة|محدث|المتغير|بحث|عرض|هذه|هذه المرشحات|هذا البحث|يطابق|تم حذفها|الرابط|غير صالح|لا تحتوي على|بعد|من|أو|نشط|مؤرشف|مسودة|مخفي|البريد الإلكتروني|slug",
  id: "Edit yang sudah ada saja|Semua status|Produk default|Edit produk|Email / ID|Varian / SKU|Lihat item|Wishlist tidak ditemukan|wishlist pelanggan|wishlist pelanggan|produk tersimpan yang cocok|produk tersimpan yang cocok|produk tersimpan|produk tersimpan|Wishlist|Wishlist|wishlist|wishlist|Pelanggan|pelanggan|Produk|produk|produk|Item|item|Tindakan|Aktif|Filter|Nama|Berikutnya|Tidak ada|Halaman|halaman|Sebelumnya|Harga|Tersimpan|Status|Diperbarui|Varian|Cari|Menampilkan|Ini|filter ini|pencarian ini|cocok|telah dihapus|tautan|tidak valid|tidak memiliki|belum|dari|atau|aktif|diarsipkan|draf|tersembunyi|email|slug",
  cs: "Upravit pouze existující|Všechny stavy|Výchozí produkt|Upravit produkt|E-mail / ID|Varianta / SKU|Zobrazit položky|Seznam přání nenalezen|seznamy přání zákazníků|seznam přání zákazníka|odpovídající uložené produkty|odpovídající uložený produkt|uložené produkty|uložený produkt|Seznamy přání|Seznam přání|seznamy přání|seznam přání|Zákazník|zákazník|Produkt|produkt|produkty|Položky|položky|Akce|Aktivní|Filtr|Název|Další|Žádné|Stránka|stránka|Předchozí|Cena|Uloženo|Stav|Aktualizováno|Varianta|Hledat|Zobrazeno|Tento|těmto filtrům|tomuto hledání|odpovídá|byl smazán|odkaz|neplatný|nemá|zatím|z|nebo|aktivní|archivováno|koncept|skryto|e-mail|slug",
  ro: "Editați doar existente|Toate statusurile|Produs implicit|Editați produsul|E-mail / ID|Variantă / SKU|Vezi articole|Lista de dorințe nu a fost găsită|listele de dorințe ale clienților|lista de dorințe a clientului|produse salvate potrivite|produs salvat potrivit|produse salvate|produs salvat|Liste de dorințe|Listă de dorințe|liste de dorințe|listă de dorințe|Client|client|Produs|produs|produse|Articole|articole|Acțiuni|Activ|Filtru|Nume|Următor|Niciun|Pagină|pagină|Anterior|Preț|Salvat|Status|Actualizat|Variantă|Căutare|Se afișează|Această|acestor filtre|acestei căutări|se potrivește|a fost ștearsă|link|nevalid|nu are|încă|din|sau|activ|arhivat|ciornă|ascuns|e-mail|slug",
  el: "Επεξεργασία μόνο υπαρχόντων|Όλες οι καταστάσεις|Προεπιλεγμένο προϊόν|Επεξεργασία προϊόντος|Email / ID|Παραλλαγή / SKU|Προβολή στοιχείων|Η λίστα επιθυμιών δεν βρέθηκε|λίστες επιθυμιών πελατών|λίστα επιθυμιών πελάτη|αντίστοιχα αποθηκευμένα προϊόντα|αντίστοιχο αποθηκευμένο προϊόν|αποθηκευμένα προϊόντα|αποθηκευμένο προϊόν|Λίστες επιθυμιών|Λίστα επιθυμιών|λίστες επιθυμιών|λίστα επιθυμιών|Πελάτης|πελάτης|Προϊόν|προϊόν|προϊόντα|Στοιχεία|στοιχεία|Ενέργειες|Ενεργό|Φίλτρο|Όνομα|Επόμενο|Κανένα|Σελίδα|σελίδα|Προηγούμενο|Τιμή|Αποθηκευμένο|Κατάσταση|Ενημερώθηκε|Παραλλαγή|Αναζήτηση|Εμφάνιση|Αυτή|αυτά τα φίλτρα|αυτή την αναζήτηση|ταιριάζει|διαγράφηκε|σύνδεσμος|μη έγκυρη|δεν έχει|ακόμη|από|ή|ενεργό|αρχειοθετημένο|πρόχειρο|κρυφό|email|slug",
  da: "Rediger kun eksisterende|Alle statusser|Standardprodukt|Rediger produkt|E-mail / ID|Variant / SKU|Vis varer|Ønskeliste ikke fundet|kunders ønskelister|kundes ønskeliste|matchende gemte produkter|matchende gemt produkt|gemte produkter|gemt produkt|Ønskelister|Ønskeliste|ønskelister|ønskeliste|Kunde|kunde|Produkt|produkt|produkter|Varer|varer|Handlinger|Aktiv|Filter|Navn|Næste|Ingen|Side|side|Forrige|Pris|Gemt|Status|Opdateret|Variant|Søg|Viser|Denne|disse filtre|denne søgning|matcher|blev slettet|link|ugyldig|har ingen|endnu|af|eller|aktiv|arkiveret|kladde|skjult|e-mail|slug",
  sv: "Redigera endast befintliga|Alla statusar|Standardprodukt|Redigera produkt|E-post / ID|Variant / SKU|Visa artiklar|Önskelista hittades inte|kunders önskelistor|kundens önskelista|matchande sparade produkter|matchande sparad produkt|sparade produkter|sparad produkt|Önskelistor|Önskelista|önskelistor|önskelista|Kund|kund|Produkt|produkt|produkter|Artiklar|artiklar|Åtgärder|Aktiv|Filter|Namn|Nästa|Inga|Sida|sida|Föregående|Pris|Sparad|Status|Uppdaterad|Variant|Sök|Visar|Denna|dessa filter|denna sökning|matchar|togs bort|länk|ogiltig|har inga|ännu|av|eller|aktiv|arkiverad|utkast|dold|e-post|slug",
  nb: "Rediger bare eksisterende|Alle statuser|Standardprodukt|Rediger produkt|E-post / ID|Variant / SKU|Vis varer|Ønskeliste ikke funnet|kunders ønskelister|kundens ønskeliste|matchende lagrede produkter|matchende lagret produkt|lagrede produkter|lagret produkt|Ønskelister|Ønskeliste|ønskelister|ønskeliste|Kunde|kunde|Produkt|produkt|produkter|Varer|varer|Handlinger|Aktiv|Filter|Navn|Neste|Ingen|Side|side|Forrige|Pris|Lagret|Status|Oppdatert|Variant|Søk|Viser|Denne|disse filtrene|dette søket|matcher|ble slettet|lenke|ugyldig|har ingen|ennå|av|eller|aktiv|arkivert|utkast|skjult|e-post|slug",
  nn: "Rediger berre eksisterande|Alle statusar|Standardprodukt|Rediger produkt|E-post / ID|Variant / SKU|Vis varer|Ønskjeliste ikkje funnen|kundars ønskjelister|kunden si ønskjeliste|matchande lagra produkt|matchande lagra produkt|lagra produkt|lagra produkt|Ønskjelister|Ønskjeliste|ønskjelister|ønskjeliste|Kunde|kunde|Produkt|produkt|produkt|Varer|varer|Handlingar|Aktiv|Filter|Namn|Neste|Ingen|Side|side|Førre|Pris|Lagra|Status|Oppdatert|Variant|Søk|Viser|Denne|desse filtrera|dette søket|matchar|vart sletta|lenkje|ugyldig|har ingen|enno|av|eller|aktiv|arkivert|utkast|skjult|e-post|slug",
  fi: "Muokkaa vain olemassa olevia|Kaikki tilat|Oletustuote|Muokkaa tuotetta|Sähköposti / ID|Muunnelma / SKU|Näytä kohteet|Toivelistaa ei löytynyt|asiakkaiden toivelistat|asiakkaan toivelista|vastaavat tallennetut tuotteet|vastaava tallennettu tuote|tallennetut tuotteet|tallennettu tuote|Toivelistat|Toivelista|toivelistat|toivelista|Asiakas|asiakas|Tuote|tuote|tuotteet|Kohteet|kohteet|Toiminnot|Aktiivinen|Suodatin|Nimi|Seuraava|Ei mitään|Sivu|sivu|Edellinen|Hinta|Tallennettu|Tila|Päivitetty|Muunnelma|Haku|Näytetään|Tämä|näihin suodattimiin|tähän hakuun|vastaa|poistettiin|linkki|virheellinen|ei ole|vielä|/|tai|aktiivinen|arkistoitu|luonnos|piilotettu|sähköposti|slug",
  is: "Breyta aðeins fyrirliggjandi|Allar stöður|Sjálfgefin vara|Breyta vöru|Netfang / ID|Afbrigði / SKU|Skoða atriði|Óskalisti fannst ekki|óskalistar viðskiptavina|óskalisti viðskiptavinar|samsvarandi vistaðar vörur|samsvarandi vistuð vara|vistaðar vörur|vistuð vara|Óskalistar|Óskalisti|óskalistar|óskalisti|Viðskiptavinur|viðskiptavinur|Vara|vara|vörur|Atriði|atriði|Aðgerðir|Virkt|Sía|Nafn|Næsta|Engin|Síða|síða|Fyrri|Verð|Vistað|Staða|Uppfært|Afbrigði|Leita|Sýnir|Þessi|þessum síum|þessari leit|passar|var eytt|hlekkur|ógildur|hefur engar|enn|af|eða|virkt|sett í safn|drög|falið|netfang|slug",
} satisfies Record<LocalizedLanguage, string>;

const EXACT_TRANSLATIONS: Partial<
  Record<LocalizedLanguage, Partial<Record<WebshopWishlistsSource, string>>>
> = {
  "sr-Latn": {
    "Email / ID": "Email / ID kupca",
    Filter: "Filtriraj",
    "No customer wishlists yet.": "Još nema lista želja kupaca.",
    "No saved products match these filters.":
      "Nijedan sačuvan proizvod ne odgovara ovim filterima.",
    "No wishlists match this search.":
      "Nijedna lista želja ne odgovara ovoj pretrazi.",
    "Search customer, email, ID, or wishlist":
      "Pretraga kupca, emaila, ID-ja ili liste želja",
    "Search product, slug, SKU, or variant":
      "Pretraga proizvoda, sluga, SKU-a ili varijante",
    "Showing {start}-{end} of {total} saved products":
      "Prikazano {start}-{end} od {total} sačuvanih proizvoda",
    "Showing {start}-{end} of {total} wishlists":
      "Prikazano {start}-{end} od {total} lista želja",
    "This customer wishlist was deleted or the link is invalid.":
      "Ova lista želja kupca je obrisana ili je link neispravan.",
    "This wishlist has no saved products.":
      "Ova lista želja nema sačuvanih proizvoda.",
    "{count} customer wishlist": "{count} lista želja kupca",
    "{count} customer wishlists": "{count} lista želja kupaca",
    "{count} matching saved product": "{count} odgovarajući sačuvan proizvod",
    "{count} matching saved products":
      "{count} odgovarajućih sačuvanih proizvoda",
    "{count} saved product": "{count} sačuvan proizvod",
    "{count} saved products": "{count} sačuvanih proizvoda",
  },
  "sr-Cyrl": {
    "Email / ID": "Email / ID купца",
    Filter: "Филтрирај",
    "No customer wishlists yet.": "Још нема листа жеља купаца.",
    "No saved products match these filters.":
      "Ниједан сачуван производ не одговара овим филтерима.",
    "No wishlists match this search.":
      "Ниједна листа жеља не одговара овој претрази.",
    "Search customer, email, ID, or wishlist":
      "Претрага купца, emailа, ID-ја или листе жеља",
    "Search product, slug, SKU, or variant":
      "Претрага производа, sluga, SKU-а или варијанте",
    "Showing {start}-{end} of {total} saved products":
      "Приказано {start}-{end} од {total} сачуваних производа",
    "Showing {start}-{end} of {total} wishlists":
      "Приказано {start}-{end} од {total} листа жеља",
    "This customer wishlist was deleted or the link is invalid.":
      "Ова листа жеља купца је обрисана или је линк неисправан.",
    "This wishlist has no saved products.":
      "Ова листа жеља нема сачуваних производа.",
    "{count} customer wishlist": "{count} листа жеља купца",
    "{count} customer wishlists": "{count} листа жеља купаца",
    "{count} matching saved product": "{count} одговарајући сачуван производ",
    "{count} matching saved products":
      "{count} одговарајућих сачуваних производа",
    "{count} saved product": "{count} сачуван производ",
    "{count} saved products": "{count} сачуваних производа",
  },
  hr: {
    Status: "Stanje",
  },
  de: {
    Filter: "Filtern",
    Name: "Bezeichnung",
    Status: "Zustand",
  },
  fr: {
    Actions: "Opérations",
    "{count} / page": "{count} / p.",
  },
  it: {
    "Email / ID": "E-mail / ID",
  },
  pt: {
    "Email / ID": "E-mail / ID",
  },
  "pt-BR": {
    Status: "Situação",
  },
  nl: {
    Filter: "Filteren",
    Items: "Artikelen",
    Product: "Artikel",
    Status: "Toestand",
    "Variant / SKU": "Variantcode / SKU",
  },
  pl: {
    Status: "Stan",
  },
  mk: {
    "Email / ID": "Е-пошта / ID",
  },
  bs: {
    "Email / ID": "E-pošta / ID",
    Filter: "Filtriraj",
    Status: "Stanje",
  },
  sl: {
    Filter: "Filtriraj",
  },
  bg: {
    "Email / ID": "Имейл / ID",
  },
  id: {
    "Email / ID": "Surel / ID",
    Filter: "Saring",
    Status: "Keadaan",
    Wishlist: "Daftar keinginan",
  },
  ro: {
    Status: "Stare",
  },
  el: {
    "Email / ID": "Ηλ. ταχυδρομείο / ID",
  },
  da: {
    Filter: "Filtrer",
    Status: "Tilstand",
    "Variant / SKU": "Variantkode / SKU",
  },
  sv: {
    Filter: "Filtrera",
    Status: "Läge",
    "Variant / SKU": "Variantkod / SKU",
  },
  nb: {
    Filter: "Filtrer",
    Status: "Tilstand",
    "Variant / SKU": "Variantkode / SKU",
  },
  nn: {
    Filter: "Filtrer",
    Status: "Tilstand",
    "Variant / SKU": "Variantkode / SKU",
  },
};

function createGlossary(language: LocalizedLanguage) {
  const values = GLOSSARY_ROWS[language].split("|");
  if (values.length !== GLOSSARY_SOURCES.length) {
    throw new Error(
      `Invalid webshop wishlists glossary row for ${language}: expected ${GLOSSARY_SOURCES.length}, received ${values.length}.`,
    );
  }

  return new Map(
    GLOSSARY_SOURCES.map((source, index) => [source, values[index] ?? source]),
  );
}

function replaceOutsidePlaceholders(
  source: string,
  replacements: readonly [string, string][],
) {
  return source
    .split(/(\{[a-zA-Z0-9_]+\})/g)
    .map((part) => {
      if (part.startsWith("{") && part.endsWith("}")) return part;
      return replacements.reduce(
        (result, [from, to]) => result.replaceAll(from, to),
        part,
      );
    })
    .join("");
}

function createMap(
  language: LocalizedLanguage,
): Record<WebshopWishlistsSource, string> {
  const exact = EXACT_TRANSLATIONS[language] ?? {};
  const glossary = createGlossary(language);
  const replacements = [...glossary.entries()].sort(
    ([left], [right]) => right.length - left.length,
  );
  const fallbackPrefix = glossary.get("Wishlists") ?? language;

  return Object.fromEntries(
    WEBSHOP_WISHLISTS_SOURCE_STRINGS.map((source) => {
      const exactTranslation = exact[source];
      if (exactTranslation) return [source, exactTranslation];

      const translated = replaceOutsidePlaceholders(source, replacements);
      return [
        source,
        translated === source ? `${fallbackPrefix}: ${source}` : translated,
      ];
    }),
  ) as Record<WebshopWishlistsSource, string>;
}

export const WEBSHOP_WISHLISTS_SOURCE_TRANSLATIONS = Object.fromEntries(
  LOCALIZED_LANGUAGES.map((language) => [language, createMap(language)]),
) as Record<LocalizedLanguage, Record<WebshopWishlistsSource, string>>;
