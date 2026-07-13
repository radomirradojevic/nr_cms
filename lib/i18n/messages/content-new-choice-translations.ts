import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export const CONTENT_NEW_CHOICE_SOURCE_STRINGS = [
  "License server",
  "Set up the paid commerce add-on and CMS shell. Sell physical, digital, and service products in an easy way.",
  "Activate the paid licensing add-on for digital products. Automatically generate and validate license keys for customer purchases.",
] as const;

type ContentNewChoiceSource =
  (typeof CONTENT_NEW_CHOICE_SOURCE_STRINGS)[number];

const ROWS = {
  "sr-Latn":
    "Server licenci|Podesi plaćeni dodatak za trgovinu i CMS omotač. Prodaj fizičke, digitalne i uslužne proizvode na jednostavan način.|Aktiviraj plaćeni dodatak za licenciranje digitalnih proizvoda. Automatski generiši i validiraj licencne ključeve za kupovine kupaca.",
  "sr-Cyrl":
    "Сервер лиценци|Подеси плаћени додатак за трговину и CMS омотач. Продај физичке, дигиталне и услужне производе на једноставан начин.|Активирај плаћени додатак за лиценцирање дигиталних производа. Аутоматски генериши и валидирај лиценцне кључеве за куповине купаца.",
  hr: "Licencni poslužitelj|Postavite plaćeni dodatak za trgovinu i CMS omotač. Prodajte fizičke, digitalne i uslužne proizvode na jednostavan način.|Aktivirajte plaćeni dodatak za licenciranje digitalnih proizvoda. Automatski generirajte i provjeravajte licencne ključeve za kupnje kupaca.",
  de: "Lizenzserver|Richte das kostenpflichtige Commerce-Add-on und die CMS-Shell ein. Verkaufe physische, digitale und Service-Produkte auf einfache Weise.|Aktiviere das kostenpflichtige Lizenzierungs-Add-on für digitale Produkte. Generiere und validiere Lizenzschlüssel für Kundenkäufe automatisch.",
  fr: "Serveur de licences|Configurez le module de commerce payant et l'enveloppe CMS. Vendez facilement des produits physiques, numériques et de service.|Activez le module de licences payant pour les produits numériques. Générez et validez automatiquement les clés de licence pour les achats clients.",
  es: "Servidor de licencias|Configura el complemento de comercio de pago y la shell del CMS. Vende productos físicos, digitales y de servicio de forma sencilla.|Activa el complemento de licencias de pago para productos digitales. Genera y valida automáticamente claves de licencia para las compras de clientes.",
  it: "Server licenze|Configura il componente aggiuntivo commerce a pagamento e la shell CMS. Vendi facilmente prodotti fisici, digitali e di servizio.|Attiva il componente aggiuntivo di licenze a pagamento per prodotti digitali. Genera e convalida automaticamente le chiavi di licenza per gli acquisti dei clienti.",
  pt: "Servidor de licenças|Configure o complemento pago de comércio e a shell CMS. Venda produtos físicos, digitais e de serviços de forma simples.|Ative o complemento pago de licenciamento para produtos digitais. Gere e valide automaticamente chaves de licença para compras de clientes.",
  "pt-BR":
    "Servidor de licenças|Configure o complemento pago de comércio e a shell do CMS. Venda produtos físicos, digitais e de serviço com facilidade.|Ative o complemento pago de licenciamento para produtos digitais. Gere e valide automaticamente chaves de licença para compras de clientes.",
  nl: "Licentieserver|Stel de betaalde commerce-add-on en CMS-shell in. Verkoop fysieke, digitale en serviceproducten op een eenvoudige manier.|Activeer de betaalde licentie-add-on voor digitale producten. Genereer en valideer automatisch licentiesleutels voor klantaankopen.",
  pl: "Serwer licencji|Skonfiguruj płatny dodatek handlowy i powłokę CMS. Sprzedawaj produkty fizyczne, cyfrowe i usługowe w prosty sposób.|Aktywuj płatny dodatek licencjonowania dla produktów cyfrowych. Automatycznie generuj i weryfikuj klucze licencyjne dla zakupów klientów.",
  tr: "Lisans sunucusu|Ücretli ticaret eklentisini ve CMS kabuğunu kurun. Fiziksel, dijital ve hizmet ürünlerini kolayca satın.|Dijital ürünler için ücretli lisanslama eklentisini etkinleştirin. Müşteri satın alımları için lisans anahtarlarını otomatik olarak oluşturun ve doğrulayın.",
  mk: "Сервер за лиценци|Поставете го платениот додаток за трговија и CMS обвивката. Продавајте физички, дигитални и услужни производи на лесен начин.|Активирајте го платениот додаток за лиценцирање дигитални производи. Автоматски генерирајте и валидирајте лиценцни клучеви за купувања на клиенти.",
  bs: "Server licenci|Postavite plaćeni dodatak za trgovinu i CMS omotač. Prodajte fizičke, digitalne i uslužne proizvode na jednostavan način.|Aktivirajte plaćeni dodatak za licenciranje digitalnih proizvoda. Automatski generišite i validirajte licencne ključeve za kupovine kupaca.",
  sl: "Licencni strežnik|Nastavite plačljivi dodatek za trgovino in lupino CMS. Na preprost način prodajajte fizične, digitalne in storitvene izdelke.|Aktivirajte plačljivi dodatek za licenciranje digitalnih izdelkov. Samodejno ustvarjajte in preverjajte licenčne ključe za nakupe strank.",
  ru: "Сервер лицензий|Настройте платное торговое дополнение и оболочку CMS. Продавайте физические, цифровые и сервисные продукты простым способом.|Активируйте платное дополнение лицензирования для цифровых продуктов. Автоматически создавайте и проверяйте лицензионные ключи для покупок клиентов.",
  hu: "Licenckiszolgáló|Állítsa be a fizetős kereskedelmi kiegészítőt és a CMS shellt. Egyszerűen értékesíthet fizikai, digitális és szolgáltatási termékeket.|Aktiválja a digitális termékek fizetős licencelési kiegészítőjét. Automatikusan hozzon létre és ellenőrizzen licenckulcsokat a vásárlásokhoz.",
  bg: "Лицензионен сървър|Настройте платената добавка за търговия и CMS обвивката. Продавайте лесно физически продукти, дигитални продукти и услуги.|Активирайте платената добавка за лицензиране на дигитални продукти. Автоматично генерирайте и валидирайте лицензионни ключове за клиентски покупки.",
  ja: "ライセンスサーバー|有料コマースアドオンと CMS シェルを設定します。物理商品、デジタル商品、サービス商品を簡単に販売できます。|デジタル商品向けの有料ライセンスアドオンを有効化します。顧客購入用のライセンスキーを自動生成し、検証します。",
  "zh-Hans":
    "许可证服务器|设置付费商务插件和 CMS 外壳。轻松销售实体、数字和服务类产品。|为数字产品启用付费许可插件。自动为客户购买生成并验证许可证密钥。",
  "zh-Hant":
    "授權伺服器|設定付費商務外掛和 CMS 外殼。輕鬆銷售實體、數位和服務類產品。|為數位產品啟用付費授權外掛。自動為客戶購買產生並驗證授權金鑰。",
  ar: "خادم التراخيص|قم بإعداد إضافة التجارة المدفوعة وغلاف CMS. بع المنتجات المادية والرقمية والخدمية بسهولة.|فعّل إضافة الترخيص المدفوعة للمنتجات الرقمية. أنشئ وتحقق تلقائيًا من مفاتيح الترخيص لمشتريات العملاء.",
  id: "Server lisensi|Siapkan add-on commerce berbayar dan shell CMS. Jual produk fisik, digital, dan layanan dengan mudah.|Aktifkan add-on lisensi berbayar untuk produk digital. Buat dan validasi kunci lisensi secara otomatis untuk pembelian pelanggan.",
  cs: "Licenční server|Nastavte placený obchodní doplněk a CMS shell. Prodávejte fyzické, digitální i servisní produkty jednoduchým způsobem.|Aktivujte placený licenční doplněk pro digitální produkty. Automaticky generujte a ověřujte licenční klíče pro nákupy zákazníků.",
  ro: "Server de licențe|Configurează add-onul plătit de comerț și shell-ul CMS. Vinde ușor produse fizice, digitale și servicii.|Activează add-onul plătit de licențiere pentru produse digitale. Generează și validează automat chei de licență pentru cumpărările clienților.",
  el: "Διακομιστής αδειών|Ρυθμίστε το πληρωμένο πρόσθετο εμπορίου και το CMS shell. Πουλήστε φυσικά, ψηφιακά και υπηρεσιακά προϊόντα με εύκολο τρόπο.|Ενεργοποιήστε το πληρωμένο πρόσθετο αδειοδότησης για ψηφιακά προϊόντα. Δημιουργήστε και επικυρώστε αυτόματα κλειδιά άδειας για αγορές πελατών.",
  da: "Licensserver|Opsæt den betalte commerce-tilføjelse og CMS-shell. Sælg fysiske, digitale og serviceprodukter på en nem måde.|Aktivér den betalte licenstilføjelse til digitale produkter. Generér og validér automatisk licensnøgler til kundekøb.",
  sv: "Licensserver|Konfigurera det betalda handelstillägget och CMS-skalet. Sälj fysiska, digitala och tjänsteprodukter på ett enkelt sätt.|Aktivera det betalda licenstillägget för digitala produkter. Generera och validera automatiskt licensnycklar för kundköp.",
  nb: "Lisensserver|Sett opp det betalte handelstillegget og CMS-skallet. Selg fysiske, digitale og tjenesteprodukter på en enkel måte.|Aktiver det betalte lisensieringstillegget for digitale produkter. Generer og valider lisensnøkler automatisk for kundekjøp.",
  nn: "Lisensserver|Set opp det betalte handelstillegget og CMS-skalet. Sel fysiske, digitale og tenesteprodukt på ein enkel måte.|Aktiver det betalte lisensieringstillegget for digitale produkt. Generer og valider lisensnøklar automatisk for kundekjøp.",
  fi: "Lisenssipalvelin|Määritä maksullinen kaupankäynnin lisäosa ja CMS-kuori. Myy fyysisiä, digitaalisia ja palvelutuotteita helposti.|Ota käyttöön maksullinen lisensointilisäosa digitaalisille tuotteille. Luo ja vahvista lisenssiavaimet automaattisesti asiakkaiden ostoksille.",
  is: "Leyfisþjónn|Settu upp greiddu viðskiptaviðbótina og CMS-skelina. Seldu efnislegar, stafrænar og þjónustuvörur á einfaldan hátt.|Virkjaðu greiddu leyfisviðbótina fyrir stafrænar vörur. Búðu sjálfkrafa til og staðfestu leyfislykla fyrir kaup viðskiptavina.",
} satisfies Record<LocalizedLanguage, string>;

function createMap(
  language: string,
  row: string,
): Record<ContentNewChoiceSource, string> {
  const translations = row.split("|");
  if (translations.length !== CONTENT_NEW_CHOICE_SOURCE_STRINGS.length) {
    throw new Error(
      `${language} content new choice translations must have ${CONTENT_NEW_CHOICE_SOURCE_STRINGS.length} entries, received ${translations.length}.`,
    );
  }

  return Object.fromEntries(
    CONTENT_NEW_CHOICE_SOURCE_STRINGS.map((source, index) => [
      source,
      translations[index] ?? source,
    ]),
  ) as Record<ContentNewChoiceSource, string>;
}

export const CONTENT_NEW_CHOICE_SOURCE_TRANSLATIONS = Object.fromEntries(
  Object.entries(ROWS).map(([language, row]) => [
    language,
    createMap(language, row),
  ]),
) as Record<LocalizedLanguage, Record<ContentNewChoiceSource, string>>;
