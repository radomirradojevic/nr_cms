import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

const COMMON_SOURCES = {
  actions: "Actions",
  active: "Active",
  addCategory: "Add category",
  addCourier: "Add courier",
  addLicenseServer: "Add License server",
  addMethod: "Add method",
  allStatuses: "All statuses",
  allVisibility: "All visibility",
  apiUrl: "API URL",
  archive: "Archive",
  archiveLicenseServer: "Archive license server",
  archived: "Archived",
  auth: "Auth",
  bankTransfer: "Bank transfer",
  businessBilling: "Business billing",
  cancel: "Cancel",
  cashOnDelivery: "Cash on delivery",
  catalog: "Catalog",
  checkout: "Checkout",
  checkoutLabel: "Checkout label",
  configured: "configured",
  courierServices: "Courier services",
  defaultCurrency: "Default currency",
  defaultShippingFee: "Default shipping fee",
  description: "Description",
  disabled: "Disabled",
  editable: "Editable",
  failed: "Failed",
  fieldProfile: "Field profile",
  freeShippingThreshold: "Free shipping threshold",
  hiddenPolicy: "Hidden from product policy menu",
  inactive: "Inactive",
  instructions: "Instructions",
  licenseServerArchived: "License server archived.",
  licenseServerCreated: "License server created.",
  licenseServerSaved: "License server saved.",
  licenseServers: "License servers",
  missing: "missing",
  mode: "Mode",
  monriSetup: "Monri setup",
  needsSetup: "Needs setup",
  noCatalogSnapshot: "No catalog snapshot",
  noLicenseServers: "No license servers found.",
  noSecret: "No secret",
  notSynced: "Not synced",
  notifications: "Notifications",
  open: "Open",
  optional: "Optional",
  orders: "Orders",
  pageOfPageCount: "Page {page} of {pageCount}",
  paused: "Paused",
  payments: "Payments",
  ready: "Ready",
  readOnly: "Read-only",
  required: "Required",
  save: "Save",
  saveChanges: "Save changes",
  searchLicenseServers: "Search title, URL, client ID, fingerprint",
  secretSet: "Secret set",
  settingsSummary: "Store-wide commerce defaults.",
  shipping: "Shipping",
  shippingMethods: "Shipping methods",
  shownPolicy: "Shown in product policy menu",
  showingRange: "Showing {from}-{to} of {total}",
  status: "Status",
  store: "Store",
  storeName: "Store name",
  storeNameDescription:
    "Customer-facing name used in checkout and store communication.",
  storeStatus: "Store status",
  supportedCurrencies: "Supported currencies",
  syncCatalog: "Sync catalog",
  synced: "Synced",
  tax: "Tax",
  taxCategories: "Tax categories",
  title: "Title",
  updated: "Updated",
  unknown: "Unknown",
  rowsCount: "{count} rows",
  skuSynced: "{count} catalog SKU synced.",
} as const;

const EXPLICIT_TOOLTIP_SOURCE_STRINGS = [
  "Store name",
  "Customer-facing name used in checkout and store communication.",
  "Checkout enabled",
  "Turns the checkout flow on or off for customers.",
  "Guest checkout",
  "Allows customers to place orders without signing in first.",
  "Phone required",
  "Requires a phone number during checkout for delivery or support follow-up.",
] as const;

const COURIER_COPY_SOURCE_STRINGS = ["Active in checkout", "Courier"] as const;

const COURIER_COPY_TRANSLATIONS = {
  "sr-Latn": ["Aktivno pri naplati", "Kurir"],
  "sr-Cyrl": ["Активно при наплати", "Курир"],
  hr: ["Aktivno pri naplati", "Kurir"],
  de: ["Im Checkout aktiv", "Kurier"],
  fr: ["Actif lors du paiement", "Transporteur"],
  es: ["Activo en el pago", "Transportista"],
  it: ["Attivo al pagamento", "Corriere"],
  pt: ["Ativo na finalização da compra", "Transportadora"],
  "pt-BR": ["Ativo na finalização da compra", "Transportadora"],
  nl: ["Actief bij afrekenen", "Koerier"],
  pl: ["Aktywne podczas finalizacji zakupu", "Kurier"],
  tr: ["Ödeme sırasında aktif", "Kurye"],
  mk: ["Активно при наплата", "Курир"],
  bs: ["Aktivno pri naplati", "Kurir"],
  sl: ["Aktivno pri zaključku nakupa", "Kurir"],
  ru: ["Активно при оформлении заказа", "Курьер"],
  hu: ["Aktív fizetéskor", "Futár"],
  bg: ["Активно при плащане", "Куриер"],
  ja: ["購入手続きで有効", "配送業者"],
  "zh-Hans": ["结账时启用", "快递"],
  "zh-Hant": ["結帳時啟用", "快遞"],
  ar: ["نشط عند الدفع", "شركة التوصيل"],
  id: ["Aktif saat pembayaran", "Kurir"],
  cs: ["Aktivní při placení", "Kurýr"],
  ro: ["Activ la finalizarea comenzii", "Curier"],
  el: ["Ενεργό στην ολοκλήρωση αγοράς", "Ταχυμεταφορέας"],
  da: ["Aktiv ved betaling", "Kurer"],
  sv: ["Aktiv i kassan", "Bud"],
  nb: ["Aktiv i kassen", "Bud"],
  nn: ["Aktiv i kassa", "Bod"],
  fi: ["Aktiivinen kassalla", "Kuriiri"],
  is: ["Virkt í greiðsluferli", "Sendill"],
} satisfies Record<
  LocalizedLanguage,
  readonly [activeInCheckout: string, courier: string]
>;

const PAYMENT_AND_LICENSE_SOURCE_STRINGS = [
  "Add License server",
  "Add license server",
  "Store the connection details used by paid digital products that issue keys from an external Night Raven License Server.",
  "Base API URL",
  "Client ID",
  "Shared secret",
  "Show in License key policy dropdown menu",
  "Active visible servers become selectable for digital products.",
  "Payments",
  "Enable checkout methods and configure buyer-facing payment details.",
  "Cash on delivery",
  "Bank transfer",
  "Cash on delivery has no extra credentials or checkout copy to configure.",
  "Lets customers pay when a shippable order is delivered.",
  "Lets customers place orders and pay manually from their bank account.",
  "Lets Serbian customers pay instantly by scanning IPS QR payment details.",
  "Redirects customers to Monri WebPay for hosted card checkout.",
  "Shows Paddle Billing only for digital/software carts with mapped Paddle price IDs.",
  "Shows PayPal at checkout when credentials and webhooks are configured.",
  "Shows card payment at checkout when Stripe credentials and webhooks are configured.",
  "Bank transfer instructions",
  "Instructions shown after checkout for manual bank payments.",
  "IPS QR setup",
  "Serbian instant payment details shown after checkout.",
  "Stripe setup",
  "Secret key and webhook secret are read from environment variables.",
  "PayPal setup",
  "Client ID, client secret, and webhook ID are read from environment variables.",
  "Paddle setup",
  "Paddle Billing credentials are read from environment variables. Paddle is offered only for digital/software carts.",
  "Monri setup",
  "Hosted card checkout through Monri WebPay.",
  "Monri credentials are read from",
  "This integration uses Monri Redirect Form, not the Payment API. The default form endpoint follows payment mode and is used as an HTTP POST target; a direct browser GET can show a missing page. Override it with",
  "Configure Monri callback to",
  "or set",
  "Ready",
  "Needs setup",
] as const;

type PaymentAndLicenseRowLanguage = Exclude<LocalizedLanguage, "sr-Cyrl">;

const PAYMENT_CONFIG_SOURCE_STRINGS = [
  "Secret key",
  "Webhook secret",
  "Client credentials",
  "Webhook ID",
  "API key",
  "Client-side token",
  "Set the Paddle notification destination to",
  "Map digital products or SKUs to Paddle price IDs in the product editor.",
  "Form endpoint",
  "Authenticity token",
  "Merchant key",
  "Callback URL override",
  "Configure",
  "and",
] as const;

const MONRI_CHECKLIST_SOURCE_STRINGS = [
  "Monri production readiness checklist",
  "Use this checklist after the basic env vars above are present. Monri requires the test integration and webshop content to be reviewed before the production account is activated. This app currently implements Redirect Form; the Payment API flow is separate.",
  "1. Finish Monri onboarding",
  "Get a Monri WebPay test merchant account and complete the access forms requested by Monri or the acquiring bank.",
  "Run the full redirect-form integration in the test environment, then notify Monri Support when the webshop is ready for inspection.",
  "Wait for Monri/bank website inspection, bank contract signing, TID/MID issuance, 3-D Secure registration, and production environment activation.",
  "2. Make the webshop compliant",
  "Publish company legal data, tax/company numbers, registered address, webshop address if different, phone, and customer support email.",
  "Publish terms of sale, privacy statement, delivery timing, complaint handling, cancellation, refund, and payment conditions.",
  "Show only accepted card brands, display required card and payment security logos, and include the Monri Payments PSP logo/link where required by Monri.",
  "3. Configure production secrets",
  "Set",
  "in production only. Keep test and live credentials separate.",
  "Set live",
  "from the production merchant API settings.",
  "Leave",
  "unset unless Monri gives a custom redirect-form endpoint. The live default POST target is",
  "the test default is",
  "Do not validate this URL by opening it directly in the browser.",
  "Do not replace the form URL with the Payment API path unless the provider is rewritten for that flow. Payment API uses",
  "JSON requests, and a",
  "Authorization header.",
  "Choose",
  "deliberately: use",
  "for immediate payment, or",
  "only if operations are ready to capture or void reservations in Monri.",
  "4. Configure Monri API settings",
  "Serve the checkout and all Monri return endpoints over HTTPS on the final production domain.",
  "In the Monri merchant profile, enable redirect to the Success URL. This app sends",
  "per payment and validates the returned digest before updating payment state.",
  "Configure the Callback URL as",
  "or set the same absolute URL in",
  "This app sends it to Monri as",
  "for each payment.",
  "Ask Monri Support to configure webhooks if you need declined, refund, void, capture, or tokenization events beyond the standard approved-transaction callback.",
  "5. Verify test transactions",
  "Test approved Visa, Mastercard, Maestro, and 3-D Secure flows with Monri test cards before requesting production approval.",
  "Test declined and cancelled flows. A declined card can stay on the Monri form, so do not rely only on the buyer returning to the shop.",
  "Confirm callbacks return HTTP 200, verify the",
  "SHA-512 signature, and update the order exactly once if Monri retries the same callback.",
  "Confirm the Success URL digest is checked against the raw encoded URL and that forged or expired return URLs do not mark orders as paid.",
  "6. Go-live controls",
  "Enable Monri for a small live order first, reconcile it in the Monri portal and the webshop order, then open it to all buyers.",
  "Restrict access to live secrets, rotate any leaked test values, and keep Monri logs free of card numbers or sensitive cardholder data.",
  "Document who handles captures, voids, refunds, failed callbacks, chargebacks, and support escalations with Monri or the acquiring bank.",
  "Documentation:",
  "Redirect Form",
  "Payment API",
  "webshop compliance",
  "merchant flow",
] as const;

const PAYMENT_AND_LICENSE_ROWS = {
  "sr-Latn":
    "Dodaj licencni server|Dodaj licencni server|Sačuvaj detalje veze koje koriste plaćeni digitalni proizvodi koji izdaju ključeve preko eksternog servera Night Raven License Server.|Osnovni API URL|ID klijenta|Deljena tajna|Prikaži u padajućem meniju politike licencnog ključa|Aktivni vidljivi serveri postaju dostupni za izbor kod digitalnih proizvoda.|Plaćanja|Uključi metode naplate i podesi detalje plaćanja koje vidi kupac.|Plaćanje pouzećem|Bankovni prenos|Plaćanje pouzećem nema dodatne kredencijale niti tekst za naplatu za podešavanje.|Omogućava kupcima da plate kada se porudžbina za slanje isporuči.|Omogućava kupcima da naprave porudžbinu i plate ručno sa svog bankovnog računa.|Omogućava kupcima iz Srbije da plate odmah skeniranjem IPS QR detalja plaćanja.|Preusmerava kupce na Monri WebPay za hostovanu kartičnu naplatu.|Prikazuje Paddle Billing samo za digitalne/softverske korpe sa mapiranim Paddle price ID-jevima.|Prikazuje PayPal pri naplati kada su kredencijali i webhookovi podešeni.|Prikazuje kartično plaćanje pri naplati kada su Stripe kredencijali i webhookovi podešeni.|Uputstva za bankovni prenos|Uputstva prikazana posle naplate za ručna bankovna plaćanja.|IPS QR podešavanje|Detalji srpskog instant plaćanja prikazani posle naplate.|Stripe podešavanje|Tajni ključ i webhook tajna čitaju se iz promenljivih okruženja.|PayPal podešavanje|Client ID, tajna klijenta i webhook ID čitaju se iz promenljivih okruženja.|Paddle podešavanje|Paddle Billing kredencijali se čitaju iz promenljivih okruženja. Paddle se nudi samo za digitalne/softverske korpe.|Monri podešavanje|Hostovana kartična naplata kroz Monri WebPay.|Monri kredencijali se čitaju iz|Ova integracija koristi Monri Redirect Form, ne Payment API. Podrazumevani endpoint forme prati režim plaćanja i koristi se kao HTTP POST cilj; direktan browser GET može prikazati stranicu koja nedostaje. Zameni ga sa|Podesi Monri callback na|ili postavi|Spremno|Potrebno podešavanje",
  hr: "Dodaj licencni server|Dodaj licencni server|Spremi detalje veze koje koriste plaćeni digitalni proizvodi koji izdaju ključeve preko vanjskog Night Raven License Servera.|Osnovni API URL|ID klijenta|Dijeljena tajna|Prikaži u padajućem izborniku politike licencnog ključa|Aktivni vidljivi serveri postaju dostupni za odabir kod digitalnih proizvoda.|Plaćanja|Uključite metode naplate i podesite detalje plaćanja koje vidi kupac.|Plaćanje pouzećem|Bankovni prijenos|Plaćanje pouzećem nema dodatne vjerodajnice ni tekst za checkout za podešavanje.|Omogućuje kupcima plaćanje kada se narudžba za slanje isporuči.|Omogućuje kupcima da naprave narudžbu i plate ručno sa svog bankovnog računa.|Omogućuje kupcima iz Srbije trenutačno plaćanje skeniranjem IPS QR detalja plaćanja.|Preusmjerava kupce na Monri WebPay za hostani kartični checkout.|Prikazuje Paddle Billing samo za digitalne/softverske košarice s mapiranim Paddle price ID-jevima.|Prikazuje PayPal pri checkoutu kada su vjerodajnice i webhookovi podešeni.|Prikazuje kartično plaćanje pri checkoutu kada su Stripe vjerodajnice i webhookovi podešeni.|Upute za bankovni prijenos|Upute prikazane nakon checkouta za ručna bankovna plaćanja.|IPS QR podešavanje|Detalji srpskog instant plaćanja prikazani nakon checkouta.|Stripe podešavanje|Tajni ključ i webhook tajna čitaju se iz varijabli okruženja.|PayPal podešavanje|Client ID, tajna klijenta i webhook ID čitaju se iz varijabli okruženja.|Paddle podešavanje|Paddle Billing vjerodajnice čitaju se iz varijabli okruženja. Paddle se nudi samo za digitalne/softverske košarice.|Monri podešavanje|Hostani kartični checkout kroz Monri WebPay.|Monri vjerodajnice čitaju se iz|Ova integracija koristi Monri Redirect Form, a ne Payment API. Zadani endpoint forme prati način plaćanja i koristi se kao HTTP POST odredište; izravan browser GET može prikazati stranicu koja nedostaje. Zamijenite ga s|Podesi Monri callback na|ili postavi|Spremno|Potrebno podešavanje",
  de: "Lizenzserver hinzufügen|Lizenzserver hinzufügen|Speichere die Verbindungsdetails für kostenpflichtige digitale Produkte, die Schlüssel über einen externen Night Raven License Server ausstellen.|Basis-API-URL|Client-ID|Gemeinsames Geheimnis|Im Dropdown-Menü der Lizenzschlüssel-Richtlinie anzeigen|Aktive sichtbare Server werden für digitale Produkte auswählbar.|Zahlungen|Aktiviere Checkout-Methoden und konfiguriere kunden sichtbare Zahlungsdetails.|Nachnahme|Banküberweisung|Nachnahme hat keine zusätzlichen Zugangsdaten oder Checkout-Texte zu konfigurieren.|Ermöglicht Kunden die Zahlung, wenn eine versandfähige Bestellung geliefert wird.|Ermöglicht Kunden, Bestellungen aufzugeben und manuell von ihrem Bankkonto zu bezahlen.|Ermöglicht serbischen Kunden sofortiges Bezahlen durch Scannen der IPS-QR-Zahlungsdetails.|Leitet Kunden zu Monri WebPay für gehosteten Karten-Checkout weiter.|Zeigt Paddle Billing nur für digitale/Software-Warenkörbe mit zugeordneten Paddle-Preis-IDs.|Zeigt PayPal im Checkout, wenn Zugangsdaten und Webhooks konfiguriert sind.|Zeigt Kartenzahlung im Checkout, wenn Stripe-Zugangsdaten und Webhooks konfiguriert sind.|Anweisungen für Banküberweisung|Anweisungen nach dem Checkout für manuelle Bankzahlungen.|IPS-QR-Einrichtung|Serbische Sofortzahlungsdetails, die nach dem Checkout angezeigt werden.|Stripe-Einrichtung|Geheimer Schlüssel und Webhook-Geheimnis werden aus Umgebungsvariablen gelesen.|PayPal-Einrichtung|Client-ID, Client-Geheimnis und Webhook-ID werden aus Umgebungsvariablen gelesen.|Paddle-Einrichtung|Paddle-Billing-Zugangsdaten werden aus Umgebungsvariablen gelesen. Paddle wird nur für digitale/Software-Warenkörbe angeboten.|Monri-Einrichtung|Gehosteter Karten-Checkout über Monri WebPay.|Monri-Zugangsdaten werden gelesen aus|Diese Integration verwendet Monri Redirect Form, nicht die Payment API. Der Standard-Formularendpunkt folgt dem Zahlungsmodus und wird als HTTP-POST-Ziel verwendet; ein direkter Browser-GET kann eine fehlende Seite anzeigen. Überschreibe ihn mit|Monri-Callback konfigurieren auf|oder setzen|Bereit|Einrichtung erforderlich",
  fr: "Ajouter un serveur de licences|Ajouter un serveur de licences|Enregistrez les détails de connexion utilisés par les produits numériques payants qui émettent des clés via un Night Raven License Server externe.|URL API de base|ID client|Secret partagé|Afficher dans le menu déroulant de politique de clé de licence|Les serveurs actifs et visibles deviennent sélectionnables pour les produits numériques.|Paiements|Activez les méthodes de checkout et configurez les détails de paiement visibles par l'acheteur.|Paiement à la livraison|Virement bancaire|Le paiement à la livraison n'a pas d'identifiants supplémentaires ni de texte de checkout à configurer.|Permet aux clients de payer lorsqu'une commande expédiable est livrée.|Permet aux clients de passer commande et de payer manuellement depuis leur compte bancaire.|Permet aux clients serbes de payer instantanément en scannant les détails de paiement IPS QR.|Redirige les clients vers Monri WebPay pour un checkout carte hébergé.|Affiche Paddle Billing uniquement pour les paniers numériques/logiciels avec des ID de prix Paddle mappés.|Affiche PayPal au checkout lorsque les identifiants et webhooks sont configurés.|Affiche le paiement par carte au checkout lorsque les identifiants Stripe et webhooks sont configurés.|Instructions de virement bancaire|Instructions affichées après le checkout pour les paiements bancaires manuels.|Configuration IPS QR|Détails de paiement instantané serbe affichés après le checkout.|Configuration Stripe|La clé secrète et le secret webhook sont lus depuis les variables d'environnement.|Configuration PayPal|L'ID client, le secret client et l'ID webhook sont lus depuis les variables d'environnement.|Configuration Paddle|Les identifiants Paddle Billing sont lus depuis les variables d'environnement. Paddle est proposé uniquement pour les paniers numériques/logiciels.|Configuration Monri|Checkout carte hébergé via Monri WebPay.|Les identifiants Monri sont lus depuis|Cette intégration utilise Monri Redirect Form, pas la Payment API. Le point de terminaison de formulaire par défaut suit le mode de paiement et sert de cible HTTP POST; un GET direct du navigateur peut afficher une page manquante. Remplacez-le par|Configurer le callback Monri vers|ou définir|Prêt|Configuration requise",
  es: "Añadir servidor de licencias|Añadir servidor de licencias|Guarda los detalles de conexión usados por productos digitales de pago que emiten claves desde un Night Raven License Server externo.|URL base de API|ID de cliente|Secreto compartido|Mostrar en el menú desplegable de política de clave de licencia|Los servidores activos y visibles estarán disponibles para productos digitales.|Pagos|Activa métodos de checkout y configura los detalles de pago que verá el comprador.|Pago contra entrega|Transferencia bancaria|El pago contra entrega no tiene credenciales adicionales ni texto de checkout para configurar.|Permite que los clientes paguen cuando se entrega un pedido enviable.|Permite que los clientes hagan pedidos y paguen manualmente desde su cuenta bancaria.|Permite que clientes serbios paguen al instante escaneando los detalles de pago IPS QR.|Redirige a los clientes a Monri WebPay para checkout con tarjeta alojado.|Muestra Paddle Billing solo para carritos digitales/software con IDs de precio Paddle asignados.|Muestra PayPal en checkout cuando las credenciales y webhooks están configurados.|Muestra pago con tarjeta en checkout cuando las credenciales y webhooks de Stripe están configurados.|Instrucciones de transferencia bancaria|Instrucciones mostradas después del checkout para pagos bancarios manuales.|Configuración IPS QR|Detalles de pago instantáneo serbio mostrados después del checkout.|Configuración de Stripe|La clave secreta y el secreto de webhook se leen desde variables de entorno.|Configuración de PayPal|El ID de cliente, el secreto de cliente y el ID de webhook se leen desde variables de entorno.|Configuración de Paddle|Las credenciales de Paddle Billing se leen desde variables de entorno. Paddle se ofrece solo para carritos digitales/software.|Configuración de Monri|Checkout con tarjeta alojado mediante Monri WebPay.|Las credenciales de Monri se leen desde|Esta integración usa Monri Redirect Form, no Payment API. El endpoint de formulario predeterminado sigue el modo de pago y se usa como destino HTTP POST; un GET directo del navegador puede mostrar una página faltante. Sobrescríbelo con|Configurar callback de Monri a|o establecer|Listo|Requiere configuración",
  it: "Aggiungi server licenze|Aggiungi server licenze|Salva i dettagli di connessione usati dai prodotti digitali a pagamento che emettono chiavi tramite un Night Raven License Server esterno.|URL API base|ID client|Segreto condiviso|Mostra nel menu a tendina della policy della chiave licenza|I server attivi e visibili diventano selezionabili per i prodotti digitali.|Pagamenti|Abilita i metodi di checkout e configura i dettagli di pagamento visibili all'acquirente.|Pagamento alla consegna|Bonifico bancario|Il pagamento alla consegna non ha credenziali aggiuntive né testo di checkout da configurare.|Consente ai clienti di pagare quando viene consegnato un ordine spedibile.|Consente ai clienti di effettuare ordini e pagare manualmente dal conto bancario.|Consente ai clienti serbi di pagare subito scansionando i dettagli di pagamento IPS QR.|Reindirizza i clienti a Monri WebPay per checkout carta ospitato.|Mostra Paddle Billing solo per carrelli digitali/software con ID prezzo Paddle mappati.|Mostra PayPal al checkout quando credenziali e webhook sono configurati.|Mostra pagamento con carta al checkout quando credenziali Stripe e webhook sono configurati.|Istruzioni per bonifico bancario|Istruzioni mostrate dopo il checkout per pagamenti bancari manuali.|Configurazione IPS QR|Dettagli di pagamento istantaneo serbo mostrati dopo il checkout.|Configurazione Stripe|La chiave segreta e il segreto webhook vengono letti dalle variabili d'ambiente.|Configurazione PayPal|ID client, segreto client e ID webhook vengono letti dalle variabili d'ambiente.|Configurazione Paddle|Le credenziali Paddle Billing vengono lette dalle variabili d'ambiente. Paddle è offerto solo per carrelli digitali/software.|Configurazione Monri|Checkout carta ospitato tramite Monri WebPay.|Le credenziali Monri vengono lette da|Questa integrazione usa Monri Redirect Form, non Payment API. L'endpoint modulo predefinito segue la modalità di pagamento ed è usato come destinazione HTTP POST; un GET diretto del browser può mostrare una pagina mancante. Sostituiscilo con|Configura callback Monri su|oppure imposta|Pronto|Configurazione richiesta",
  pt: "Adicionar servidor de licenças|Adicionar servidor de licenças|Guarda os detalhes de ligação usados por produtos digitais pagos que emitem chaves através de um Night Raven License Server externo.|URL base da API|ID do cliente|Segredo partilhado|Mostrar no menu suspenso da política da chave de licença|Servidores ativos e visíveis ficam selecionáveis para produtos digitais.|Pagamentos|Ativa métodos de checkout e configura detalhes de pagamento visíveis para o comprador.|Pagamento na entrega|Transferência bancária|O pagamento na entrega não tem credenciais extra nem texto de checkout para configurar.|Permite que os clientes paguem quando uma encomenda expedível é entregue.|Permite que os clientes façam encomendas e paguem manualmente a partir da conta bancária.|Permite que clientes sérvios paguem instantaneamente ao digitalizar os detalhes IPS QR.|Redireciona os clientes para Monri WebPay para checkout com cartão alojado.|Mostra Paddle Billing apenas para carrinhos digitais/software com IDs de preço Paddle mapeados.|Mostra PayPal no checkout quando credenciais e webhooks estão configurados.|Mostra pagamento por cartão no checkout quando credenciais Stripe e webhooks estão configurados.|Instruções de transferência bancária|Instruções mostradas após o checkout para pagamentos bancários manuais.|Configuração IPS QR|Detalhes de pagamento instantâneo sérvio mostrados após o checkout.|Configuração Stripe|A chave secreta e o segredo webhook são lidos das variáveis de ambiente.|Configuração PayPal|ID do cliente, segredo do cliente e ID webhook são lidos das variáveis de ambiente.|Configuração Paddle|As credenciais Paddle Billing são lidas das variáveis de ambiente. Paddle é oferecido apenas para carrinhos digitais/software.|Configuração Monri|Checkout com cartão alojado através de Monri WebPay.|As credenciais Monri são lidas de|Esta integração usa Monri Redirect Form, não Payment API. O endpoint de formulário predefinido segue o modo de pagamento e é usado como destino HTTP POST; um GET direto do navegador pode mostrar uma página em falta. Substitui-o por|Configurar callback Monri para|ou definir|Pronto|Configuração necessária",
  "pt-BR":
    "Adicionar servidor de licenças|Adicionar servidor de licenças|Salva os detalhes de conexão usados por produtos digitais pagos que emitem chaves por um Night Raven License Server externo.|URL base da API|ID do cliente|Segredo compartilhado|Mostrar no menu suspenso da política da chave de licença|Servidores ativos e visíveis ficam selecionáveis para produtos digitais.|Pagamentos|Ative métodos de checkout e configure detalhes de pagamento visíveis para o comprador.|Pagamento na entrega|Transferência bancária|O pagamento na entrega não tem credenciais extras nem texto de checkout para configurar.|Permite que clientes paguem quando um pedido enviável é entregue.|Permite que clientes façam pedidos e paguem manualmente pela conta bancária.|Permite que clientes sérvios paguem instantaneamente ao escanear os detalhes IPS QR.|Redireciona clientes para Monri WebPay para checkout com cartão hospedado.|Mostra Paddle Billing apenas para carrinhos digitais/software com IDs de preço Paddle mapeados.|Mostra PayPal no checkout quando credenciais e webhooks estão configurados.|Mostra pagamento com cartão no checkout quando credenciais Stripe e webhooks estão configurados.|Instruções de transferência bancária|Instruções exibidas após o checkout para pagamentos bancários manuais.|Configuração IPS QR|Detalhes de pagamento instantâneo sérvio exibidos após o checkout.|Configuração Stripe|A chave secreta e o segredo de webhook são lidos das variáveis de ambiente.|Configuração PayPal|ID do cliente, segredo do cliente e ID do webhook são lidos das variáveis de ambiente.|Configuração Paddle|As credenciais Paddle Billing são lidas das variáveis de ambiente. Paddle é oferecido apenas para carrinhos digitais/software.|Configuração Monri|Checkout com cartão hospedado por Monri WebPay.|As credenciais Monri são lidas de|Esta integração usa Monri Redirect Form, não Payment API. O endpoint de formulário padrão segue o modo de pagamento e é usado como destino HTTP POST; um GET direto do navegador pode mostrar uma página ausente. Substitua por|Configurar callback Monri para|ou definir|Pronto|Precisa de configuração",
  nl: "Licentieserver toevoegen|Licentieserver toevoegen|Sla de verbindingsgegevens op voor betaalde digitale producten die sleutels uitgeven via een externe Night Raven License Server.|Basis-API-URL|Client-ID|Gedeeld geheim|Tonen in het dropdownmenu voor licentiesleutelbeleid|Actieve zichtbare servers worden selecteerbaar voor digitale producten.|Betalingen|Schakel checkoutmethoden in en configureer betalingsdetails die kopers zien.|Rembours|Bankoverschrijving|Rembours heeft geen extra referenties of checkouttekst om te configureren.|Laat klanten betalen wanneer een verzendbare bestelling is geleverd.|Laat klanten bestellingen plaatsen en handmatig vanaf hun bankrekening betalen.|Laat Servische klanten direct betalen door IPS QR-betaalgegevens te scannen.|Stuurt klanten door naar Monri WebPay voor gehoste kaartcheckout.|Toont Paddle Billing alleen voor digitale/softwarewinkelwagens met gekoppelde Paddle-prijs-ID's.|Toont PayPal bij checkout wanneer referenties en webhooks zijn geconfigureerd.|Toont kaartbetaling bij checkout wanneer Stripe-referenties en webhooks zijn geconfigureerd.|Instructies voor bankoverschrijving|Instructies na checkout voor handmatige bankbetalingen.|IPS QR instellen|Servische instantbetalingsgegevens getoond na checkout.|Stripe instellen|Geheime sleutel en webhookgeheim worden uit omgevingsvariabelen gelezen.|PayPal instellen|Client-ID, clientgeheim en webhook-ID worden uit omgevingsvariabelen gelezen.|Paddle instellen|Paddle Billing-referenties worden uit omgevingsvariabelen gelezen. Paddle wordt alleen aangeboden voor digitale/softwarewinkelwagens.|Monri instellen|Gehoste kaartcheckout via Monri WebPay.|Monri-referenties worden gelezen uit|Deze integratie gebruikt Monri Redirect Form, niet de Payment API. Het standaard formuliereindpunt volgt de betaalmodus en wordt gebruikt als HTTP POST-doel; een directe browser GET kan een ontbrekende pagina tonen. Overschrijf het met|Monri-callback configureren naar|of stel in|Gereed|Instelling nodig",
  pl: "Dodaj serwer licencji|Dodaj serwer licencji|Zapisz dane połączenia używane przez płatne produkty cyfrowe, które wydają klucze przez zewnętrzny Night Raven License Server.|Bazowy URL API|ID klienta|Wspólny sekret|Pokaż w menu polityki klucza licencyjnego|Aktywne widoczne serwery będzie można wybierać dla produktów cyfrowych.|Płatności|Włącz metody checkoutu i skonfiguruj szczegóły płatności widoczne dla kupującego.|Płatność przy odbiorze|Przelew bankowy|Płatność przy odbiorze nie ma dodatkowych danych dostępu ani tekstu checkoutu do konfiguracji.|Pozwala klientom zapłacić po dostarczeniu zamówienia do wysyłki.|Pozwala klientom składać zamówienia i płacić ręcznie z konta bankowego.|Pozwala klientom z Serbii płacić natychmiast po zeskanowaniu danych płatności IPS QR.|Przekierowuje klientów do Monri WebPay dla hostowanego checkoutu kartą.|Pokazuje Paddle Billing tylko dla koszyków cyfrowych/software z przypisanymi ID cen Paddle.|Pokazuje PayPal w checkoutcie, gdy dane dostępowe i webhooki są skonfigurowane.|Pokazuje płatność kartą w checkoutcie, gdy dane Stripe i webhooki są skonfigurowane.|Instrukcje przelewu bankowego|Instrukcje wyświetlane po checkoutcie dla ręcznych płatności bankowych.|Konfiguracja IPS QR|Szczegóły serbskiej płatności natychmiastowej pokazane po checkoutcie.|Konfiguracja Stripe|Klucz tajny i sekret webhooka są odczytywane ze zmiennych środowiskowych.|Konfiguracja PayPal|ID klienta, sekret klienta i ID webhooka są odczytywane ze zmiennych środowiskowych.|Konfiguracja Paddle|Dane dostępowe Paddle Billing są odczytywane ze zmiennych środowiskowych. Paddle jest oferowany tylko dla koszyków cyfrowych/software.|Konfiguracja Monri|Hostowany checkout kartą przez Monri WebPay.|Dane dostępowe Monri są odczytywane z|Ta integracja używa Monri Redirect Form, a nie Payment API. Domyślny endpoint formularza zależy od trybu płatności i jest używany jako cel HTTP POST; bezpośredni GET w przeglądarce może pokazać brakującą stronę. Nadpisz go przez|Skonfiguruj callback Monri na|lub ustaw|Gotowe|Wymaga konfiguracji",
  tr: "Lisans sunucusu ekle|Lisans sunucusu ekle|Harici bir Night Raven License Server üzerinden anahtar veren ücretli dijital ürünlerin kullandığı bağlantı ayrıntılarını kaydet.|Temel API URL'si|İstemci ID|Paylaşılan sır|Lisans anahtarı ilkesi açılır menüsünde göster|Aktif ve görünür sunucular dijital ürünler için seçilebilir olur.|Ödemeler|Checkout yöntemlerini etkinleştir ve alıcıya gösterilen ödeme ayrıntılarını yapılandır.|Teslimatta ödeme|Banka havalesi|Teslimatta ödeme için ek kimlik bilgisi veya checkout metni yapılandırılmaz.|Gönderilebilir bir sipariş teslim edildiğinde müşterilerin ödeme yapmasını sağlar.|Müşterilerin sipariş verip banka hesaplarından manuel ödeme yapmasını sağlar.|Sırbistan'daki müşterilerin IPS QR ödeme ayrıntılarını tarayarak anında ödeme yapmasını sağlar.|Müşterileri barındırılan kart checkout için Monri WebPay'e yönlendirir.|Paddle Billing'i yalnızca Paddle fiyat ID'leri eşlenmiş dijital/yazılım sepetlerinde gösterir.|Kimlik bilgileri ve webhooklar yapılandırıldığında checkoutta PayPal'ı gösterir.|Stripe kimlik bilgileri ve webhooklar yapılandırıldığında checkoutta kart ödemesini gösterir.|Banka havalesi talimatları|Manuel banka ödemeleri için checkout sonrası gösterilen talimatlar.|IPS QR kurulumu|Checkout sonrası gösterilen Sırp anlık ödeme ayrıntıları.|Stripe kurulumu|Gizli anahtar ve webhook sırrı ortam değişkenlerinden okunur.|PayPal kurulumu|İstemci ID, istemci sırrı ve webhook ID ortam değişkenlerinden okunur.|Paddle kurulumu|Paddle Billing kimlik bilgileri ortam değişkenlerinden okunur. Paddle yalnızca dijital/yazılım sepetleri için sunulur.|Monri kurulumu|Monri WebPay üzerinden barındırılan kart checkout.|Monri kimlik bilgileri şuradan okunur|Bu entegrasyon Payment API değil Monri Redirect Form kullanır. Varsayılan form endpoint'i ödeme modunu izler ve HTTP POST hedefi olarak kullanılır; doğrudan browser GET eksik sayfa gösterebilir. Şununla değiştir|Monri callback'i şuraya yapılandır|veya ayarla|Hazır|Kurulum gerekli",
  mk: "Додај лиценцен сервер|Додај лиценцен сервер|Зачувај ги деталите за врската што ги користат платени дигитални производи кои издаваат клучеви преку надворешен Night Raven License Server.|Основен API URL|ID на клиент|Споделена тајна|Прикажи во паѓачкото мени за политика на лиценцен клуч|Активните видливи сервери стануваат достапни за избор кај дигитални производи.|Плаќања|Вклучи методи за checkout и конфигурирај детали за плаќање што ги гледа купувачот.|Плаќање при достава|Банкарски трансфер|Плаќањето при достава нема дополнителни креденцијали или checkout текст за конфигурирање.|Им овозможува на купувачите да платат кога ќе се испорача нарачка што се испраќа.|Им овозможува на купувачите да нарачаат и рачно да платат од својата банкарска сметка.|Им овозможува на српските купувачи веднаш да платат со скенирање IPS QR детали за плаќање.|Ги пренасочува купувачите кон Monri WebPay за хостиран checkout со картичка.|Го прикажува Paddle Billing само за дигитални/софтверски кошнички со мапирани Paddle price ID.|Го прикажува PayPal при checkout кога креденцијалите и webhook-овите се конфигурирани.|Прикажува плаќање со картичка при checkout кога Stripe креденцијалите и webhook-овите се конфигурирани.|Инструкции за банкарски трансфер|Инструкции прикажани по checkout за рачни банкарски плаќања.|IPS QR поставување|Детали за српско инстант плаќање прикажани по checkout.|Stripe поставување|Тајниот клуч и webhook тајната се читаат од променливи на околината.|PayPal поставување|Client ID, тајна на клиентот и webhook ID се читаат од променливи на околината.|Paddle поставување|Paddle Billing креденцијалите се читаат од променливи на околината. Paddle се нуди само за дигитални/софтверски кошнички.|Monri поставување|Хостиран checkout со картичка преку Monri WebPay.|Monri креденцијалите се читаат од|Оваа интеграција користи Monri Redirect Form, не Payment API. Стандардниот endpoint на формата го следи режимот на плаќање и се користи како HTTP POST цел; директен browser GET може да прикаже страница што недостасува. Замени го со|Конфигурирај Monri callback кон|или постави|Спремно|Потребно поставување",
  bs: "Dodaj licencni server|Dodaj licencni server|Sačuvaj detalje veze koje koriste plaćeni digitalni proizvodi koji izdaju ključeve preko eksternog Night Raven License Servera.|Osnovni API URL|ID klijenta|Dijeljena tajna|Prikaži u padajućem meniju politike licencnog ključa|Aktivni vidljivi serveri postaju dostupni za izbor kod digitalnih proizvoda.|Plaćanja|Uključi metode naplate i podesi detalje plaćanja koje vidi kupac.|Plaćanje pouzećem|Bankovni transfer|Plaćanje pouzećem nema dodatne kredencijale niti checkout tekst za podešavanje.|Omogućava kupcima da plate kada se narudžba za slanje isporuči.|Omogućava kupcima da naprave narudžbu i plate ručno sa svog bankovnog računa.|Omogućava kupcima iz Srbije da plate odmah skeniranjem IPS QR detalja plaćanja.|Preusmjerava kupce na Monri WebPay za hostovani kartični checkout.|Prikazuje Paddle Billing samo za digitalne/softverske korpe sa mapiranim Paddle price ID-jevima.|Prikazuje PayPal pri checkoutu kada su kredencijali i webhookovi podešeni.|Prikazuje kartično plaćanje pri checkoutu kada su Stripe kredencijali i webhookovi podešeni.|Uputstva za bankovni transfer|Uputstva prikazana poslije checkouta za ručna bankovna plaćanja.|IPS QR podešavanje|Detalji srpskog instant plaćanja prikazani poslije checkouta.|Stripe podešavanje|Tajni ključ i webhook tajna čitaju se iz varijabli okruženja.|PayPal podešavanje|Client ID, tajna klijenta i webhook ID čitaju se iz varijabli okruženja.|Paddle podešavanje|Paddle Billing kredencijali se čitaju iz varijabli okruženja. Paddle se nudi samo za digitalne/softverske korpe.|Monri podešavanje|Hostovani kartični checkout kroz Monri WebPay.|Monri kredencijali se čitaju iz|Ova integracija koristi Monri Redirect Form, ne Payment API. Podrazumijevani endpoint forme prati režim plaćanja i koristi se kao HTTP POST cilj; direktan browser GET može prikazati stranicu koja nedostaje. Zamijeni ga sa|Podesi Monri callback na|ili postavi|Spremno|Potrebno podešavanje",
  sl: "Dodaj licenčni strežnik|Dodaj licenčni strežnik|Shrani podatke povezave, ki jih uporabljajo plačljivi digitalni izdelki za izdajanje ključev prek zunanjega Night Raven License Serverja.|Osnovni API URL|ID odjemalca|Deljena skrivnost|Prikaži v spustnem meniju pravilnika licenčnega ključa|Aktivni vidni strežniki postanejo izbirni za digitalne izdelke.|Plačila|Omogoči načine checkouta in nastavi plačilne podatke, vidne kupcu.|Plačilo ob dostavi|Bančno nakazilo|Plačilo ob dostavi nima dodatnih poverilnic ali checkout besedila za nastavitev.|Strankam omogoča plačilo, ko je naročilo za pošiljanje dostavljeno.|Strankam omogoča oddajo naročila in ročno plačilo z bančnega računa.|Srbskim strankam omogoča takojšnje plačilo s skeniranjem IPS QR podatkov plačila.|Preusmeri stranke na Monri WebPay za gostovani kartični checkout.|Prikaže Paddle Billing samo za digitalne/programske košarice z mapiranimi Paddle price ID-ji.|Prikaže PayPal pri checkoutu, ko so poverilnice in webhooki nastavljeni.|Prikaže kartično plačilo pri checkoutu, ko so Stripe poverilnice in webhooki nastavljeni.|Navodila za bančno nakazilo|Navodila po checkoutu za ročna bančna plačila.|Nastavitev IPS QR|Podatki srbskega takojšnjega plačila, prikazani po checkoutu.|Nastavitev Stripe|Skrivni ključ in webhook skrivnost se bereta iz okoljskih spremenljivk.|Nastavitev PayPal|ID odjemalca, skrivnost odjemalca in webhook ID se berejo iz okoljskih spremenljivk.|Nastavitev Paddle|Poverilnice Paddle Billing se berejo iz okoljskih spremenljivk. Paddle je na voljo samo za digitalne/programske košarice.|Nastavitev Monri|Gostovani kartični checkout prek Monri WebPay.|Poverilnice Monri se berejo iz|Ta integracija uporablja Monri Redirect Form, ne Payment API. Privzeta končna točka obrazca sledi načinu plačila in se uporablja kot HTTP POST cilj; neposreden browser GET lahko prikaže manjkajočo stran. Prepiši jo z|Nastavi Monri callback na|ali nastavi|Pripravljeno|Potrebna nastavitev",
  ru: "Добавить сервер лицензий|Добавить сервер лицензий|Сохраните параметры подключения, используемые платными цифровыми продуктами, которые выдают ключи через внешний Night Raven License Server.|Базовый API URL|ID клиента|Общий секрет|Показывать в выпадающем меню политики лицензионного ключа|Активные видимые серверы станут доступными для выбора у цифровых продуктов.|Платежи|Включите методы checkout и настройте платежные данные, видимые покупателю.|Оплата при доставке|Банковский перевод|Оплата при доставке не требует дополнительных учетных данных или текста checkout для настройки.|Позволяет клиентам платить при доставке отправляемого заказа.|Позволяет клиентам оформить заказ и вручную оплатить со своего банковского счета.|Позволяет клиентам из Сербии мгновенно платить, сканируя IPS QR платежные данные.|Перенаправляет клиентов в Monri WebPay для размещенного карточного checkout.|Показывает Paddle Billing только для цифровых/программных корзин с сопоставленными Paddle price ID.|Показывает PayPal в checkout, когда учетные данные и webhooks настроены.|Показывает оплату картой в checkout, когда учетные данные Stripe и webhooks настроены.|Инструкции для банковского перевода|Инструкции после checkout для ручных банковских платежей.|Настройка IPS QR|Данные сербского мгновенного платежа, показанные после checkout.|Настройка Stripe|Секретный ключ и webhook secret читаются из переменных окружения.|Настройка PayPal|Client ID, секрет клиента и webhook ID читаются из переменных окружения.|Настройка Paddle|Учетные данные Paddle Billing читаются из переменных окружения. Paddle предлагается только для цифровых/программных корзин.|Настройка Monri|Размещенный карточный checkout через Monri WebPay.|Учетные данные Monri читаются из|Эта интеграция использует Monri Redirect Form, а не Payment API. Стандартный endpoint формы следует режиму оплаты и используется как цель HTTP POST; прямой browser GET может показать отсутствующую страницу. Переопределите его через|Настроить Monri callback на|или установить|Готово|Требуется настройка",
  hu: "Licenckiszolgáló hozzáadása|Licenckiszolgáló hozzáadása|Mentsd a kapcsolati adatokat, amelyeket a fizetős digitális termékek használnak kulcsok kiadásához egy külső Night Raven License Serveren keresztül.|Alap API URL|Kliensazonosító|Megosztott titok|Megjelenítés a licenckulcs-szabályzat legördülő menüjében|Az aktív, látható szerverek kiválaszthatók lesznek a digitális termékekhez.|Fizetések|Engedélyezd a checkout módokat és állítsd be a vevőnek látható fizetési adatokat.|Utánvét|Banki átutalás|Az utánvétnek nincs további hitelesítő adata vagy checkout szövege.|Lehetővé teszi, hogy az ügyfelek a szállítható rendelés kézbesítésekor fizessenek.|Lehetővé teszi, hogy az ügyfelek rendeljenek és manuálisan fizessenek bankszámlájukról.|Lehetővé teszi a szerb ügyfeleknek az azonnali fizetést az IPS QR fizetési adatok beolvasásával.|Átirányítja az ügyfeleket a Monri WebPayre hosztolt kártyás checkouthoz.|Csak leképezett Paddle price ID-kkel rendelkező digitális/szoftver kosaraknál jeleníti meg a Paddle Billinget.|Megjeleníti a PayPalt checkoutkor, ha a hitelesítő adatok és webhookok be vannak állítva.|Megjeleníti a kártyás fizetést checkoutkor, ha a Stripe hitelesítő adatok és webhookok be vannak állítva.|Banki átutalási utasítások|Checkout után megjelenő utasítások kézi banki fizetésekhez.|IPS QR beállítás|Checkout után megjelenő szerb azonnali fizetési adatok.|Stripe beállítás|A titkos kulcs és webhook titok környezeti változókból olvasódik.|PayPal beállítás|A kliensazonosító, kliens titok és webhook ID környezeti változókból olvasódik.|Paddle beállítás|A Paddle Billing hitelesítő adatai környezeti változókból olvasódnak. A Paddle csak digitális/szoftver kosarakhoz érhető el.|Monri beállítás|Hosztolt kártyás checkout Monri WebPayen keresztül.|A Monri hitelesítő adatai innen olvasódnak|Ez az integráció Monri Redirect Formot használ, nem Payment API-t. Az alapértelmezett űrlap endpoint követi a fizetési módot és HTTP POST célként használatos; a közvetlen browser GET hiányzó oldalt mutathat. Írd felül ezzel|Monri callback beállítása ide|vagy állítsd be|Kész|Beállítás szükséges",
  bg: "Добавяне на лицензен сървър|Добавяне на лицензен сървър|Запазете данните за връзка, използвани от платени дигитални продукти, които издават ключове чрез външен Night Raven License Server.|Основен API URL|ID на клиент|Споделена тайна|Показване в падащото меню за политика на лицензен ключ|Активните видими сървъри стават избираеми за дигитални продукти.|Плащания|Включете checkout методи и настройте детайлите за плащане, видими за купувача.|Наложен платеж|Банков превод|Наложеният платеж няма допълнителни данни за достъп или checkout текст за настройване.|Позволява на клиентите да платят, когато поръчка за доставка бъде доставена.|Позволява на клиентите да правят поръчки и да плащат ръчно от банковата си сметка.|Позволява на сръбски клиенти да платят веднага чрез сканиране на IPS QR данни за плащане.|Пренасочва клиентите към Monri WebPay за хостван картов checkout.|Показва Paddle Billing само за дигитални/софтуерни колички с мапнати Paddle price ID.|Показва PayPal при checkout, когато данните за достъп и webhook-ите са настроени.|Показва плащане с карта при checkout, когато Stripe данните и webhook-ите са настроени.|Инструкции за банков превод|Инструкции след checkout за ръчни банкови плащания.|Настройка на IPS QR|Детайли за сръбско моментално плащане, показани след checkout.|Настройка на Stripe|Тайният ключ и webhook тайната се четат от променливи на средата.|Настройка на PayPal|Client ID, тайната на клиента и webhook ID се четат от променливи на средата.|Настройка на Paddle|Данните за Paddle Billing се четат от променливи на средата. Paddle се предлага само за дигитални/софтуерни колички.|Настройка на Monri|Хостван картов checkout чрез Monri WebPay.|Данните за Monri се четат от|Тази интеграция използва Monri Redirect Form, а не Payment API. Стандартният endpoint на формата следва режима на плащане и се използва като HTTP POST цел; директен browser GET може да покаже липсваща страница. Замени го с|Настрой Monri callback към|или задай|Готово|Нужна е настройка",
  ja: "ライセンスサーバーを追加|ライセンスサーバーを追加|外部の Night Raven License Server からキーを発行する有料デジタル商品で使う接続情報を保存します。|ベース API URL|クライアント ID|共有シークレット|ライセンスキーポリシーのドロップダウンに表示|有効で表示中のサーバーをデジタル商品で選択できるようにします。|支払い|チェックアウト方法を有効化し、購入者に表示される支払い詳細を設定します。|代金引換|銀行振込|代金引換には追加の認証情報やチェックアウト文言の設定はありません。|配送可能な注文が配達されたときに顧客が支払えるようにします。|顧客が注文し、銀行口座から手動で支払えるようにします。|セルビアの顧客が IPS QR 支払い情報をスキャンして即時支払いできるようにします。|ホスト型カードチェックアウトのために顧客を Monri WebPay へリダイレクトします。|マッピング済み Paddle price ID があるデジタル/ソフトウェアカートでのみ Paddle Billing を表示します。|認証情報と webhook が設定されている場合、チェックアウトで PayPal を表示します。|Stripe 認証情報と webhook が設定されている場合、チェックアウトでカード支払いを表示します。|銀行振込の手順|手動の銀行支払い用にチェックアウト後に表示される手順。|IPS QR 設定|チェックアウト後に表示されるセルビア即時支払い情報。|Stripe 設定|シークレットキーと webhook シークレットは環境変数から読み込まれます。|PayPal 設定|クライアント ID、クライアントシークレット、webhook ID は環境変数から読み込まれます。|Paddle 設定|Paddle Billing の認証情報は環境変数から読み込まれます。Paddle はデジタル/ソフトウェアカートでのみ提供されます。|Monri 設定|Monri WebPay によるホスト型カードチェックアウト。|Monri 認証情報は次から読み込まれます|この統合は Payment API ではなく Monri Redirect Form を使用します。既定のフォームエンドポイントは支払いモードに従い HTTP POST 先として使われます。ブラウザで直接 GET すると欠落ページが表示されることがあります。次で上書きします|Monri callback を設定先|または設定|準備完了|設定が必要",
  "zh-Hans":
    "添加许可证服务器|添加许可证服务器|保存付费数字商品使用的连接详情，这些商品通过外部 Night Raven License Server 发放密钥。|基础 API URL|客户端 ID|共享密钥|在许可证密钥策略下拉菜单中显示|启用且可见的服务器将可供数字商品选择。|支付|启用结账方式并配置面向买家的支付详情。|货到付款|银行转账|货到付款没有额外凭据或结账文案需要配置。|允许客户在可发货订单送达时付款。|允许客户下单并从其银行账户手动付款。|允许塞尔维亚客户扫描 IPS QR 支付详情即时付款。|将客户重定向到 Monri WebPay 进行托管式银行卡结账。|仅对已映射 Paddle price ID 的数字/软件购物车显示 Paddle Billing。|配置凭据和 webhook 后，在结账时显示 PayPal。|配置 Stripe 凭据和 webhook 后，在结账时显示银行卡支付。|银行转账说明|结账后为手动银行付款显示的说明。|IPS QR 设置|结账后显示的塞尔维亚即时支付详情。|Stripe 设置|密钥和 webhook 密钥从环境变量读取。|PayPal 设置|客户端 ID、客户端密钥和 webhook ID 从环境变量读取。|Paddle 设置|Paddle Billing 凭据从环境变量读取。Paddle 仅用于数字/软件购物车。|Monri 设置|通过 Monri WebPay 托管银行卡结账。|Monri 凭据读取自|此集成使用 Monri Redirect Form，而不是 Payment API。默认表单端点跟随支付模式并用作 HTTP POST 目标；直接浏览器 GET 可能显示缺失页面。使用以下内容覆盖|将 Monri callback 配置为|或设置|就绪|需要设置",
  "zh-Hant":
    "新增授權伺服器|新增授權伺服器|儲存付費數位商品使用的連線詳細資料，這些商品會透過外部 Night Raven License Server 發放金鑰。|基礎 API URL|客戶端 ID|共用密鑰|在授權金鑰政策下拉選單中顯示|啟用且可見的伺服器將可供數位商品選擇。|付款|啟用結帳方式並設定買家可見的付款詳細資料。|貨到付款|銀行轉帳|貨到付款沒有額外憑證或結帳文案需要設定。|允許客戶在可出貨訂單送達時付款。|允許客戶下單並從銀行帳戶手動付款。|允許塞爾維亞客戶掃描 IPS QR 付款詳細資料即時付款。|將客戶重新導向到 Monri WebPay 進行託管式卡片結帳。|僅對已對應 Paddle price ID 的數位/軟體購物車顯示 Paddle Billing。|設定憑證和 webhook 後，在結帳時顯示 PayPal。|設定 Stripe 憑證和 webhook 後，在結帳時顯示卡片付款。|銀行轉帳說明|結帳後為手動銀行付款顯示的說明。|IPS QR 設定|結帳後顯示的塞爾維亞即時付款詳細資料。|Stripe 設定|密鑰和 webhook 密鑰會從環境變數讀取。|PayPal 設定|客戶端 ID、客戶端密鑰和 webhook ID 會從環境變數讀取。|Paddle 設定|Paddle Billing 憑證會從環境變數讀取。Paddle 僅提供給數位/軟體購物車。|Monri 設定|透過 Monri WebPay 進行託管式卡片結帳。|Monri 憑證讀取自|此整合使用 Monri Redirect Form，而不是 Payment API。預設表單端點會跟隨付款模式，並作為 HTTP POST 目標；直接瀏覽器 GET 可能顯示缺少頁面。使用以下內容覆寫|將 Monri callback 設定為|或設定|就緒|需要設定",
  ar: "إضافة خادم تراخيص|إضافة خادم تراخيص|احفظ تفاصيل الاتصال التي تستخدمها المنتجات الرقمية المدفوعة التي تصدر المفاتيح عبر Night Raven License Server خارجي.|عنوان API الأساسي|معرّف العميل|سر مشترك|إظهار في قائمة سياسة مفتاح الترخيص المنسدلة|تصبح الخوادم النشطة والمرئية قابلة للاختيار للمنتجات الرقمية.|المدفوعات|فعّل طرق checkout واضبط تفاصيل الدفع المعروضة للمشتري.|الدفع عند الاستلام|تحويل بنكي|الدفع عند الاستلام لا يتطلب بيانات اعتماد إضافية أو نص checkout للتكوين.|يسمح للعملاء بالدفع عند تسليم طلب قابل للشحن.|يسمح للعملاء بإنشاء الطلبات والدفع يدويًا من حسابهم البنكي.|يسمح للعملاء في صربيا بالدفع فورًا عبر مسح تفاصيل دفع IPS QR.|يعيد توجيه العملاء إلى Monri WebPay من أجل checkout بطاقة مستضاف.|يعرض Paddle Billing فقط لسلال رقمية/برمجية لها Paddle price IDs مربوطة.|يعرض PayPal في checkout عند تكوين بيانات الاعتماد وwebhooks.|يعرض الدفع بالبطاقة في checkout عند تكوين بيانات Stripe وwebhooks.|تعليمات التحويل البنكي|تعليمات تظهر بعد checkout للمدفوعات البنكية اليدوية.|إعداد IPS QR|تفاصيل الدفع الفوري الصربي المعروضة بعد checkout.|إعداد Stripe|تتم قراءة المفتاح السري وسر webhook من متغيرات البيئة.|إعداد PayPal|تتم قراءة معرّف العميل وسر العميل ومعرّف webhook من متغيرات البيئة.|إعداد Paddle|تتم قراءة بيانات Paddle Billing من متغيرات البيئة. يتوفر Paddle فقط للسلال الرقمية/البرمجية.|إعداد Monri|checkout بطاقة مستضاف عبر Monri WebPay.|تتم قراءة بيانات Monri من|يستخدم هذا التكامل Monri Redirect Form وليس Payment API. يتبع endpoint النموذج الافتراضي وضع الدفع ويُستخدم كهدف HTTP POST؛ قد يعرض GET مباشر من المتصفح صفحة مفقودة. استبدله بـ|تكوين Monri callback إلى|أو اضبط|جاهز|يتطلب إعدادًا",
  id: "Tambahkan server lisensi|Tambahkan server lisensi|Simpan detail koneksi yang digunakan produk digital berbayar yang menerbitkan kunci melalui Night Raven License Server eksternal.|URL API dasar|ID klien|Rahasia bersama|Tampilkan di menu dropdown kebijakan kunci lisensi|Server aktif yang terlihat dapat dipilih untuk produk digital.|Pembayaran|Aktifkan metode checkout dan konfigurasi detail pembayaran yang dilihat pembeli.|Bayar di tempat|Transfer bank|Bayar di tempat tidak memiliki kredensial tambahan atau teks checkout untuk dikonfigurasi.|Memungkinkan pelanggan membayar saat pesanan yang dapat dikirim telah diantar.|Memungkinkan pelanggan membuat pesanan dan membayar manual dari rekening bank mereka.|Memungkinkan pelanggan Serbia membayar instan dengan memindai detail pembayaran IPS QR.|Mengalihkan pelanggan ke Monri WebPay untuk checkout kartu yang dihosting.|Menampilkan Paddle Billing hanya untuk keranjang digital/software dengan Paddle price ID yang dipetakan.|Menampilkan PayPal saat checkout ketika kredensial dan webhook sudah dikonfigurasi.|Menampilkan pembayaran kartu saat checkout ketika kredensial Stripe dan webhook sudah dikonfigurasi.|Instruksi transfer bank|Instruksi yang ditampilkan setelah checkout untuk pembayaran bank manual.|Pengaturan IPS QR|Detail pembayaran instan Serbia yang ditampilkan setelah checkout.|Pengaturan Stripe|Kunci rahasia dan rahasia webhook dibaca dari variabel lingkungan.|Pengaturan PayPal|ID klien, rahasia klien, dan ID webhook dibaca dari variabel lingkungan.|Pengaturan Paddle|Kredensial Paddle Billing dibaca dari variabel lingkungan. Paddle hanya ditawarkan untuk keranjang digital/software.|Pengaturan Monri|Checkout kartu yang dihosting melalui Monri WebPay.|Kredensial Monri dibaca dari|Integrasi ini menggunakan Monri Redirect Form, bukan Payment API. Endpoint form default mengikuti mode pembayaran dan digunakan sebagai target HTTP POST; GET browser langsung dapat menampilkan halaman hilang. Timpa dengan|Konfigurasikan callback Monri ke|atau atur|Siap|Perlu pengaturan",
  cs: "Přidat licenční server|Přidat licenční server|Uložte údaje připojení používané placenými digitálními produkty, které vydávají klíče přes externí Night Raven License Server.|Základní API URL|ID klienta|Sdílené tajemství|Zobrazit v rozbalovací nabídce zásad licenčního klíče|Aktivní viditelné servery půjde vybrat pro digitální produkty.|Platby|Zapněte metody checkoutu a nastavte platební údaje viditelné kupujícímu.|Dobírka|Bankovní převod|Dobírka nemá žádné další přihlašovací údaje ani checkout text ke konfiguraci.|Umožní zákazníkům zaplatit při doručení odesílatelné objednávky.|Umožní zákazníkům zadat objednávku a zaplatit ručně ze svého bankovního účtu.|Umožní srbským zákazníkům okamžitě zaplatit naskenováním IPS QR platebních údajů.|Přesměruje zákazníky na Monri WebPay pro hostovaný kartový checkout.|Zobrazí Paddle Billing pouze pro digitální/software košíky s namapovanými Paddle price ID.|Zobrazí PayPal v checkoutu, když jsou nakonfigurovány přihlašovací údaje a webhooky.|Zobrazí platbu kartou v checkoutu, když jsou nakonfigurovány údaje Stripe a webhooky.|Pokyny k bankovnímu převodu|Pokyny zobrazené po checkoutu pro ruční bankovní platby.|Nastavení IPS QR|Srbské okamžité platební údaje zobrazené po checkoutu.|Nastavení Stripe|Tajný klíč a webhook secret se čtou z proměnných prostředí.|Nastavení PayPal|ID klienta, tajemství klienta a webhook ID se čtou z proměnných prostředí.|Nastavení Paddle|Přihlašovací údaje Paddle Billing se čtou z proměnných prostředí. Paddle je nabízen jen pro digitální/software košíky.|Nastavení Monri|Hostovaný kartový checkout přes Monri WebPay.|Přihlašovací údaje Monri se čtou z|Tato integrace používá Monri Redirect Form, ne Payment API. Výchozí endpoint formuláře sleduje režim platby a používá se jako cíl HTTP POST; přímý browser GET může zobrazit chybějící stránku. Přepište jej pomocí|Nastavit Monri callback na|nebo nastavte|Připraveno|Vyžaduje nastavení",
  ro: "Adaugă server de licențe|Adaugă server de licențe|Salvează detaliile de conexiune folosite de produsele digitale plătite care emit chei printr-un Night Raven License Server extern.|URL API de bază|ID client|Secret partajat|Afișează în meniul derulant al politicii cheii de licență|Serverele active și vizibile devin selectabile pentru produse digitale.|Plăți|Activează metodele de checkout și configurează detaliile de plată vizibile cumpărătorului.|Plată la livrare|Transfer bancar|Plata la livrare nu are credențiale suplimentare sau text de checkout de configurat.|Permite clienților să plătească atunci când o comandă expediabilă este livrată.|Permite clienților să plaseze comenzi și să plătească manual din contul bancar.|Permite clienților sârbi să plătească instant scanând detaliile IPS QR.|Redirecționează clienții către Monri WebPay pentru checkout card găzduit.|Afișează Paddle Billing doar pentru coșuri digitale/software cu ID-uri de preț Paddle mapate.|Afișează PayPal la checkout când credențialele și webhookurile sunt configurate.|Afișează plata cu cardul la checkout când credențialele Stripe și webhookurile sunt configurate.|Instrucțiuni de transfer bancar|Instrucțiuni afișate după checkout pentru plăți bancare manuale.|Configurare IPS QR|Detalii de plată instant sârbească afișate după checkout.|Configurare Stripe|Cheia secretă și secretul webhook sunt citite din variabile de mediu.|Configurare PayPal|ID-ul clientului, secretul clientului și ID-ul webhook sunt citite din variabile de mediu.|Configurare Paddle|Credențialele Paddle Billing sunt citite din variabile de mediu. Paddle este oferit doar pentru coșuri digitale/software.|Configurare Monri|Checkout card găzduit prin Monri WebPay.|Credențialele Monri sunt citite din|Această integrare folosește Monri Redirect Form, nu Payment API. Endpointul implicit al formularului urmează modul de plată și este folosit ca țintă HTTP POST; un browser GET direct poate afișa o pagină lipsă. Suprascrie-l cu|Configurează callback Monri către|sau setează|Gata|Necesită configurare",
  el: "Προσθήκη διακομιστή αδειών|Προσθήκη διακομιστή αδειών|Αποθηκεύστε τα στοιχεία σύνδεσης που χρησιμοποιούν πληρωμένα ψηφιακά προϊόντα που εκδίδουν κλειδιά μέσω εξωτερικού Night Raven License Server.|Βασικό API URL|ID πελάτη|Κοινό μυστικό|Εμφάνιση στο αναπτυσσόμενο μενού πολιτικής κλειδιού άδειας|Οι ενεργοί ορατοί διακομιστές γίνονται επιλέξιμοι για ψηφιακά προϊόντα.|Πληρωμές|Ενεργοποιήστε μεθόδους checkout και ρυθμίστε στοιχεία πληρωμής που βλέπει ο αγοραστής.|Αντικαταβολή|Τραπεζική μεταφορά|Η αντικαταβολή δεν έχει πρόσθετα διαπιστευτήρια ή κείμενο checkout για ρύθμιση.|Επιτρέπει στους πελάτες να πληρώνουν όταν παραδίδεται αποστέλλσιμη παραγγελία.|Επιτρέπει στους πελάτες να κάνουν παραγγελίες και να πληρώνουν χειροκίνητα από τον τραπεζικό λογαριασμό τους.|Επιτρέπει σε Σέρβους πελάτες να πληρώνουν άμεσα σαρώνοντας στοιχεία πληρωμής IPS QR.|Ανακατευθύνει τους πελάτες στο Monri WebPay για φιλοξενούμενο checkout κάρτας.|Εμφανίζει Paddle Billing μόνο για ψηφιακά/software καλάθια με αντιστοιχισμένα Paddle price ID.|Εμφανίζει PayPal στο checkout όταν έχουν ρυθμιστεί διαπιστευτήρια και webhooks.|Εμφανίζει πληρωμή με κάρτα στο checkout όταν έχουν ρυθμιστεί διαπιστευτήρια Stripe και webhooks.|Οδηγίες τραπεζικής μεταφοράς|Οδηγίες που εμφανίζονται μετά το checkout για χειροκίνητες τραπεζικές πληρωμές.|Ρύθμιση IPS QR|Στοιχεία σερβικής άμεσης πληρωμής που εμφανίζονται μετά το checkout.|Ρύθμιση Stripe|Το μυστικό κλειδί και το μυστικό webhook διαβάζονται από μεταβλητές περιβάλλοντος.|Ρύθμιση PayPal|Το ID πελάτη, το μυστικό πελάτη και το webhook ID διαβάζονται από μεταβλητές περιβάλλοντος.|Ρύθμιση Paddle|Τα διαπιστευτήρια Paddle Billing διαβάζονται από μεταβλητές περιβάλλοντος. Το Paddle προσφέρεται μόνο για ψηφιακά/software καλάθια.|Ρύθμιση Monri|Φιλοξενούμενο checkout κάρτας μέσω Monri WebPay.|Τα διαπιστευτήρια Monri διαβάζονται από|Αυτή η ενσωμάτωση χρησιμοποιεί Monri Redirect Form, όχι Payment API. Το προεπιλεγμένο endpoint φόρμας ακολουθεί τη λειτουργία πληρωμής και χρησιμοποιείται ως στόχος HTTP POST· ένα άμεσο browser GET μπορεί να εμφανίσει σελίδα που λείπει. Παρακάμψτε το με|Ρύθμιση Monri callback σε|ή ορίστε|Έτοιμο|Απαιτεί ρύθμιση",
  da: "Tilføj licensserver|Tilføj licensserver|Gem forbindelsesoplysningerne, som bruges af betalte digitale produkter, der udsteder nøgler via en ekstern Night Raven License Server.|Basis-API-URL|Klient-id|Delt hemmelighed|Vis i rullemenuen for licensnøglepolitik|Aktive synlige servere kan vælges for digitale produkter.|Betalinger|Aktivér checkoutmetoder, og konfigurer betalingsoplysninger, som køberen ser.|Betaling ved levering|Bankoverførsel|Betaling ved levering har ingen ekstra legitimationsoplysninger eller checkouttekst at konfigurere.|Lader kunder betale, når en forsendelsesbar ordre er leveret.|Lader kunder afgive ordrer og betale manuelt fra deres bankkonto.|Lader serbiske kunder betale straks ved at scanne IPS QR-betalingsoplysninger.|Omdirigerer kunder til Monri WebPay for hosted kortcheckout.|Viser Paddle Billing kun for digitale/softwarekurve med mappede Paddle price ID'er.|Viser PayPal i checkout, når legitimationsoplysninger og webhooks er konfigureret.|Viser kortbetaling i checkout, når Stripe-legitimationsoplysninger og webhooks er konfigureret.|Instruktioner til bankoverførsel|Instruktioner vist efter checkout for manuelle bankbetalinger.|IPS QR-opsætning|Serbiske strakbetalingsoplysninger vist efter checkout.|Stripe-opsætning|Hemmelig nøgle og webhook-hemmelighed læses fra miljøvariabler.|PayPal-opsætning|Klient-id, klienthemmelighed og webhook-id læses fra miljøvariabler.|Paddle-opsætning|Paddle Billing-legitimationsoplysninger læses fra miljøvariabler. Paddle tilbydes kun for digitale/softwarekurve.|Monri-opsætning|Hosted kortcheckout via Monri WebPay.|Monri-legitimationsoplysninger læses fra|Denne integration bruger Monri Redirect Form, ikke Payment API. Standardformularendpointet følger betalingsmodus og bruges som HTTP POST-mål; et direkte browser GET kan vise en manglende side. Tilsidesæt det med|Konfigurer Monri-callback til|eller angiv|Klar|Kræver opsætning",
  sv: "Lägg till licensserver|Lägg till licensserver|Spara anslutningsuppgifterna som används av betalda digitala produkter som utfärdar nycklar via en extern Night Raven License Server.|Bas-API-URL|Klient-ID|Delad hemlighet|Visa i rullgardinsmenyn för licensnyckelpolicy|Aktiva synliga servrar blir valbara för digitala produkter.|Betalningar|Aktivera checkoutmetoder och konfigurera betalningsuppgifter som köparen ser.|Betalning vid leverans|Banköverföring|Betalning vid leverans har inga extra autentiseringsuppgifter eller checkouttext att konfigurera.|Låter kunder betala när en leveransbar order levereras.|Låter kunder lägga order och betala manuellt från sitt bankkonto.|Låter serbiska kunder betala direkt genom att skanna IPS QR-betalningsuppgifter.|Omdirigerar kunder till Monri WebPay för hostad kortcheckout.|Visar Paddle Billing endast för digitala/programvarukorgar med mappade Paddle price ID:n.|Visar PayPal i checkout när autentiseringsuppgifter och webhooks är konfigurerade.|Visar kortbetalning i checkout när Stripe-uppgifter och webhooks är konfigurerade.|Instruktioner för banköverföring|Instruktioner som visas efter checkout för manuella bankbetalningar.|IPS QR-inställning|Serbiska direktbetalningsuppgifter som visas efter checkout.|Stripe-inställning|Hemlig nyckel och webhook-hemlighet läses från miljövariabler.|PayPal-inställning|Klient-ID, klienthemlighet och webhook-ID läses från miljövariabler.|Paddle-inställning|Paddle Billing-uppgifter läses från miljövariabler. Paddle erbjuds endast för digitala/programvarukorgar.|Monri-inställning|Hostad kortcheckout via Monri WebPay.|Monri-uppgifter läses från|Denna integration använder Monri Redirect Form, inte Payment API. Standardformulärets endpoint följer betalningsläget och används som HTTP POST-mål; en direkt browser GET kan visa en saknad sida. Åsidosätt den med|Konfigurera Monri-callback till|eller ange|Redo|Kräver inställning",
  nb: "Legg til lisensserver|Legg til lisensserver|Lagre tilkoblingsdetaljene som brukes av betalte digitale produkter som utsteder nøkler via en ekstern Night Raven License Server.|Basis-API-URL|Klient-ID|Delt hemmelighet|Vis i rullegardinmenyen for lisensnøkkelpolicy|Aktive synlige servere kan velges for digitale produkter.|Betalinger|Aktiver checkoutmetoder og konfigurer betalingsdetaljer som kjøperen ser.|Betaling ved levering|Bankoverføring|Betaling ved levering har ingen ekstra legitimasjon eller checkouttekst å konfigurere.|Lar kunder betale når en sendbar ordre er levert.|Lar kunder legge inn bestillinger og betale manuelt fra bankkontoen sin.|Lar serbiske kunder betale umiddelbart ved å skanne IPS QR-betalingsdetaljer.|Omdirigerer kunder til Monri WebPay for hostet kortcheckout.|Viser Paddle Billing bare for digitale/programvarekurver med mappede Paddle price ID-er.|Viser PayPal i checkout når legitimasjon og webhooks er konfigurert.|Viser kortbetaling i checkout når Stripe-legitimasjon og webhooks er konfigurert.|Instruksjoner for bankoverføring|Instruksjoner vist etter checkout for manuelle bankbetalinger.|IPS QR-oppsett|Serbiske umiddelbare betalingsdetaljer vist etter checkout.|Stripe-oppsett|Hemmelig nøkkel og webhook-hemmelighet leses fra miljøvariabler.|PayPal-oppsett|Klient-ID, klienthemmelighet og webhook-ID leses fra miljøvariabler.|Paddle-oppsett|Paddle Billing-legitimasjon leses fra miljøvariabler. Paddle tilbys bare for digitale/programvarekurver.|Monri-oppsett|Hostet kortcheckout via Monri WebPay.|Monri-legitimasjon leses fra|Denne integrasjonen bruker Monri Redirect Form, ikke Payment API. Standard form-endepunkt følger betalingsmodus og brukes som HTTP POST-mål; en direkte browser GET kan vise en manglende side. Overstyr det med|Konfigurer Monri-callback til|eller sett|Klar|Krever oppsett",
  nn: "Legg til lisensserver|Legg til lisensserver|Lagra tilkoplingsdetaljane som blir brukte av betalte digitale produkt som utferdar nøklar via ein ekstern Night Raven License Server.|Basis-API-URL|Klient-ID|Delt løyndom|Vis i nedtrekksmenyen for lisensnøkkelpolicy|Aktive synlege serverar kan veljast for digitale produkt.|Betalingar|Aktiver checkoutmetodar og konfigurer betalingsdetaljar som kjøparen ser.|Betaling ved levering|Bankoverføring|Betaling ved levering har ingen ekstra legitimasjon eller checkouttekst å konfigurera.|Lèt kundar betala når ei sendbar bestilling er levert.|Lèt kundar leggja inn bestillingar og betala manuelt frå bankkontoen sin.|Lèt serbiske kundar betala straks ved å skanna IPS QR-betalingsdetaljar.|Omdirigerer kundar til Monri WebPay for hosta kortcheckout.|Viser Paddle Billing berre for digitale/programvarekorger med mappa Paddle price ID-ar.|Viser PayPal i checkout når legitimasjon og webhooks er konfigurerte.|Viser kortbetaling i checkout når Stripe-legitimasjon og webhooks er konfigurerte.|Instruksjonar for bankoverføring|Instruksjonar viste etter checkout for manuelle bankbetalingar.|IPS QR-oppsett|Serbiske straksbetalingsdetaljar viste etter checkout.|Stripe-oppsett|Hemmeleg nøkkel og webhook-løyndom blir lesne frå miljøvariablar.|PayPal-oppsett|Klient-ID, klientløyndom og webhook-ID blir lesne frå miljøvariablar.|Paddle-oppsett|Paddle Billing-legitimasjon blir lesen frå miljøvariablar. Paddle blir berre tilbode for digitale/programvarekorger.|Monri-oppsett|Hosta kortcheckout via Monri WebPay.|Monri-legitimasjon blir lesen frå|Denne integrasjonen brukar Monri Redirect Form, ikkje Payment API. Standard form-endepunkt følgjer betalingsmodus og blir brukt som HTTP POST-mål; ein direkte browser GET kan visa ei manglande side. Overstyr det med|Konfigurer Monri-callback til|eller set|Klar|Krev oppsett",
  fi: "Lisää lisenssipalvelin|Lisää lisenssipalvelin|Tallenna yhteystiedot, joita maksulliset digitaaliset tuotteet käyttävät avainten myöntämiseen ulkoisen Night Raven License Serverin kautta.|Perus-API-URL|Asiakas-ID|Jaettu salaisuus|Näytä lisenssiavaimen käytännön pudotusvalikossa|Aktiiviset näkyvät palvelimet ovat valittavissa digitaalisille tuotteille.|Maksut|Ota checkout-menetelmät käyttöön ja määritä ostajalle näkyvät maksutiedot.|Maksu toimitettaessa|Pankkisiirto|Maksu toimitettaessa ei sisällä lisätunnuksia tai checkout-tekstiä määritettäväksi.|Antaa asiakkaiden maksaa, kun lähetettävä tilaus toimitetaan.|Antaa asiakkaiden tehdä tilauksia ja maksaa manuaalisesti pankkitililtään.|Antaa serbialaisten asiakkaiden maksaa heti skannaamalla IPS QR -maksutiedot.|Ohjaa asiakkaat Monri WebPayhin hostattua kortti-checkoutia varten.|Näyttää Paddle Billingin vain digitaalisille/ohjelmistokoreille, joilla on mapatut Paddle price ID:t.|Näyttää PayPalin checkoutissa, kun tunnukset ja webhookit on määritetty.|Näyttää korttimaksun checkoutissa, kun Stripe-tunnukset ja webhookit on määritetty.|Pankkisiirron ohjeet|Checkoutin jälkeen näytettävät ohjeet manuaalisille pankkimaksuille.|IPS QR -asetukset|Checkoutin jälkeen näytettävät serbialaiset pikamaksutiedot.|Stripe-asetukset|Salainen avain ja webhook-salaisuus luetaan ympäristömuuttujista.|PayPal-asetukset|Asiakas-ID, asiakkaan salaisuus ja webhook-ID luetaan ympäristömuuttujista.|Paddle-asetukset|Paddle Billing -tunnukset luetaan ympäristömuuttujista. Paddle tarjotaan vain digitaalisille/ohjelmistokoreille.|Monri-asetukset|Hostattu kortti-checkout Monri WebPayn kautta.|Monri-tunnukset luetaan kohteesta|Tämä integraatio käyttää Monri Redirect Formia, ei Payment APIa. Oletuslomakkeen endpoint seuraa maksutilaa ja sitä käytetään HTTP POST -kohteena; suora browser GET voi näyttää puuttuvan sivun. Korvaa se arvolla|Määritä Monri-callback kohteeseen|tai aseta|Valmis|Asetus vaaditaan",
  is: "Bæta við leyfisþjóni|Bæta við leyfisþjóni|Vistaðu tengiupplýsingar sem greiddar stafrænar vörur nota til að gefa út lykla í gegnum ytri Night Raven License Server.|Grunn-API-slóð|Biðlara-ID|Sameiginlegt leyndarmál|Sýna í fellivalmynd stefnu leyfislykils|Virkir sýnilegir þjónar verða valhæfir fyrir stafrænar vörur.|Greiðslur|Virkjaðu checkout-aðferðir og stilltu greiðsluupplýsingar sem kaupandi sér.|Greitt við afhendingu|Bankamillifærsla|Greitt við afhendingu hefur engin auka auðkenni eða checkout-texta til að stilla.|Leyfir viðskiptavinum að greiða þegar sendanleg pöntun er afhent.|Leyfir viðskiptavinum að leggja inn pantanir og greiða handvirkt af bankareikningi sínum.|Leyfir serbneskum viðskiptavinum að greiða strax með því að skanna IPS QR greiðsluupplýsingar.|Beinir viðskiptavinum á Monri WebPay fyrir hýst korta-checkout.|Sýnir Paddle Billing aðeins fyrir stafrænar/hugbúnaðar körfur með kortlögðum Paddle price ID.|Sýnir PayPal í checkout þegar auðkenni og webhooks eru stillt.|Sýnir kortagreiðslu í checkout þegar Stripe-auðkenni og webhooks eru stillt.|Leiðbeiningar fyrir bankamillifærslu|Leiðbeiningar birtar eftir checkout fyrir handvirkar bankagreiðslur.|IPS QR stilling|Serbneskar tafarlausar greiðsluupplýsingar birtar eftir checkout.|Stripe stilling|Leynilykill og webhook leyndarmál eru lesin úr umhverfisbreytum.|PayPal stilling|Biðlara-ID, biðlaraleyndarmál og webhook-ID eru lesin úr umhverfisbreytum.|Paddle stilling|Paddle Billing auðkenni eru lesin úr umhverfisbreytum. Paddle er aðeins boðið fyrir stafrænar/hugbúnaðar körfur.|Monri stilling|Hýst korta-checkout í gegnum Monri WebPay.|Monri auðkenni eru lesin úr|Þessi samþætting notar Monri Redirect Form, ekki Payment API. Sjálfgefinn form-endapunktur fylgir greiðsluham og er notaður sem HTTP POST mark; beint browser GET getur sýnt síðu sem vantar. Yfirskrifaðu það með|Stilla Monri callback á|eða stilla|Tilbúið|Stilling krafist",
} satisfies Record<PaymentAndLicenseRowLanguage, string>;

const PAYMENT_CONFIG_ROWS = {
  "sr-Latn":
    "Tajni ključ|Webhook tajna|Kredencijali klijenta|Webhook ID|API ključ|Klijentski token|Postavi Paddle odredište obaveštenja na|Mapiraj digitalne proizvode ili SKU-ove na Paddle price ID-jeve u editoru proizvoda.|Endpoint forme|Token autentičnosti|Merchant ključ|Zamena callback URL-a|Podesi|i",
  hr: "Tajni ključ|Webhook tajna|Vjerodajnice klijenta|Webhook ID|API ključ|Klijentski token|Postavi Paddle odredište obavijesti na|Mapiraj digitalne proizvode ili SKU-ove na Paddle price ID-jeve u editoru proizvoda.|Endpoint forme|Token autentičnosti|Merchant ključ|Zamjena callback URL-a|Podesi|i",
  de: "Geheimer Schlüssel|Webhook-Geheimnis|Client-Zugangsdaten|Webhook-ID|API-Schlüssel|Clientseitiges Token|Paddle-Benachrichtigungsziel setzen auf|Ordne digitale Produkte oder SKUs im Produkteditor Paddle-Preis-IDs zu.|Formularendpunkt|Authentizitätstoken|Merchant-Schlüssel|Callback-URL-Override|Konfigurieren|und",
  fr: "Clé secrète|Secret webhook|Identifiants client|ID webhook|Clé API|Jeton côté client|Définir la destination des notifications Paddle sur|Associez les produits numériques ou SKU aux ID de prix Paddle dans l'éditeur de produit.|Point de terminaison du formulaire|Jeton d'authenticité|Clé marchand|Remplacement de l'URL de callback|Configurer|et",
  es: "Clave secreta|Secreto de webhook|Credenciales del cliente|ID de webhook|Clave API|Token del lado del cliente|Establecer el destino de notificaciones de Paddle en|Asigna productos digitales o SKUs a IDs de precio Paddle en el editor de productos.|Endpoint del formulario|Token de autenticidad|Clave de comerciante|Sobrescritura de URL de callback|Configurar|y",
  it: "Chiave segreta|Segreto webhook|Credenziali client|ID webhook|Chiave API|Token lato client|Imposta la destinazione delle notifiche Paddle su|Mappa prodotti digitali o SKU agli ID prezzo Paddle nell'editor prodotto.|Endpoint del modulo|Token di autenticità|Chiave merchant|Override URL callback|Configura|e",
  pt: "Chave secreta|Segredo webhook|Credenciais do cliente|ID webhook|Chave API|Token do lado do cliente|Definir o destino de notificações Paddle para|Mapeia produtos digitais ou SKUs para IDs de preço Paddle no editor de produto.|Endpoint do formulário|Token de autenticidade|Chave do comerciante|Substituição do URL de callback|Configurar|e",
  "pt-BR":
    "Chave secreta|Segredo de webhook|Credenciais do cliente|ID do webhook|Chave API|Token do lado do cliente|Definir o destino de notificações Paddle como|Mapeie produtos digitais ou SKUs para IDs de preço Paddle no editor de produto.|Endpoint do formulário|Token de autenticidade|Chave do comerciante|Substituição da URL de callback|Configurar|e",
  nl: "Geheime sleutel|Webhookgeheim|Clientreferenties|Webhook-ID|API-sleutel|Client-side token|Stel de Paddle-meldingsbestemming in op|Koppel digitale producten of SKU's aan Paddle-prijs-ID's in de producteditor.|Formuliereindpunt|Authenticiteitstoken|Merchant-sleutel|Callback-URL-override|Configureren|en",
  pl: "Klucz tajny|Sekret webhooka|Dane klienta|ID webhooka|Klucz API|Token po stronie klienta|Ustaw miejsce docelowe powiadomień Paddle na|Przypisz produkty cyfrowe lub SKU do ID cen Paddle w edytorze produktu.|Endpoint formularza|Token autentyczności|Klucz sprzedawcy|Nadpisanie URL callback|Konfiguruj|i",
  tr: "Gizli anahtar|Webhook sırrı|İstemci kimlik bilgileri|Webhook ID|API anahtarı|İstemci tarafı token|Paddle bildirim hedefini şuraya ayarla|Dijital ürünleri veya SKU'ları ürün editöründe Paddle fiyat ID'lerine eşle.|Form endpoint'i|Doğruluk tokenı|Merchant anahtarı|Callback URL geçersiz kılma|Yapılandır|ve",
  mk: "Таен клуч|Webhook тајна|Креденцијали на клиент|Webhook ID|API клуч|Клиентски token|Постави Paddle дестинација за известувања на|Мапирај дигитални производи или SKU кон Paddle price ID во уредувачот на производи.|Endpoint на форма|Token за автентичност|Merchant клуч|Замена на callback URL|Конфигурирај|и",
  bs: "Tajni ključ|Webhook tajna|Kredencijali klijenta|Webhook ID|API ključ|Klijentski token|Postavi Paddle odredište obavještenja na|Mapiraj digitalne proizvode ili SKU-ove na Paddle price ID-jeve u editoru proizvoda.|Endpoint forme|Token autentičnosti|Merchant ključ|Zamjena callback URL-a|Podesi|i",
  sl: "Skrivni ključ|Webhook skrivnost|Poverilnice odjemalca|Webhook ID|API ključ|Token na strani odjemalca|Nastavi cilj obvestil Paddle na|Preslikaj digitalne izdelke ali SKU-je na Paddle price ID-je v urejevalniku izdelka.|Končna točka obrazca|Token pristnosti|Merchant ključ|Prepis callback URL-ja|Nastavi|in",
  ru: "Секретный ключ|Webhook secret|Учетные данные клиента|Webhook ID|API-ключ|Клиентский токен|Задать назначение уведомлений Paddle на|Сопоставьте цифровые продукты или SKU с Paddle price ID в редакторе продукта.|Endpoint формы|Токен подлинности|Ключ продавца|Переопределение callback URL|Настроить|и",
  hu: "Titkos kulcs|Webhook titok|Kliens hitelesítő adatok|Webhook ID|API-kulcs|Kliensoldali token|Paddle értesítési cél beállítása erre|Rendelj digitális termékeket vagy SKU-kat Paddle price ID-khez a termékszerkesztőben.|Űrlap endpoint|Hitelességi token|Merchant kulcs|Callback URL felülírás|Konfigurálás|és",
  bg: "Таен ключ|Webhook тайна|Клиентски данни|Webhook ID|API ключ|Клиентски token|Задай дестинацията за Paddle известия на|Свържи дигитални продукти или SKU с Paddle price ID в редактора на продукта.|Endpoint на форма|Token за автентичност|Merchant ключ|Замяна на callback URL|Конфигурирай|и",
  ja: "シークレットキー|Webhook シークレット|クライアント認証情報|Webhook ID|API キー|クライアント側トークン|Paddle 通知先を次に設定|商品エディターでデジタル商品または SKU を Paddle price ID にマッピングします。|フォームエンドポイント|認証トークン|Merchant キー|Callback URL 上書き|設定|および",
  "zh-Hans":
    "密钥|Webhook 密钥|客户端凭据|Webhook ID|API 密钥|客户端令牌|将 Paddle 通知目标设置为|在产品编辑器中将数字产品或 SKU 映射到 Paddle price ID。|表单端点|真实性令牌|商户密钥|Callback URL 覆盖|配置|和",
  "zh-Hant":
    "密鑰|Webhook 密鑰|客戶端憑證|Webhook ID|API 金鑰|客戶端權杖|將 Paddle 通知目的地設為|在產品編輯器中將數位商品或 SKU 對應到 Paddle price ID。|表單端點|真實性權杖|商戶金鑰|Callback URL 覆寫|設定|和",
  ar: "المفتاح السري|سر webhook|بيانات اعتماد العميل|Webhook ID|مفتاح API|رمز من جهة العميل|اضبط وجهة إشعارات Paddle إلى|اربط المنتجات الرقمية أو SKUs بـ Paddle price IDs في محرر المنتج.|Endpoint النموذج|رمز الأصالة|مفتاح التاجر|تجاوز Callback URL|تكوين|و",
  id: "Kunci rahasia|Rahasia webhook|Kredensial klien|Webhook ID|Kunci API|Token sisi klien|Atur tujuan notifikasi Paddle ke|Petakan produk digital atau SKU ke Paddle price ID di editor produk.|Endpoint form|Token autentisitas|Kunci merchant|Override URL callback|Konfigurasi|dan",
  cs: "Tajný klíč|Webhook secret|Přihlašovací údaje klienta|Webhook ID|API klíč|Token na straně klienta|Nastavit cíl oznámení Paddle na|Namapujte digitální produkty nebo SKU na Paddle price ID v editoru produktu.|Endpoint formuláře|Token autenticity|Merchant klíč|Přepsání callback URL|Konfigurovat|a",
  ro: "Cheie secretă|Secret webhook|Credențiale client|Webhook ID|Cheie API|Token client-side|Setează destinația notificărilor Paddle la|Mapează produsele digitale sau SKU-urile la ID-uri de preț Paddle în editorul de produs.|Endpoint formular|Token de autenticitate|Cheie comerciant|Suprascriere URL callback|Configurează|și",
  el: "Μυστικό κλειδί|Μυστικό webhook|Διαπιστευτήρια πελάτη|Webhook ID|Κλειδί API|Token πλευράς πελάτη|Ορισμός προορισμού ειδοποιήσεων Paddle σε|Αντιστοιχίστε ψηφιακά προϊόντα ή SKU σε Paddle price ID στον επεξεργαστή προϊόντος.|Endpoint φόρμας|Token αυθεντικότητας|Κλειδί εμπόρου|Παράκαμψη Callback URL|Ρύθμιση|και",
  da: "Hemmelig nøgle|Webhook-hemmelighed|Klientlegitimation|Webhook-id|API-nøgle|Klientsidetoken|Sæt Paddle-meddelelsesdestination til|Map digitale produkter eller SKU'er til Paddle price ID'er i produkteditoren.|Formularendpunkt|Autenticitetstoken|Merchant-nøgle|Callback-URL-override|Konfigurer|og",
  sv: "Hemlig nyckel|Webhook-hemlighet|Klientuppgifter|Webhook-ID|API-nyckel|Klientsidetoken|Ställ in Paddle-aviseringsdestination till|Mappa digitala produkter eller SKU:er till Paddle price ID:n i produktredigeraren.|Formulärets endpoint|Autenticitetstoken|Merchant-nyckel|Callback-URL-åsidosättning|Konfigurera|och",
  nb: "Hemmelig nøkkel|Webhook-hemmelighet|Klientlegitimasjon|Webhook-ID|API-nøkkel|Klientsidetoken|Sett Paddle-varslingsdestinasjon til|Map digitale produkter eller SKU-er til Paddle price ID-er i produkteditoren.|Formendepunkt|Autentisitetstoken|Merchant-nøkkel|Callback-URL-overstyring|Konfigurer|og",
  nn: "Hemmeleg nøkkel|Webhook-løyndom|Klientlegitimasjon|Webhook-ID|API-nøkkel|Klientsidetoken|Set Paddle-varslingsdestinasjon til|Mapp digitale produkt eller SKU-ar til Paddle price ID-ar i produktredigeraren.|Form-endepunkt|Autentisitetstoken|Merchant-nøkkel|Callback-URL-overstyring|Konfigurer|og",
  fi: "Salainen avain|Webhook-salaisuus|Asiakastunnukset|Webhook-ID|API-avain|Asiakaspuolen token|Aseta Paddle-ilmoitusten kohteeksi|Yhdistä digitaaliset tuotteet tai SKU:t Paddle price ID:ihin tuote-editorissa.|Lomakkeen endpoint|Aitoustoken|Kauppiasavain|Callback URL -ohitus|Määritä|ja",
  is: "Leynilykill|Webhook leyndarmál|Biðlaraauðkenni|Webhook-ID|API-lykill|Token biðlaramegin|Stilltu Paddle tilkynningaáfangastað á|Varpaðu stafrænum vörum eða SKU á Paddle price ID í vörueditor.|Form-endapunktur|Auðkenningartoken|Merchant lykill|Callback URL yfirskrift|Stilla|og",
} satisfies Record<PaymentAndLicenseRowLanguage, string>;

const MONRI_CHECKLIST_ROWS = {
  "sr-Latn":
    "Monri lista spremnosti za produkciju|Koristi ovu listu kada su osnovne env varijable iznad prisutne. Monri zahteva da test integracija i sadržaj veb-prodavnice budu pregledani pre aktivacije produkcionog naloga. Ova aplikacija trenutno implementira Redirect Form; Payment API tok je odvojen.|1. Završi Monri onboarding|Nabavi Monri WebPay testni merchant nalog i popuni pristupne obrasce koje traži Monri ili acquiring banka.|Pokreni kompletnu redirect-form integraciju u test okruženju, zatim obavesti Monri Support kada je veb-prodavnica spremna za pregled.|Sačekaj Monri/banka pregled sajta, potpisivanje ugovora sa bankom, izdavanje TID/MID, 3-D Secure registraciju i aktivaciju produkcionog okruženja.|2. Uskladi veb-prodavnicu|Objavi pravne podatke kompanije, poreske/matične brojeve, registrovanu adresu, adresu veb-prodavnice ako je drugačija, telefon i mejl korisničke podrške.|Objavi uslove prodaje, izjavu o privatnosti, rokove dostave, postupak reklamacija, otkazivanja, povraćaja i uslove plaćanja.|Prikaži samo prihvaćene kartične brendove, obavezne logotipe za kartice i bezbednost plaćanja, i uključi Monri Payments PSP logo/link gde Monri to zahteva.|3. Podesi produkcione tajne|Postavi|samo u produkciji. Drži testne i live kredencijale odvojeno.|Postavi live|iz podešavanja produkcionog merchant API-ja.|Ostavi|nepostavljeno osim ako Monri ne da prilagođen redirect-form endpoint. Live podrazumevani POST cilj je|test podrazumevano je|Ne proveravaj ovaj URL direktnim otvaranjem u browseru.|Ne menjaj form URL Payment API putanjom osim ako provider nije prepisan za taj tok. Payment API koristi|JSON zahteve i|Authorization header.|Izaberi|namerno: koristi|za trenutno plaćanje, ili|samo ako je operacija spremna za capture ili void rezervacija u Monri-ju.|4. Podesi Monri API podešavanja|Serviraj checkout i sve Monri return endpoint-e preko HTTPS-a na finalnom produkcionom domenu.|U Monri merchant profilu uključi redirect na Success URL. Ova aplikacija šalje|po plaćanju i validira vraćeni digest pre ažuriranja statusa plaćanja.|Podesi Callback URL kao|ili postavi isti apsolutni URL u|Ova aplikacija ga šalje Monri-ju kao|za svako plaćanje.|Zatraži od Monri Supporta da podesi webhooks ako ti trebaju declined, refund, void, capture ili tokenization događaji van standardnog approved-transaction callbacka.|5. Proveri test transakcije|Testiraj odobrene Visa, Mastercard, Maestro i 3-D Secure tokove Monri test karticama pre zahteva za produkciono odobrenje.|Testiraj odbijene i otkazane tokove. Odbijena kartica može ostati na Monri formi, zato se ne oslanjaj samo na povratak kupca u prodavnicu.|Potvrdi da callbackovi vraćaju HTTP 200, proveri|SHA-512 potpis i ažuriraj porudžbinu tačno jednom ako Monri ponovi isti callback.|Potvrdi da se Success URL digest proverava prema sirovom enkodovanom URL-u i da falsifikovani ili istekli return URL-ovi ne označavaju porudžbine kao plaćene.|6. Go-live kontrole|Prvo uključi Monri za malu live porudžbinu, usaglasi je u Monri portalu i porudžbini veb-prodavnice, pa ga otvori svim kupcima.|Ograniči pristup live tajnama, rotiraj procurile test vrednosti i drži Monri logove bez brojeva kartica ili osetljivih podataka vlasnika kartice.|Dokumentuj ko rukuje captures, voids, refunds, neuspelim callbackovima, chargebackovima i support eskalacijama sa Monri-jem ili acquiring bankom.|Dokumentacija:|Redirect Form|Payment API|usklađenost veb-prodavnice|merchant tok",
  hr: "Monri popis spremnosti za produkciju|Koristite ovaj popis nakon što su osnovne env varijable iznad prisutne. Monri zahtijeva pregled testne integracije i sadržaja webshopa prije aktivacije produkcijskog računa. Ova aplikacija trenutačno implementira Redirect Form; Payment API tijek je odvojen.|1. Dovršite Monri onboarding|Nabavite Monri WebPay testni merchant račun i ispunite pristupne obrasce koje traži Monri ili acquiring banka.|Pokrenite punu redirect-form integraciju u testnom okruženju, zatim obavijestite Monri Support kada je webshop spreman za pregled.|Pričekajte Monri/bankovnu provjeru web stranice, potpisivanje bankovnog ugovora, izdavanje TID/MID, 3-D Secure registraciju i aktivaciju produkcijskog okruženja.|2. Uskladite webshop|Objavite pravne podatke tvrtke, porezne/matične brojeve, registriranu adresu, adresu webshopa ako je drugačija, telefon i email korisničke podrške.|Objavite uvjete prodaje, izjavu o privatnosti, rokove dostave, obradu prigovora, otkazivanje, povrat i uvjete plaćanja.|Prikažite samo prihvaćene kartične brendove, potrebne logotipe kartica i sigurnosti plaćanja te uključite Monri Payments PSP logo/link gdje Monri to zahtijeva.|3. Konfigurirajte produkcijske tajne|Postavi|samo u produkciji. Testne i live vjerodajnice držite odvojeno.|Postavi live|iz produkcijskih merchant API postavki.|Ostavi|nepostavljeno osim ako Monri ne da prilagođeni redirect-form endpoint. Live zadani POST cilj je|testna zadana vrijednost je|Ne provjeravajte ovaj URL izravnim otvaranjem u pregledniku.|Ne zamjenjujte form URL Payment API putanjom osim ako je provider prepisan za taj tijek. Payment API koristi|JSON zahtjeve i|Authorization header.|Odaberi|namjerno: koristi|za trenutačno plaćanje, ili|samo ako su operacije spremne za capture ili void rezervacija u Monri.|4. Konfigurirajte Monri API postavke|Poslužujte checkout i sve Monri return endpointe preko HTTPS-a na završnoj produkcijskoj domeni.|U Monri merchant profilu omogućite redirect na Success URL. Ova aplikacija šalje|po plaćanju i validira vraćeni digest prije ažuriranja statusa plaćanja.|Konfigurirajte Callback URL kao|ili postavite isti apsolutni URL u|Ova aplikacija ga šalje Monri-ju kao|za svako plaćanje.|Zatražite od Monri Supporta konfiguraciju webhookova ako trebate declined, refund, void, capture ili tokenization događaje izvan standardnog approved-transaction callbacka.|5. Provjerite testne transakcije|Testirajte odobrene Visa, Mastercard, Maestro i 3-D Secure tijekove s Monri testnim karticama prije traženja produkcijskog odobrenja.|Testirajte odbijene i otkazane tijekove. Odbijena kartica može ostati na Monri formi, zato se ne oslanjajte samo na povratak kupca u trgovinu.|Potvrdite da callbackovi vraćaju HTTP 200, provjerite|SHA-512 potpis i ažurirajte narudžbu točno jednom ako Monri ponovi isti callback.|Potvrdite da se Success URL digest provjerava prema sirovo enkodiranom URL-u i da krivotvoreni ili istekli return URL-ovi ne označavaju narudžbe kao plaćene.|6. Go-live kontrole|Najprije omogućite Monri za malu live narudžbu, uskladite je u Monri portalu i narudžbi webshopa, zatim ga otvorite svim kupcima.|Ograničite pristup live tajnama, rotirajte procurjele testne vrijednosti i držite Monri logove bez brojeva kartica ili osjetljivih podataka vlasnika kartice.|Dokumentirajte tko obrađuje captures, voids, refunds, neuspjele callbackove, chargebackove i support eskalacije s Monri-jem ili acquiring bankom.|Dokumentacija:|Redirect Form|Payment API|usklađenost webshopa|merchant tijek",
  de: "Monri-Checkliste für Produktionsbereitschaft|Verwende diese Checkliste, nachdem die grundlegenden Env-Variablen oben vorhanden sind. Monri verlangt, dass Testintegration und Webshop-Inhalte geprüft werden, bevor das Produktionskonto aktiviert wird. Diese App implementiert derzeit Redirect Form; der Payment-API-Ablauf ist separat.|1. Monri-Onboarding abschließen|Beschaffe ein Monri WebPay-Test-Merchant-Konto und fülle die von Monri oder der Acquiring-Bank angeforderten Zugangsformulare aus.|Führe die vollständige Redirect-Form-Integration in der Testumgebung aus und benachrichtige anschließend Monri Support, wenn der Webshop prüfbereit ist.|Warte auf Monri/Bank-Websiteprüfung, Vertragsunterzeichnung, TID/MID-Ausgabe, 3-D Secure-Registrierung und Aktivierung der Produktionsumgebung.|2. Webshop konform machen|Veröffentliche rechtliche Firmendaten, Steuer-/Firmenummern, registrierte Adresse, ggf. abweichende Webshop-Adresse, Telefon und Support-E-Mail.|Veröffentliche Verkaufsbedingungen, Datenschutzerklärung, Lieferzeiten, Reklamationsabwicklung, Stornierung, Rückerstattung und Zahlungsbedingungen.|Zeige nur akzeptierte Kartenmarken, erforderliche Karten- und Zahlungssicherheitslogos und füge das Monri Payments PSP-Logo/Link hinzu, wo Monri es verlangt.|3. Produktionsgeheimnisse konfigurieren|Setzen|nur in Produktion. Halte Test- und Live-Zugangsdaten getrennt.|Live setzen|aus den Produktions-Merchant-API-Einstellungen.|Leer lassen|wenn Monri keinen eigenen Redirect-Form-Endpunkt vorgibt. Das Live-Standard-POST-Ziel ist|der Teststandard ist|Validiere diese URL nicht durch direktes Öffnen im Browser.|Ersetze die Formular-URL nicht durch den Payment-API-Pfad, außer der Provider wird für diesen Ablauf neu geschrieben. Payment API verwendet|JSON-Anfragen und einen|Authorization-Header.|Wähle|bewusst: verwende|für sofortige Zahlung oder|nur wenn der Betrieb bereit ist, Reservierungen in Monri zu erfassen oder zu stornieren.|4. Monri-API-Einstellungen konfigurieren|Stelle Checkout und alle Monri-Return-Endpunkte über HTTPS auf der finalen Produktionsdomain bereit.|Aktiviere im Monri-Merchant-Profil die Weiterleitung zur Success URL. Diese App sendet|pro Zahlung und validiert den zurückgegebenen Digest, bevor der Zahlungsstatus aktualisiert wird.|Konfiguriere die Callback URL als|oder setze dieselbe absolute URL in|Diese App sendet sie an Monri als|für jede Zahlung.|Bitte Monri Support, Webhooks zu konfigurieren, wenn du declined, refund, void, capture oder tokenization events über den Standard-approved-transaction-callback hinaus brauchst.|5. Testtransaktionen prüfen|Teste genehmigte Visa-, Mastercard-, Maestro- und 3-D Secure-Abläufe mit Monri-Testkarten, bevor du Produktionsfreigabe anforderst.|Teste abgelehnte und abgebrochene Abläufe. Eine abgelehnte Karte kann auf dem Monri-Formular bleiben, verlasse dich also nicht nur auf die Rückkehr des Käufers zum Shop.|Bestätige, dass Callbacks HTTP 200 zurückgeben, prüfe die|SHA-512-Signatur und aktualisiere die Bestellung genau einmal, falls Monri denselben Callback erneut sendet.|Bestätige, dass der Success-URL-Digest gegen die rohe kodierte URL geprüft wird und gefälschte oder abgelaufene Return-URLs Bestellungen nicht als bezahlt markieren.|6. Go-live-Kontrollen|Aktiviere Monri zuerst für eine kleine Live-Bestellung, gleiche sie im Monri-Portal und in der Webshop-Bestellung ab und öffne es dann für alle Käufer.|Beschränke Zugriff auf Live-Geheimnisse, rotiere geleakte Testwerte und halte Monri-Logs frei von Kartennummern oder sensiblen Karteninhaberdaten.|Dokumentiere, wer Captures, Voids, Refunds, fehlgeschlagene Callbacks, Chargebacks und Support-Eskalationen mit Monri oder der Acquiring-Bank bearbeitet.|Dokumentation:|Redirect Form|Payment API|Webshop-Compliance|Merchant-Ablauf",
  fr: "Checklist de préparation production Monri|Utilisez cette checklist une fois les variables env de base ci-dessus présentes. Monri exige que l'intégration de test et le contenu de la boutique soient vérifiés avant l'activation du compte production. Cette app implémente actuellement Redirect Form; le flux Payment API est séparé.|1. Terminer l'onboarding Monri|Obtenez un compte marchand test Monri WebPay et remplissez les formulaires d'accès demandés par Monri ou la banque acquéreuse.|Exécutez toute l'intégration redirect-form dans l'environnement test, puis prévenez Monri Support lorsque la boutique est prête pour inspection.|Attendez l'inspection site Monri/banque, la signature du contrat bancaire, l'émission TID/MID, l'inscription 3-D Secure et l'activation de l'environnement production.|2. Rendre la boutique conforme|Publiez les données légales de l'entreprise, numéros fiscaux/société, adresse enregistrée, adresse de boutique si différente, téléphone et email support client.|Publiez les conditions de vente, déclaration de confidentialité, délais de livraison, traitement des réclamations, annulation, remboursement et conditions de paiement.|Affichez seulement les marques de cartes acceptées, les logos requis de carte et sécurité paiement, et incluez le logo/lien Monri Payments PSP lorsque Monri l'exige.|3. Configurer les secrets production|Définir|uniquement en production. Gardez séparés les identifiants test et live.|Définir live|depuis les paramètres API marchand production.|Laisser|non défini sauf si Monri fournit un endpoint redirect-form personnalisé. La cible POST live par défaut est|la valeur test par défaut est|Ne validez pas cette URL en l'ouvrant directement dans le navigateur.|Ne remplacez pas l'URL du formulaire par le chemin Payment API sauf si le provider est réécrit pour ce flux. Payment API utilise|des requêtes JSON et un|en-tête Authorization.|Choisir|délibérément: utiliser|pour un paiement immédiat, ou|seulement si les opérations sont prêtes à capturer ou annuler des réservations dans Monri.|4. Configurer les paramètres API Monri|Servez le checkout et tous les endpoints de retour Monri en HTTPS sur le domaine production final.|Dans le profil marchand Monri, activez la redirection vers la Success URL. Cette app envoie|par paiement et valide le digest retourné avant de mettre à jour l'état du paiement.|Configurez la Callback URL comme|ou définissez la même URL absolue dans|Cette app l'envoie à Monri comme|pour chaque paiement.|Demandez à Monri Support de configurer les webhooks si vous avez besoin des événements declined, refund, void, capture ou tokenization au-delà du callback approved-transaction standard.|5. Vérifier les transactions test|Testez les flux Visa, Mastercard, Maestro et 3-D Secure approuvés avec les cartes test Monri avant de demander l'approbation production.|Testez les flux refusés et annulés. Une carte refusée peut rester sur le formulaire Monri, ne vous fiez donc pas seulement au retour de l'acheteur dans la boutique.|Confirmez que les callbacks retournent HTTP 200, vérifiez la|signature SHA-512 et mettez à jour la commande exactement une fois si Monri réessaie le même callback.|Confirmez que le digest Success URL est vérifié contre l'URL encodée brute et que les return URLs falsifiées ou expirées ne marquent pas les commandes comme payées.|6. Contrôles de mise en production|Activez d'abord Monri pour une petite commande live, rapprochez-la dans le portail Monri et la commande boutique, puis ouvrez à tous les acheteurs.|Restreignez l'accès aux secrets live, faites tourner toute valeur test divulguée et gardez les logs Monri sans numéros de carte ni données sensibles du porteur.|Documentez qui gère captures, voids, refunds, callbacks échoués, chargebacks et escalades support avec Monri ou la banque acquéreuse.|Documentation:|Redirect Form|Payment API|conformité webshop|flux marchand",
  es: "Checklist de preparación para producción de Monri|Usa esta checklist después de que existan las variables env básicas anteriores. Monri exige revisar la integración de prueba y el contenido de la tienda antes de activar la cuenta de producción. Esta app implementa actualmente Redirect Form; el flujo Payment API es separado.|1. Terminar el onboarding de Monri|Obtén una cuenta merchant de prueba Monri WebPay y completa los formularios de acceso solicitados por Monri o el banco adquirente.|Ejecuta la integración redirect-form completa en el entorno de prueba y avisa a Monri Support cuando la tienda esté lista para inspección.|Espera la inspección del sitio por Monri/banco, firma del contrato bancario, emisión TID/MID, registro 3-D Secure y activación del entorno de producción.|2. Hacer la tienda conforme|Publica datos legales de la empresa, números fiscales/empresa, dirección registrada, dirección de la tienda si difiere, teléfono y email de soporte.|Publica condiciones de venta, política de privacidad, tiempos de entrega, gestión de reclamaciones, cancelación, reembolso y condiciones de pago.|Muestra solo marcas de tarjeta aceptadas, logos requeridos de tarjeta y seguridad de pago, e incluye el logo/enlace Monri Payments PSP donde Monri lo requiera.|3. Configurar secretos de producción|Establecer|solo en producción. Mantén separadas las credenciales de prueba y live.|Establecer live|desde la configuración API merchant de producción.|Dejar|sin definir salvo que Monri dé un endpoint redirect-form personalizado. El destino POST live por defecto es|el valor de prueba por defecto es|No valides esta URL abriéndola directamente en el navegador.|No reemplaces la URL del formulario por la ruta Payment API salvo que el provider se reescriba para ese flujo. Payment API usa|solicitudes JSON y un|encabezado Authorization.|Elegir|deliberadamente: usar|para pago inmediato, o|solo si operaciones está lista para capturar o anular reservas en Monri.|4. Configurar ajustes API de Monri|Sirve el checkout y todos los endpoints de retorno de Monri por HTTPS en el dominio final de producción.|En el perfil merchant de Monri, habilita redirección a Success URL. Esta app envía|por pago y valida el digest devuelto antes de actualizar el estado de pago.|Configura la Callback URL como|o establece la misma URL absoluta en|Esta app lo envía a Monri como|para cada pago.|Pide a Monri Support configurar webhooks si necesitas eventos declined, refund, void, capture o tokenization más allá del callback approved-transaction estándar.|5. Verificar transacciones de prueba|Prueba flujos aprobados Visa, Mastercard, Maestro y 3-D Secure con tarjetas de prueba Monri antes de pedir aprobación de producción.|Prueba flujos rechazados y cancelados. Una tarjeta rechazada puede quedarse en el formulario Monri, así que no dependas solo del regreso del comprador a la tienda.|Confirma que los callbacks devuelven HTTP 200, verifica la|firma SHA-512 y actualiza la orden exactamente una vez si Monri reintenta el mismo callback.|Confirma que el digest de Success URL se verifica contra la URL codificada en bruto y que return URLs falsas o expiradas no marcan órdenes como pagadas.|6. Controles go-live|Habilita Monri primero para un pedido live pequeño, concílialo en el portal Monri y en la orden de la tienda, luego ábrelo a todos los compradores.|Restringe acceso a secretos live, rota cualquier valor de prueba filtrado y mantén los logs Monri sin números de tarjeta ni datos sensibles del titular.|Documenta quién gestiona captures, voids, refunds, callbacks fallidos, chargebacks y escalaciones de soporte con Monri o el banco adquirente.|Documentación:|Redirect Form|Payment API|cumplimiento webshop|flujo merchant",
  it: "Checklist di prontezza produzione Monri|Usa questa checklist dopo che le variabili env di base sopra sono presenti. Monri richiede la revisione dell'integrazione di test e dei contenuti del webshop prima dell'attivazione dell'account di produzione. Questa app implementa attualmente Redirect Form; il flusso Payment API è separato.|1. Completa l'onboarding Monri|Ottieni un account merchant di test Monri WebPay e completa i moduli di accesso richiesti da Monri o dalla banca acquirer.|Esegui l'integrazione redirect-form completa nell'ambiente di test, poi avvisa Monri Support quando il webshop è pronto per l'ispezione.|Attendi ispezione sito Monri/banca, firma contratto bancario, emissione TID/MID, registrazione 3-D Secure e attivazione ambiente produzione.|2. Rendi conforme il webshop|Pubblica dati legali aziendali, numeri fiscali/societari, indirizzo registrato, indirizzo webshop se diverso, telefono ed email supporto clienti.|Pubblica condizioni di vendita, informativa privacy, tempi di consegna, gestione reclami, cancellazione, rimborso e condizioni di pagamento.|Mostra solo brand carta accettati, loghi carta e sicurezza pagamento richiesti, e includi logo/link Monri Payments PSP dove richiesto da Monri.|3. Configura i segreti di produzione|Imposta|solo in produzione. Mantieni separate le credenziali test e live.|Imposta live|dalle impostazioni API merchant di produzione.|Lascia|non impostato salvo endpoint redirect-form personalizzato da Monri. La destinazione POST live predefinita è|il default test è|Non validare questo URL aprendolo direttamente nel browser.|Non sostituire l'URL del form con il percorso Payment API salvo riscrittura del provider per quel flusso. Payment API usa|richieste JSON e un|header Authorization.|Scegli|deliberatamente: usa|per pagamento immediato, oppure|solo se operations è pronta a catturare o annullare prenotazioni in Monri.|4. Configura impostazioni API Monri|Servi checkout e tutti gli endpoint di ritorno Monri via HTTPS sul dominio finale di produzione.|Nel profilo merchant Monri abilita redirect alla Success URL. Questa app invia|per pagamento e valida il digest restituito prima di aggiornare lo stato pagamento.|Configura la Callback URL come|oppure imposta lo stesso URL assoluto in|Questa app lo invia a Monri come|per ogni pagamento.|Chiedi a Monri Support di configurare webhooks se servono eventi declined, refund, void, capture o tokenization oltre al callback approved-transaction standard.|5. Verifica transazioni test|Testa flussi approvati Visa, Mastercard, Maestro e 3-D Secure con carte test Monri prima di chiedere approvazione produzione.|Testa flussi declined e cancelled. Una carta declined può restare sul form Monri, quindi non affidarti solo al ritorno dell'acquirente al negozio.|Conferma che i callback restituiscano HTTP 200, verifica la|firma SHA-512 e aggiorna l'ordine esattamente una volta se Monri ritenta lo stesso callback.|Conferma che il digest Success URL sia verificato contro l'URL raw encoded e che return URL falsi o scaduti non segnino ordini come pagati.|6. Controlli go-live|Abilita Monri prima per un piccolo ordine live, riconcilialo nel portale Monri e nell'ordine webshop, poi aprilo a tutti gli acquirenti.|Limita accesso ai segreti live, ruota valori test trapelati e mantieni i log Monri senza numeri carta o dati sensibili del titolare.|Documenta chi gestisce captures, voids, refunds, callback falliti, chargeback ed escalation supporto con Monri o banca acquirer.|Documentazione:|Redirect Form|Payment API|conformità webshop|flusso merchant",
  pt: "Checklist de prontidão de produção Monri|Use esta checklist depois de as variáveis env básicas acima estarem presentes. A Monri exige que a integração de teste e o conteúdo do webshop sejam revistos antes da ativação da conta de produção. Esta app implementa atualmente Redirect Form; o fluxo Payment API é separado.|1. Concluir onboarding Monri|Obtenha uma conta merchant de teste Monri WebPay e complete os formulários de acesso pedidos pela Monri ou pelo banco adquirente.|Execute a integração redirect-form completa no ambiente de teste e avise o Monri Support quando o webshop estiver pronto para inspeção.|Aguarde inspeção do site Monri/banco, assinatura do contrato bancário, emissão TID/MID, registo 3-D Secure e ativação do ambiente de produção.|2. Tornar o webshop conforme|Publique dados legais da empresa, números fiscais/empresa, morada registada, morada do webshop se diferente, telefone e email de apoio ao cliente.|Publique termos de venda, declaração de privacidade, prazos de entrega, tratamento de reclamações, cancelamento, reembolso e condições de pagamento.|Mostre apenas marcas de cartões aceites, logótipos obrigatórios de cartões e segurança de pagamento, e inclua o logótipo/link Monri Payments PSP quando exigido pela Monri.|3. Configurar segredos de produção|Definir|apenas em produção. Mantenha credenciais de teste e live separadas.|Definir live|a partir das definições API merchant de produção.|Deixar|por definir salvo se a Monri fornecer endpoint redirect-form personalizado. O destino POST live predefinido é|o predefinido de teste é|Não valide este URL abrindo-o diretamente no browser.|Não substitua o URL do formulário pelo caminho Payment API salvo reescrita do provider para esse fluxo. Payment API usa|pedidos JSON e um|cabeçalho Authorization.|Escolher|deliberadamente: use|para pagamento imediato, ou|apenas se as operações estiverem prontas para capturar ou anular reservas na Monri.|4. Configurar definições API Monri|Sirva checkout e todos os endpoints de retorno Monri por HTTPS no domínio final de produção.|No perfil merchant Monri, ative redirect para Success URL. Esta app envia|por pagamento e valida o digest devolvido antes de atualizar o estado de pagamento.|Configure a Callback URL como|ou defina o mesmo URL absoluto em|Esta app envia-o para a Monri como|para cada pagamento.|Peça ao Monri Support para configurar webhooks se precisar de eventos declined, refund, void, capture ou tokenization além do callback approved-transaction padrão.|5. Verificar transações de teste|Teste fluxos aprovados Visa, Mastercard, Maestro e 3-D Secure com cartões de teste Monri antes de pedir aprovação de produção.|Teste fluxos declined e cancelled. Um cartão declined pode ficar no formulário Monri, por isso não dependa só do regresso do comprador à loja.|Confirme que callbacks devolvem HTTP 200, verifique a|assinatura SHA-512 e atualize a encomenda exatamente uma vez se a Monri repetir o mesmo callback.|Confirme que o digest Success URL é verificado contra o URL codificado bruto e que return URLs falsos ou expirados não marcam encomendas como pagas.|6. Controlos go-live|Ative primeiro Monri para uma pequena encomenda live, reconcilie-a no portal Monri e na encomenda do webshop, depois abra a todos os compradores.|Restrinja acesso a segredos live, rode valores de teste expostos e mantenha logs Monri sem números de cartão ou dados sensíveis do titular.|Documente quem trata captures, voids, refunds, callbacks falhados, chargebacks e escalamentos de apoio com Monri ou o banco adquirente.|Documentação:|Redirect Form|Payment API|conformidade webshop|fluxo merchant",
  "pt-BR":
    "Checklist de prontidão para produção Monri|Use esta checklist depois que as variáveis env básicas acima estiverem presentes. A Monri exige que a integração de teste e o conteúdo da loja sejam revisados antes da ativação da conta de produção. Este app implementa atualmente Redirect Form; o fluxo Payment API é separado.|1. Concluir onboarding Monri|Obtenha uma conta merchant de teste Monri WebPay e complete os formulários de acesso solicitados pela Monri ou pelo banco adquirente.|Execute a integração redirect-form completa no ambiente de teste e avise o Monri Support quando a loja estiver pronta para inspeção.|Aguarde inspeção do site Monri/banco, assinatura do contrato bancário, emissão de TID/MID, registro 3-D Secure e ativação do ambiente de produção.|2. Tornar a loja conforme|Publique dados legais da empresa, números fiscais/empresa, endereço registrado, endereço da loja se diferente, telefone e email de suporte ao cliente.|Publique termos de venda, política de privacidade, prazo de entrega, tratamento de reclamações, cancelamento, reembolso e condições de pagamento.|Mostre apenas bandeiras aceitas, logos obrigatórios de cartão e segurança de pagamento, e inclua o logo/link Monri Payments PSP quando exigido pela Monri.|3. Configurar segredos de produção|Definir|somente em produção. Mantenha credenciais de teste e live separadas.|Definir live|a partir das configurações da API merchant de produção.|Deixar|indefinido salvo se a Monri fornecer endpoint redirect-form personalizado. O destino POST live padrão é|o padrão de teste é|Não valide esta URL abrindo diretamente no navegador.|Não substitua a URL do formulário pelo caminho Payment API salvo se o provider for reescrito para esse fluxo. Payment API usa|requisições JSON e um|cabeçalho Authorization.|Escolher|deliberadamente: use|para pagamento imediato, ou|somente se operações estiver pronta para capturar ou anular reservas na Monri.|4. Configurar ajustes API Monri|Sirva o checkout e todos os endpoints de retorno Monri por HTTPS no domínio final de produção.|No perfil merchant Monri, habilite redirect para Success URL. Este app envia|por pagamento e valida o digest retornado antes de atualizar o status do pagamento.|Configure a Callback URL como|ou defina a mesma URL absoluta em|Este app envia isso à Monri como|para cada pagamento.|Peça ao Monri Support para configurar webhooks se precisar de eventos declined, refund, void, capture ou tokenization além do callback approved-transaction padrão.|5. Verificar transações de teste|Teste fluxos aprovados Visa, Mastercard, Maestro e 3-D Secure com cartões de teste Monri antes de solicitar aprovação de produção.|Teste fluxos declined e cancelled. Um cartão declined pode ficar no formulário Monri, então não dependa apenas do comprador retornar à loja.|Confirme que callbacks retornam HTTP 200, verifique a|assinatura SHA-512 e atualize o pedido exatamente uma vez se a Monri repetir o mesmo callback.|Confirme que o digest da Success URL é verificado contra a URL codificada bruta e que return URLs falsas ou expiradas não marcam pedidos como pagos.|6. Controles go-live|Ative primeiro a Monri para um pequeno pedido live, reconcilie no portal Monri e no pedido da loja, depois abra para todos os compradores.|Restrinja acesso a segredos live, rotacione valores de teste vazados e mantenha logs Monri sem números de cartão ou dados sensíveis do portador.|Documente quem trata captures, voids, refunds, callbacks falhos, chargebacks e escalonamentos de suporte com Monri ou banco adquirente.|Documentação:|Redirect Form|Payment API|conformidade webshop|fluxo merchant",
  nl: "Monri-checklist voor productiegereedheid|Gebruik deze checklist nadat de basis env-variabelen hierboven aanwezig zijn. Monri vereist dat de testintegratie en webshopinhoud worden beoordeeld voordat het productieaccount wordt geactiveerd. Deze app implementeert momenteel Redirect Form; de Payment API-stroom is apart.|1. Monri-onboarding afronden|Verkrijg een Monri WebPay-testmerchantaccount en vul de toegangsformulieren in die Monri of de acquiring bank vraagt.|Voer de volledige redirect-form-integratie uit in de testomgeving en meld Monri Support wanneer de webshop klaar is voor inspectie.|Wacht op Monri/bank-website-inspectie, ondertekening bankcontract, uitgifte TID/MID, 3-D Secure-registratie en activatie productieomgeving.|2. Webshop compliant maken|Publiceer juridische bedrijfsgegevens, btw/bedrijfsnummers, geregistreerd adres, webshopadres indien anders, telefoon en support-e-mail.|Publiceer verkoopvoorwaarden, privacyverklaring, levertijden, klachtenafhandeling, annulering, terugbetaling en betalingsvoorwaarden.|Toon alleen geaccepteerde kaartmerken, vereiste kaart- en betaalveiligheidslogo's, en voeg Monri Payments PSP-logo/link toe waar Monri dat vereist.|3. Productiegeheimen configureren|Instellen|alleen in productie. Houd test- en livegegevens gescheiden.|Live instellen|uit de productie merchant API-instellingen.|Laat|uitgeschakeld tenzij Monri een aangepast redirect-form-endpoint geeft. Het live standaard POST-doel is|de teststandaard is|Valideer deze URL niet door hem direct in de browser te openen.|Vervang de formulier-URL niet door het Payment API-pad tenzij de provider voor die stroom is herschreven. Payment API gebruikt|JSON-verzoeken en een|Authorization-header.|Kies|bewust: gebruik|voor directe betaling, of|alleen als operations klaar is om reserveringen in Monri te capturen of voiden.|4. Monri API-instellingen configureren|Serveer checkout en alle Monri-return-endpoints via HTTPS op het definitieve productiedomein.|Schakel in het Monri-merchantprofiel redirect naar Success URL in. Deze app verzendt|per betaling en valideert de teruggegeven digest voordat de betaalstatus wordt bijgewerkt.|Configureer de Callback URL als|of stel dezelfde absolute URL in bij|Deze app stuurt dit naar Monri als|voor elke betaling.|Vraag Monri Support om webhooks te configureren als je declined, refund, void, capture of tokenization events nodig hebt buiten de standaard approved-transaction callback.|5. Testtransacties verifiëren|Test goedgekeurde Visa-, Mastercard-, Maestro- en 3-D Secure-stromen met Monri-testkaarten voordat je productiegoedkeuring aanvraagt.|Test declined en cancelled stromen. Een declined kaart kan op het Monri-formulier blijven, vertrouw dus niet alleen op terugkeer van de koper naar de shop.|Bevestig dat callbacks HTTP 200 retourneren, controleer de|SHA-512-handtekening en werk de bestelling precies één keer bij als Monri dezelfde callback opnieuw probeert.|Bevestig dat de Success URL-digest wordt gecontroleerd tegen de ruwe encoded URL en dat vervalste of verlopen return URLs bestellingen niet als betaald markeren.|6. Go-live-controles|Schakel Monri eerst in voor een kleine live bestelling, reconcilieer die in het Monri-portaal en de webshopbestelling, en open daarna voor alle kopers.|Beperk toegang tot livegeheimen, roteer gelekte testwaarden en houd Monri-logs vrij van kaartnummers of gevoelige kaarthoudergegevens.|Documenteer wie captures, voids, refunds, mislukte callbacks, chargebacks en supportescalaties met Monri of de acquiring bank afhandelt.|Documentatie:|Redirect Form|Payment API|webshop-compliance|merchant-stroom",
  pl: "Lista gotowości produkcyjnej Monri|Użyj tej listy, gdy podstawowe zmienne env powyżej są już ustawione. Monri wymaga przeglądu integracji testowej i treści sklepu przed aktywacją konta produkcyjnego. Ta aplikacja obecnie implementuje Redirect Form; przepływ Payment API jest osobny.|1. Zakończ onboarding Monri|Uzyskaj testowe konto merchant Monri WebPay i wypełnij formularze dostępu wymagane przez Monri lub bank acquiring.|Uruchom pełną integrację redirect-form w środowisku testowym, a następnie powiadom Monri Support, gdy sklep będzie gotowy do inspekcji.|Poczekaj na inspekcję strony Monri/banku, podpisanie umowy bankowej, wydanie TID/MID, rejestrację 3-D Secure i aktywację środowiska produkcyjnego.|2. Dostosuj sklep do wymogów|Opublikuj dane prawne firmy, numery podatkowe/firmowe, adres rejestrowy, adres sklepu jeśli inny, telefon i email wsparcia klienta.|Opublikuj warunki sprzedaży, politykę prywatności, terminy dostawy, obsługę reklamacji, anulowanie, zwroty i warunki płatności.|Pokaż tylko akceptowane marki kart, wymagane logotypy kart i bezpieczeństwa płatności oraz dodaj logo/link Monri Payments PSP, gdzie Monri tego wymaga.|3. Skonfiguruj sekrety produkcyjne|Ustaw|tylko w produkcji. Trzymaj dane testowe i live oddzielnie.|Ustaw live|z ustawień produkcyjnego merchant API.|Pozostaw|nieustawione, chyba że Monri poda własny endpoint redirect-form. Domyślny cel POST live to|domyślny testowy to|Nie sprawdzaj tego URL przez bezpośrednie otwarcie w przeglądarce.|Nie zastępuj URL formularza ścieżką Payment API, chyba że provider został przepisany dla tego przepływu. Payment API używa|żądań JSON oraz|nagłówka Authorization.|Wybierz|świadomie: użyj|dla natychmiastowej płatności albo|tylko jeśli operacje są gotowe do capture lub void rezerwacji w Monri.|4. Skonfiguruj ustawienia API Monri|Udostępnij checkout i wszystkie endpointy powrotu Monri przez HTTPS na finalnej domenie produkcyjnej.|W profilu merchant Monri włącz przekierowanie do Success URL. Ta aplikacja wysyła|dla każdej płatności i waliduje zwrócony digest przed aktualizacją statusu płatności.|Skonfiguruj Callback URL jako|albo ustaw ten sam absolutny URL w|Ta aplikacja wysyła go do Monri jako|dla każdej płatności.|Poproś Monri Support o konfigurację webhooków, jeśli potrzebujesz zdarzeń declined, refund, void, capture lub tokenization poza standardowym callbackiem approved-transaction.|5. Zweryfikuj transakcje testowe|Przetestuj zatwierdzone przepływy Visa, Mastercard, Maestro i 3-D Secure kartami testowymi Monri przed prośbą o akceptację produkcyjną.|Przetestuj przepływy declined i cancelled. Odrzucona karta może pozostać na formularzu Monri, więc nie polegaj tylko na powrocie kupującego do sklepu.|Potwierdź, że callbacki zwracają HTTP 200, zweryfikuj|podpis SHA-512 i zaktualizuj zamówienie dokładnie raz, jeśli Monri ponowi ten sam callback.|Potwierdź, że digest Success URL jest sprawdzany względem surowego zakodowanego URL i że fałszywe lub wygasłe return URLs nie oznaczają zamówień jako opłaconych.|6. Kontrole go-live|Najpierw włącz Monri dla małego zamówienia live, uzgodnij je w portalu Monri i zamówieniu sklepu, potem otwórz dla wszystkich kupujących.|Ogranicz dostęp do sekretów live, rotuj wyciekłe wartości testowe i trzymaj logi Monri bez numerów kart lub wrażliwych danych posiadacza.|Udokumentuj, kto obsługuje captures, voids, refunds, nieudane callbacki, chargebacki i eskalacje wsparcia z Monri lub bankiem acquiring.|Dokumentacja:|Redirect Form|Payment API|zgodność webshopu|przepływ merchant",
  tr: "Monri üretim hazırlık kontrol listesi|Yukarıdaki temel env değişkenleri hazır olduktan sonra bu listeyi kullan. Monri, üretim hesabı etkinleşmeden önce test entegrasyonu ve webshop içeriğinin incelenmesini ister. Bu uygulama şu anda Redirect Form uygular; Payment API akışı ayrıdır.|1. Monri onboarding'i tamamla|Monri WebPay test merchant hesabı al ve Monri veya acquiring banka tarafından istenen erişim formlarını tamamla.|Test ortamında tam redirect-form entegrasyonunu çalıştır, ardından webshop incelemeye hazır olduğunda Monri Support'a bildir.|Monri/banka site incelemesi, banka sözleşmesi imzası, TID/MID verilmesi, 3-D Secure kaydı ve üretim ortamı aktivasyonunu bekle.|2. Webshop'u uyumlu yap|Şirket yasal verilerini, vergi/şirket numaralarını, kayıtlı adresi, farklıysa webshop adresini, telefonu ve müşteri destek e-postasını yayınla.|Satış şartlarını, gizlilik bildirimini, teslimat zamanını, şikayet yönetimini, iptal, iade ve ödeme koşullarını yayınla.|Yalnızca kabul edilen kart markalarını, zorunlu kart ve ödeme güvenliği logolarını göster ve Monri gerektiriyorsa Monri Payments PSP logo/link ekle.|3. Üretim sırlarını yapılandır|Ayarla|yalnızca üretimde. Test ve live kimlik bilgilerini ayrı tut.|Live ayarla|üretim merchant API ayarlarından.|Boş bırak|Monri özel redirect-form endpoint vermedikçe. Live varsayılan POST hedefi|test varsayılanı|Bu URL'yi browser'da doğrudan açarak doğrulama.|Provider bu akış için yeniden yazılmadıkça form URL'sini Payment API yolu ile değiştirme. Payment API kullanır|JSON istekleri ve bir|Authorization header.|Seç|bilerek: kullan|anlık ödeme için, veya|yalnızca operasyonlar Monri'de rezervasyonları capture veya void etmeye hazırsa.|4. Monri API ayarlarını yapılandır|Checkout ve tüm Monri dönüş endpointlerini final üretim alanında HTTPS üzerinden sun.|Monri merchant profilinde Success URL'ye redirect'i etkinleştir. Bu uygulama gönderir|her ödeme için ve ödeme durumunu güncellemeden önce dönen digest'i doğrular.|Callback URL'yi şöyle yapılandır|veya aynı mutlak URL'yi şurada ayarla|Bu uygulama bunu Monri'ye şu olarak gönderir|her ödeme için.|Standart approved-transaction callback dışında declined, refund, void, capture veya tokenization eventleri gerekiyorsa Monri Support'tan webhookları yapılandırmasını iste.|5. Test işlemlerini doğrula|Üretim onayı istemeden önce Visa, Mastercard, Maestro ve 3-D Secure onaylı akışları Monri test kartlarıyla test et.|Declined ve cancelled akışları test et. Reddedilen kart Monri formunda kalabilir, bu yüzden yalnızca alıcının mağazaya dönmesine güvenme.|Callbacklerin HTTP 200 döndürdüğünü doğrula, şunu kontrol et|SHA-512 imzası ve Monri aynı callback'i tekrar denerse siparişi tam bir kez güncelle.|Success URL digest'in ham encoded URL'ye göre kontrol edildiğini ve sahte veya süresi geçmiş return URL'lerin siparişleri ödenmiş işaretlemediğini doğrula.|6. Go-live kontrolleri|Önce küçük bir live siparişte Monri'yi etkinleştir, Monri portalında ve webshop siparişinde mutabık kal, sonra tüm alıcılara aç.|Live sırlara erişimi kısıtla, sızan test değerlerini döndür ve Monri loglarını kart numaraları veya hassas kart sahibi verilerinden arındır.|Captures, voids, refunds, başarısız callbackler, chargebackler ve Monri veya acquiring banka ile destek eskalasyonlarını kimin yönettiğini belgele.|Dokümantasyon:|Redirect Form|Payment API|webshop uyumluluğu|merchant akışı",
  mk: "Monri листа за подготвеност за продукција|Користете ја оваа листа откако основните env променливи погоре се присутни. Monri бара тест-интеграцијата и содржината на веб-продавницата да бидат прегледани пред да се активира продукциската сметка. Оваа апликација моментално имплементира Redirect Form; текот Payment API е одделен.|1. Завршете Monri onboarding|Добијте Monri WebPay тест merchant сметка и пополнете ги пристапните формулари што ги бара Monri или acquiring банката.|Извршете ја целосната redirect-form интеграција во тест-околината, потоа известете го Monri Support кога веб-продавницата е подготвена за проверка.|Почекајте проверка на Monri/банкарската веб-страница, потпишување банкарски договор, издавање TID/MID, регистрација 3-D Secure и активирање продукциска околина.|2. Усогласете ја веб-продавницата|Објавете правни податоци за компанијата, даночни/компаниски броеви, регистрирана адреса, адреса на веб-продавница ако е различна, телефон и е-пошта за корисничка поддршка.|Објавете услови за продажба, изјава за приватност, рокови за испорака, постапување со жалби, откажување, поврат и услови за плаќање.|Прикажете само прифатени брендови на картички, задолжителни логоа за картички и безбедност на плаќање, и вклучете Monri Payments PSP лого/link каде што Monri бара.|3. Конфигурирајте продукциски тајни|Постави|само во продукција. Чувајте ги тест и live креденцијалите одвоено.|Постави live|од продукциските merchant API поставки.|Остави|непоставено освен ако Monri даде сопствен redirect-form endpoint. Стандардната live POST цел е|стандардната тест цел е|Не ја валидирајте оваа URL со директно отворање во browser.|Не заменувајте ја URL на формата со Payment API патеката освен ако provider е препишан за тој тек. Payment API користи|JSON барања и|Authorization header.|Избери|намерно: користи|за моментално плаќање, или|само ако операциите се подготвени за capture или void резервации во Monri.|4. Конфигурирајте Monri API поставки|Сервирајте checkout и сите Monri return endpoint-и преку HTTPS на финалниот продукциски домен.|Во Monri merchant профилот овозможете redirect кон Success URL. Оваа апликација испраќа|по плаќање и го валидира вратениот digest пред ажурирање на статусот на плаќањето.|Конфигурирајте Callback URL како|или поставете ја истата апсолутна URL во|Оваа апликација го испраќа до Monri како|за секое плаќање.|Побарајте од Monri Support да конфигурира webhooks ако ви требаат declined, refund, void, capture или tokenization настани надвор од стандардниот approved-transaction callback.|5. Проверете тест трансакции|Тестирајте одобрени Visa, Mastercard, Maestro и 3-D Secure текови со Monri тест картички пред да побарате продукциско одобрување.|Тестирајте declined и cancelled текови. Одбиена картичка може да остане на Monri формата, затоа не се потпирајте само на враќањето на купувачот во продавницата.|Потврдете дека callback-и враќаат HTTP 200, проверете го|SHA-512 потписот и ажурирајте ја нарачката точно еднаш ако Monri го повтори истиот callback.|Потврдете дека Success URL digest се проверува според суровата енкодирана URL и дека фалсификувани или истечени return URL-ови не означуваат нарачки како платени.|6. Go-live контроли|Прво овозможете Monri за мала live нарачка, усогласете ја во Monri порталот и нарачката во веб-продавницата, потоа отворете за сите купувачи.|Ограничете пристап до live тајни, ротирајте протечени тест вредности и чувајте Monri логови без броеви на картички или чувствителни податоци за сопственикот.|Документирајте кој управува со captures, voids, refunds, неуспешни callback-и, chargebacks и support ескалации со Monri или acquiring банката.|Документација:|Redirect Form|Payment API|усогласеност на веб-продавницата|merchant тек",
  bs: "Monri kontrolna lista spremnosti za produkciju|Koristite ovu listu nakon što su osnovne env varijable iznad prisutne. Monri zahtijeva pregled testne integracije i sadržaja webshopa prije aktivacije produkcijskog računa. Ova aplikacija trenutno implementira Redirect Form; Payment API tok je odvojen.|1. Završite Monri onboarding|Nabavite Monri WebPay testni merchant račun i popunite pristupne obrasce koje traži Monri ili acquiring banka.|Pokrenite kompletnu redirect-form integraciju u testnom okruženju, zatim obavijestite Monri Support kada je webshop spreman za pregled.|Sačekajte Monri/bankovni pregled web stranice, potpisivanje bankovnog ugovora, izdavanje TID/MID, 3-D Secure registraciju i aktivaciju produkcijskog okruženja.|2. Uskladite webshop|Objavite pravne podatke kompanije, porezne/kompanijske brojeve, registrovanu adresu, adresu webshopa ako je drugačija, telefon i email korisničke podrške.|Objavite uslove prodaje, izjavu o privatnosti, rokove isporuke, postupanje po prigovorima, otkazivanje, povrat i uslove plaćanja.|Prikažite samo prihvaćene kartične brendove, obavezne logotipe kartica i sigurnosti plaćanja, i uključite Monri Payments PSP logo/link gdje Monri to zahtijeva.|3. Podesite produkcijske tajne|Postavi|samo u produkciji. Držite testne i live kredencijale odvojeno.|Postavi live|iz produkcijskih merchant API postavki.|Ostavi|nepostavljeno osim ako Monri da prilagođeni redirect-form endpoint. Zadani live POST cilj je|zadani testni cilj je|Ne validirajte ovu URL direktnim otvaranjem u browseru.|Ne mijenjajte URL forme Payment API putanjom osim ako provider nije prepisan za taj tok. Payment API koristi|JSON zahtjeve i|Authorization header.|Izaberi|namjerno: koristi|za trenutno plaćanje, ili|samo ako su operacije spremne za capture ili void rezervacija u Monri-ju.|4. Podesite Monri API postavke|Servirajte checkout i sve Monri return endpoint-e preko HTTPS-a na finalnom produkcijskom domenu.|U Monri merchant profilu omogućite redirect na Success URL. Ova aplikacija šalje|po plaćanju i validira vraćeni digest prije ažuriranja statusa plaćanja.|Podesite Callback URL kao|ili postavite isti apsolutni URL u|Ova aplikacija ga šalje Monri-ju kao|za svako plaćanje.|Zatražite od Monri Supporta da podesi webhooks ako trebate declined, refund, void, capture ili tokenization događaje izvan standardnog approved-transaction callbacka.|5. Provjerite testne transakcije|Testirajte odobrene Visa, Mastercard, Maestro i 3-D Secure tokove Monri testnim karticama prije zahtjeva za produkcijsko odobrenje.|Testirajte declined i cancelled tokove. Odbijena kartica može ostati na Monri formi, zato se ne oslanjajte samo na povratak kupca u prodavnicu.|Potvrdite da callbackovi vraćaju HTTP 200, provjerite|SHA-512 potpis i ažurirajte narudžbu tačno jednom ako Monri ponovi isti callback.|Potvrdite da se Success URL digest provjerava prema sirovoj enkodiranoj URL i da falsifikovani ili istekli return URL-ovi ne označavaju narudžbe kao plaćene.|6. Go-live kontrole|Prvo uključite Monri za malu live narudžbu, uskladite je u Monri portalu i narudžbi webshopa, zatim otvorite svim kupcima.|Ograničite pristup live tajnama, rotirajte procurile testne vrijednosti i držite Monri logove bez brojeva kartica ili osjetljivih podataka vlasnika kartice.|Dokumentujte ko rukuje captures, voids, refunds, neuspjelim callbackovima, chargebackovima i support eskalacijama sa Monri-jem ili acquiring bankom.|Dokumentacija:|Redirect Form|Payment API|usklađenost webshopa|merchant tok",
  sl: "Monri kontrolni seznam pripravljenosti za produkcijo|Uporabite ta seznam, ko so zgoraj prisotne osnovne env spremenljivke. Monri zahteva pregled testne integracije in vsebine spletne trgovine pred aktivacijo produkcijskega računa. Ta aplikacija trenutno uporablja Redirect Form; tok Payment API je ločen.|1. Dokončajte Monri onboarding|Pridobite testni merchant račun Monri WebPay in izpolnite dostopne obrazce, ki jih zahteva Monri ali acquiring banka.|Zaženite celotno redirect-form integracijo v testnem okolju, nato obvestite Monri Support, ko je spletna trgovina pripravljena na pregled.|Počakajte na pregled spletnega mesta Monri/banke, podpis bančne pogodbe, izdajo TID/MID, registracijo 3-D Secure in aktivacijo produkcijskega okolja.|2. Uskladite spletno trgovino|Objavite pravne podatke podjetja, davčne/podjetniške številke, registrirani naslov, naslov spletne trgovine, če je drugačen, telefon in e-pošto podpore strankam.|Objavite prodajne pogoje, izjavo o zasebnosti, roke dostave, obravnavo reklamacij, odpoved, vračilo in plačilne pogoje.|Prikažite samo sprejete kartične znamke, zahtevane logotipe kartic in plačilne varnosti ter vključite logotip/povezavo Monri Payments PSP, kjer to zahteva Monri.|3. Nastavite produkcijske skrivnosti|Nastavi|samo v produkciji. Testne in live poverilnice hranite ločeno.|Nastavi live|iz produkcijskih merchant API nastavitev.|Pusti|nenastavljeno, razen če Monri poda prilagojen redirect-form endpoint. Privzeti live POST cilj je|testna privzeta vrednost je|Tega URL ne preverjajte z neposrednim odpiranjem v browserju.|URL obrazca ne zamenjajte s potjo Payment API, razen če je provider prepisan za ta tok. Payment API uporablja|JSON zahtevke in|Authorization header.|Izberi|namerno: uporabite|za takojšnje plačilo ali|samo če so operacije pripravljene zajeti ali razveljaviti rezervacije v Monri.|4. Nastavite Monri API nastavitve|Checkout in vse Monri return endpoint-e strežite prek HTTPS na končni produkcijski domeni.|V Monri merchant profilu omogočite redirect na Success URL. Ta aplikacija pošlje|za vsako plačilo in potrdi vrnjeni digest pred posodobitvijo stanja plačila.|Nastavite Callback URL kot|ali nastavite isti absolutni URL v|Ta aplikacija ga pošlje Monri kot|za vsako plačilo.|Prosite Monri Support, naj nastavi webhooks, če potrebujete dogodke declined, refund, void, capture ali tokenization poleg standardnega approved-transaction callbacka.|5. Preverite testne transakcije|Pred zahtevo za produkcijsko odobritev testirajte odobrene tokove Visa, Mastercard, Maestro in 3-D Secure z Monri testnimi karticami.|Testirajte declined in cancelled tokove. Zavrnljena kartica lahko ostane na obrazcu Monri, zato se ne zanašajte samo na vrnitev kupca v trgovino.|Potrdite, da callbacki vrnejo HTTP 200, preverite|podpis SHA-512 in naročilo posodobite natanko enkrat, če Monri ponovi isti callback.|Potrdite, da se digest Success URL preveri glede na surovo kodirano URL in da ponarejeni ali potekli return URL-ji naročil ne označijo kot plačana.|6. Go-live kontrole|Najprej omogočite Monri za majhno live naročilo, ga uskladite v Monri portalu in naročilu spletne trgovine, nato ga odprite vsem kupcem.|Omejite dostop do live skrivnosti, zamenjajte razkrite testne vrednosti in ohranite Monri dnevnike brez številk kartic ali občutljivih podatkov imetnika kartice.|Dokumentirajte, kdo obravnava captures, voids, refunds, neuspele callbacke, chargebacks in support eskalacije z Monri ali acquiring banko.|Dokumentacija:|Redirect Form|Payment API|skladnost spletne trgovine|merchant tok",
  ru: "Контрольный список готовности Monri к production|Используйте этот список после того, как основные env переменные выше уже заданы. Monri требует проверки тестовой интеграции и контента веб-магазина до активации production аккаунта. Это приложение сейчас реализует Redirect Form; поток Payment API отдельный.|1. Завершите Monri onboarding|Получите тестовый merchant аккаунт Monri WebPay и заполните формы доступа, запрошенные Monri или acquiring банком.|Запустите полную redirect-form интеграцию в тестовой среде, затем уведомите Monri Support, когда веб-магазин будет готов к проверке.|Дождитесь проверки сайта Monri/банком, подписания банковского договора, выдачи TID/MID, регистрации 3-D Secure и активации production среды.|2. Приведите веб-магазин в соответствие|Опубликуйте юридические данные компании, налоговые/регистрационные номера, зарегистрированный адрес, адрес веб-магазина, если он отличается, телефон и email поддержки клиентов.|Опубликуйте условия продажи, заявление о конфиденциальности, сроки доставки, обработку жалоб, отмену, возврат и условия оплаты.|Показывайте только принимаемые бренды карт, обязательные логотипы карт и платежной безопасности, и добавьте логотип/ссылку Monri Payments PSP там, где этого требует Monri.|3. Настройте production секреты|Задать|только в production. Держите тестовые и live учетные данные раздельно.|Задать live|из production настроек merchant API.|Оставить|незаполненным, если Monri не даст собственный redirect-form endpoint. Стандартная live POST цель|тестовая стандартная цель|Не проверяйте этот URL прямым открытием в browser.|Не заменяйте URL формы путем Payment API, если provider не переписан для этого потока. Payment API использует|JSON запросы и|Authorization header.|Выберите|осознанно: используйте|для немедленной оплаты или|только если операции готовы делать capture или void резервирований в Monri.|4. Настройте параметры Monri API|Checkout и все Monri return endpoint-ы должны обслуживаться по HTTPS на финальном production домене.|В Monri merchant профиле включите redirect на Success URL. Это приложение отправляет|для каждого платежа и проверяет возвращенный digest перед обновлением статуса оплаты.|Настройте Callback URL как|или задайте тот же абсолютный URL в|Это приложение отправляет его в Monri как|для каждого платежа.|Попросите Monri Support настроить webhooks, если нужны события declined, refund, void, capture или tokenization помимо стандартного approved-transaction callback.|5. Проверьте тестовые транзакции|Проверьте approved потоки Visa, Mastercard, Maestro и 3-D Secure с тестовыми картами Monri до запроса production одобрения.|Проверьте declined и cancelled потоки. Отклоненная карта может остаться на форме Monri, поэтому не полагайтесь только на возврат покупателя в магазин.|Подтвердите, что callback-и возвращают HTTP 200, проверьте|подпись SHA-512 и обновляйте заказ ровно один раз, если Monri повторит тот же callback.|Подтвердите, что digest Success URL проверяется по сырому encoded URL и что поддельные или истекшие return URL не помечают заказы как оплаченные.|6. Go-live контроль|Сначала включите Monri для небольшого live заказа, сверьте его в Monri портале и заказе веб-магазина, затем откройте всем покупателям.|Ограничьте доступ к live секретам, ротируйте утекшие тестовые значения и держите Monri логи без номеров карт или чувствительных данных держателя карты.|Задокументируйте, кто обрабатывает captures, voids, refunds, неуспешные callback-и, chargebacks и support эскалации с Monri или acquiring банком.|Документация:|Redirect Form|Payment API|соответствие веб-магазина|merchant поток",
  hu: "Monri éles üzemre készültségi ellenőrzőlista|Használd ezt a listát, miután a fenti alap env változók már megvannak. A Monri megköveteli a tesztintegráció és a webshop tartalmának ellenőrzését a production fiók aktiválása előtt. Ez az alkalmazás jelenleg Redirect Form megoldást használ; a Payment API folyamat külön van.|1. Fejezd be a Monri onboardingot|Szerezz Monri WebPay teszt merchant fiókot, és töltsd ki a Monri vagy az acquiring bank által kért hozzáférési űrlapokat.|Futtasd a teljes redirect-form integrációt a tesztkörnyezetben, majd értesítsd a Monri Supportot, amikor a webshop készen áll az ellenőrzésre.|Várd meg a Monri/banki webhely-ellenőrzést, a banki szerződés aláírását, a TID/MID kiadását, a 3-D Secure regisztrációt és a production környezet aktiválását.|2. Tedd megfelelhetővé a webshopot|Tedd közzé a cég jogi adatait, adó/cégszámokat, bejegyzett címet, eltérő webshop címet, telefonszámot és ügyféltámogatási emailt.|Tedd közzé az értékesítési feltételeket, adatvédelmi nyilatkozatot, szállítási időket, panaszkezelést, lemondást, visszatérítést és fizetési feltételeket.|Csak elfogadott kártyamárkákat jeleníts meg, a szükséges kártya- és fizetésbiztonsági logókkal, és add hozzá a Monri Payments PSP logót/linket, ahol a Monri előírja.|3. Állítsd be a production titkokat|Beállítás|csak production környezetben. Tartsd külön a teszt és live hitelesítő adatokat.|Live beállítása|a production merchant API beállításaiból.|Hagyd|beállítatlanul, kivéve ha a Monri egyedi redirect-form endpointot ad. Az alapértelmezett live POST cél|a teszt alapértelmezett cél|Ne validáld ezt az URL-t közvetlen browser megnyitással.|Ne cseréld a form URL-t Payment API útvonalra, hacsak a provider nincs átírva erre a folyamatra. A Payment API használ|JSON kéréseket és egy|Authorization headert.|Válassz|tudatosan: használd|azonnali fizetéshez, vagy|csak ha az operations készen áll reservation capture vagy void műveletekre a Monri-ban.|4. Állítsd be a Monri API beállításokat|A checkoutot és minden Monri return endpointot HTTPS-en szolgálj ki a végleges production domainen.|A Monri merchant profilban engedélyezd a redirectet a Success URL-re. Ez az alkalmazás elküldi|minden fizetéshez, és a fizetési állapot frissítése előtt validálja a visszakapott digestet.|Állítsd be a Callback URL-t így|vagy állítsd be ugyanazt az abszolút URL-t itt|Ez az alkalmazás ezt küldi a Monri felé mint|minden fizetéshez.|Kérd meg a Monri Supportot webhooks beállítására, ha declined, refund, void, capture vagy tokenization események kellenek a standard approved-transaction callbacken túl.|5. Ellenőrizd a teszttranzakciókat|Teszteld az approved Visa, Mastercard, Maestro és 3-D Secure folyamatokat Monri tesztkártyákkal, mielőtt production jóváhagyást kérsz.|Teszteld a declined és cancelled folyamatokat. Egy declined kártya a Monri formon maradhat, ezért ne csak arra építs, hogy a vevő visszatér a boltba.|Erősítsd meg, hogy a callbackek HTTP 200-at adnak vissza, ellenőrizd a|SHA-512 aláírást, és pontosan egyszer frissítsd a rendelést, ha a Monri újrapróbálja ugyanazt a callbacket.|Erősítsd meg, hogy a Success URL digest a nyers encoded URL ellen van ellenőrizve, és a hamisított vagy lejárt return URL-ek nem jelölnek rendeléseket fizetettnek.|6. Go-live ellenőrzések|Először engedélyezd a Monrit egy kis live rendelésre, egyeztesd a Monri portálon és a webshop rendelésben, majd nyisd meg minden vevőnek.|Korlátozd a live titkok hozzáférését, rotáld a kiszivárgott tesztértékeket, és tartsd a Monri logokat kártyaszámoktól és érzékeny kártyabirtokosi adatoktól mentesen.|Dokumentáld, ki kezeli a captures, voids, refunds, sikertelen callbackek, chargebacks és support eszkalációk ügyét a Monrival vagy az acquiring bankkal.|Dokumentáció:|Redirect Form|Payment API|webshop megfelelőség|merchant folyamat",
  bg: "Monri списък за готовност за продукция|Използвайте този списък, след като основните env променливи по-горе са налични. Monri изисква тестовата интеграция и съдържанието на уеб магазина да бъдат прегледани преди активиране на production акаунта. Това приложение в момента имплементира Redirect Form; потокът Payment API е отделен.|1. Завършете Monri onboarding|Вземете Monri WebPay тестов merchant акаунт и попълнете формулярите за достъп, поискани от Monri или acquiring банката.|Стартирайте пълната redirect-form интеграция в тестова среда, след това уведомете Monri Support, когато уеб магазинът е готов за инспекция.|Изчакайте Monri/банкова проверка на сайта, подписване на банков договор, издаване на TID/MID, регистрация 3-D Secure и активиране на production среда.|2. Приведете уеб магазина в съответствие|Публикувайте правни данни на компанията, данъчни/фирмени номера, регистриран адрес, адрес на уеб магазина ако е различен, телефон и email за клиентска поддръжка.|Публикувайте условия за продажба, декларация за поверителност, срокове за доставка, обработка на жалби, отказ, възстановяване и условия за плащане.|Показвайте само приети картови брандове, задължителните лога за карти и платежна сигурност, и включете Monri Payments PSP лого/link, когато Monri го изисква.|3. Конфигурирайте production тайни|Задайте|само в production. Дръжте тестовите и live идентификационни данни отделно.|Задайте live|от production merchant API настройките.|Оставете|незададено, освен ако Monri даде персонализиран redirect-form endpoint. Стандартната live POST цел е|тестовата стандартна цел е|Не валидирайте този URL чрез директно отваряне в browser.|Не заменяйте URL на формуляра с Payment API път, освен ако provider не е пренаписан за този поток. Payment API използва|JSON заявки и|Authorization header.|Изберете|съзнателно: използвайте|за незабавно плащане, или|само ако operations са готови за capture или void на резервации в Monri.|4. Конфигурирайте Monri API настройки|Обслужвайте checkout и всички Monri return endpoint-и през HTTPS на финалния production домейн.|В Monri merchant профила включете redirect към Success URL. Това приложение изпраща|за всяко плащане и валидира върнатия digest преди обновяване на статуса на плащането.|Конфигурирайте Callback URL като|или задайте същия абсолютен URL в|Това приложение го изпраща към Monri като|за всяко плащане.|Помолете Monri Support да конфигурира webhooks, ако ви трябват declined, refund, void, capture или tokenization събития извън стандартния approved-transaction callback.|5. Проверете тестови транзакции|Тествайте approved Visa, Mastercard, Maestro и 3-D Secure потоци с Monri тестови карти преди заявка за production одобрение.|Тествайте declined и cancelled потоци. Отказана карта може да остане във формата Monri, затова не разчитайте само на връщането на купувача в магазина.|Потвърдете, че callback-и връщат HTTP 200, проверете|SHA-512 подписа и обновете поръчката точно веднъж, ако Monri повтори същия callback.|Потвърдете, че digest на Success URL се проверява спрямо суровия encoded URL и че фалшиви или изтекли return URL-и не маркират поръчки като платени.|6. Go-live контроли|Първо включете Monri за малка live поръчка, сверете я в Monri портала и поръчката в уеб магазина, после отворете за всички купувачи.|Ограничете достъпа до live тайни, ротирайте изтекли тестови стойности и пазете Monri логовете без номера на карти или чувствителни данни на картодържателя.|Документирайте кой обработва captures, voids, refunds, неуспешни callback-и, chargebacks и support ескалации с Monri или acquiring банката.|Документация:|Redirect Form|Payment API|съответствие на уеб магазина|merchant поток",
  ja: "Monri本番準備チェックリスト|上記の基本env変数がそろった後にこのチェックリストを使ってください。Monriでは、本番アカウントを有効化する前にテスト連携とWebショップ内容の審査が必要です。このアプリは現在Redirect Formを実装しています。Payment APIフローは別です。|1. Monri onboardingを完了|Monri WebPayのテストmerchantアカウントを取得し、Monriまたはacquiring銀行が求めるアクセスフォームを完了します。|テスト環境でredirect-form連携全体を実行し、Webショップが審査可能になったらMonri Supportへ通知します。|Monri/銀行によるWebサイト審査、銀行契約の署名、TID/MID発行、3-D Secure登録、本番環境有効化を待ちます。|2. Webショップを準拠させる|会社の法的情報、税務/会社番号、登録住所、異なる場合のWebショップ住所、電話、カスタマーサポートemailを公開します。|販売条件、プライバシー声明、配送時期、苦情対応、キャンセル、返金、支払条件を公開します。|受け付けるカードブランドのみを表示し、必須のカードおよび支払セキュリティロゴを表示し、Monriが求める場所にMonri Payments PSPロゴ/linkを含めます。|3. 本番シークレットを設定|設定|本番のみ。テストとliveの認証情報は分けて保持します。|liveを設定|本番merchant API設定から。|未設定のままにする|Monriがカスタムredirect-form endpointを提供しない限り。liveの既定POST先は|テストの既定値は|このURLをbrowserで直接開いて検証しないでください。|providerがそのフロー向けに書き換えられていない限り、フォームURLをPayment APIパスに置き換えないでください。Payment APIは使用します|JSONリクエストと|Authorization header。|選択|意図的に: 使用|即時支払いの場合、または|operationsがMonriで予約をcaptureまたはvoidする準備がある場合のみ。|4. Monri API設定を構成|checkoutとすべてのMonri return endpointを最終本番ドメインでHTTPS配信します。|Monri merchantプロファイルでSuccess URLへのredirectを有効にします。このアプリは送信します|各支払いごとに、支払状態を更新する前に返却されたdigestを検証します。|Callback URLを次のように設定|または同じ絶対URLを次に設定|このアプリはそれをMonriへ次として送信します|各支払いごとに。|標準のapproved-transaction callbackを超えてdeclined、refund、void、capture、tokenizationイベントが必要な場合は、Monri Supportにwebhooks設定を依頼してください。|5. テスト取引を確認|本番承認を依頼する前に、MonriテストカードでapprovedのVisa、Mastercard、Maestro、3-D Secureフローをテストします。|declinedとcancelledフローをテストします。declinedカードはMonriフォーム上に残ることがあるため、購入者がショップに戻ることだけに依存しないでください。|callbackがHTTP 200を返すことを確認し、検証します|SHA-512署名を確認し、Monriが同じcallbackを再試行しても注文は正確に一度だけ更新します。|Success URL digestが生のencoded URLに対して確認され、偽造または期限切れのreturn URLで注文が支払済みにならないことを確認します。|6. Go-live管理|まず小さなlive注文でMonriを有効化し、MonriポータルとWebショップ注文で照合してから、すべての購入者に開放します。|liveシークレットへのアクセスを制限し、漏えいしたテスト値をローテーションし、Monriログにカード番号や機密のカード保有者データを残さないでください。|captures、voids、refunds、失敗したcallback、chargebacks、Monriまたはacquiring銀行とのsupportエスカレーションを誰が扱うか文書化します。|ドキュメント:|Redirect Form|Payment API|Webショップ準拠|merchantフロー",
  "zh-Hans":
    "Monri 生产就绪检查清单|在上方基础 env 变量已存在后使用此清单。Monri 要求在生产账号激活前审核测试集成和网店内容。此应用当前实现 Redirect Form；Payment API 流程是独立的。|1. 完成 Monri onboarding|获取 Monri WebPay 测试 merchant 账号，并完成 Monri 或 acquiring 银行要求的访问表单。|在测试环境中运行完整的 redirect-form 集成，然后在网店准备好接受检查时通知 Monri Support。|等待 Monri/银行网站检查、银行合同签署、TID/MID 发放、3-D Secure 注册以及生产环境激活。|2. 让网店合规|发布公司法定信息、税务/公司编号、注册地址、不同的网店地址、电话和客户支持 email。|发布销售条款、隐私声明、配送时间、投诉处理、取消、退款和付款条件。|仅显示接受的卡品牌，展示必需的卡和支付安全标志，并在 Monri 要求的位置加入 Monri Payments PSP logo/link。|3. 配置生产密钥|设置|仅在生产环境中。保持测试和 live 凭据分离。|设置 live|来自生产 merchant API 设置。|保留|未设置，除非 Monri 提供自定义 redirect-form endpoint。live 默认 POST 目标是|测试默认值是|不要通过在 browser 中直接打开来验证此 URL。|不要把表单 URL 替换为 Payment API 路径，除非 provider 已为该流程重写。Payment API 使用|JSON 请求和一个|Authorization header。|选择|有意识地: 使用|用于即时付款，或者|仅当 operations 已准备好在 Monri 中 capture 或 void 预授权时。|4. 配置 Monri API 设置|在最终生产域名上通过 HTTPS 提供 checkout 和所有 Monri return endpoint。|在 Monri merchant 配置中启用到 Success URL 的 redirect。此应用会发送|每笔付款，并在更新付款状态前验证返回的 digest。|将 Callback URL 配置为|或在以下位置设置相同的绝对 URL|此应用会把它作为以下值发送给 Monri|用于每笔付款。|如果需要标准 approved-transaction callback 之外的 declined、refund、void、capture 或 tokenization 事件，请让 Monri Support 配置 webhooks。|5. 验证测试交易|在请求生产批准前，使用 Monri 测试卡测试 approved 的 Visa、Mastercard、Maestro 和 3-D Secure 流程。|测试 declined 和 cancelled 流程。declined 卡可能停留在 Monri 表单上，因此不要只依赖买家返回商店。|确认 callback 返回 HTTP 200，验证|SHA-512 签名，并在 Monri 重试同一 callback 时只更新订单一次。|确认 Success URL digest 针对原始 encoded URL 进行检查，并且伪造或过期的 return URL 不会把订单标记为已付款。|6. Go-live 控制|先为一笔小额 live 订单启用 Monri，在 Monri 门户和网店订单中核对后，再开放给所有买家。|限制 live 密钥访问，轮换泄露的测试值，并确保 Monri 日志不含卡号或敏感持卡人数据。|记录谁处理 captures、voids、refunds、失败的 callback、chargebacks，以及与 Monri 或 acquiring 银行的 support 升级。|文档:|Redirect Form|Payment API|网店合规|merchant 流程",
  "zh-Hant":
    "Monri 生產就緒檢查清單|在上方基礎 env 變數已存在後使用此清單。Monri 要求在生產帳號啟用前審核測試整合與網店內容。此應用程式目前實作 Redirect Form；Payment API 流程是獨立的。|1. 完成 Monri onboarding|取得 Monri WebPay 測試 merchant 帳號，並完成 Monri 或 acquiring 銀行要求的存取表單。|在測試環境中執行完整的 redirect-form 整合，然後在網店準備好接受檢查時通知 Monri Support。|等待 Monri/銀行網站檢查、銀行合約簽署、TID/MID 發放、3-D Secure 註冊以及生產環境啟用。|2. 讓網店合規|發布公司法定資料、稅務/公司編號、註冊地址、若不同則為網店地址、電話與客戶支援 email。|發布銷售條款、隱私聲明、配送時間、投訴處理、取消、退款與付款條件。|僅顯示接受的卡片品牌，展示必要的卡片與支付安全標誌，並在 Monri 要求的位置加入 Monri Payments PSP logo/link。|3. 設定生產密鑰|設定|僅在生產環境中。保持測試與 live 憑證分離。|設定 live|來自生產 merchant API 設定。|保留|未設定，除非 Monri 提供自訂 redirect-form endpoint。live 預設 POST 目標是|測試預設值是|不要透過在 browser 中直接開啟來驗證此 URL。|不要把表單 URL 替換為 Payment API 路徑，除非 provider 已為該流程重寫。Payment API 使用|JSON 請求和一個|Authorization header。|選擇|有意識地: 使用|用於即時付款，或者|僅當 operations 已準備好在 Monri 中 capture 或 void 預授權時。|4. 設定 Monri API 設定|在最終生產網域上透過 HTTPS 提供 checkout 和所有 Monri return endpoint。|在 Monri merchant 設定檔中啟用到 Success URL 的 redirect。此應用程式會傳送|每筆付款，並在更新付款狀態前驗證返回的 digest。|將 Callback URL 設定為|或在以下位置設定相同的絕對 URL|此應用程式會把它作為以下值傳送給 Monri|用於每筆付款。|如果需要標準 approved-transaction callback 之外的 declined、refund、void、capture 或 tokenization 事件，請讓 Monri Support 設定 webhooks。|5. 驗證測試交易|在要求生產核准前，使用 Monri 測試卡測試 approved 的 Visa、Mastercard、Maestro 和 3-D Secure 流程。|測試 declined 和 cancelled 流程。declined 卡可能停留在 Monri 表單上，因此不要只依賴買家返回商店。|確認 callback 返回 HTTP 200，驗證|SHA-512 簽章，並在 Monri 重試同一 callback 時只更新訂單一次。|確認 Success URL digest 依原始 encoded URL 檢查，且偽造或過期的 return URL 不會把訂單標記為已付款。|6. Go-live 控制|先為一筆小額 live 訂單啟用 Monri，在 Monri 入口網站與網店訂單中核對後，再開放給所有買家。|限制 live 密鑰存取，輪換外洩的測試值，並確保 Monri 日誌不含卡號或敏感持卡人資料。|記錄誰處理 captures、voids、refunds、失敗的 callback、chargebacks，以及與 Monri 或 acquiring 銀行的 support 升級。|文件:|Redirect Form|Payment API|網店合規|merchant 流程",
  ar: "قائمة جاهزية Monri للإنتاج|استخدم هذه القائمة بعد توفر متغيرات env الأساسية أعلاه. يتطلب Monri مراجعة تكامل الاختبار ومحتوى المتجر الإلكتروني قبل تفعيل حساب الإنتاج. يطبق هذا التطبيق حاليا Redirect Form؛ أما مسار Payment API فهو منفصل.|1. أكمل Monri onboarding|احصل على حساب merchant اختباري في Monri WebPay وأكمل نماذج الوصول التي يطلبها Monri أو بنك acquiring.|شغل تكامل redirect-form الكامل في بيئة الاختبار، ثم أبلغ Monri Support عندما يصبح المتجر الإلكتروني جاهزا للفحص.|انتظر فحص موقع Monri/البنك، توقيع عقد البنك، إصدار TID/MID، تسجيل 3-D Secure، وتفعيل بيئة الإنتاج.|2. اجعل المتجر الإلكتروني متوافقا|انشر البيانات القانونية للشركة، أرقام الضرائب/الشركة، العنوان المسجل، عنوان المتجر إذا كان مختلفا، الهاتف وemail دعم العملاء.|انشر شروط البيع، بيان الخصوصية، مواعيد التسليم، معالجة الشكاوى، الإلغاء، الاسترداد وشروط الدفع.|اعرض فقط علامات البطاقات المقبولة، شعارات البطاقات وأمان الدفع المطلوبة، وأدرج شعار/رابط Monri Payments PSP حيث يطلب Monri ذلك.|3. اضبط أسرار الإنتاج|عيّن|في الإنتاج فقط. أبق بيانات اعتماد الاختبار وlive منفصلة.|عيّن live|من إعدادات merchant API للإنتاج.|اترك|غير مضبوط ما لم يقدم Monri endpoint مخصصا لـ redirect-form. هدف POST الافتراضي في live هو|الافتراضي للاختبار هو|لا تتحقق من URL هذا بفتحه مباشرة في browser.|لا تستبدل URL النموذج بمسار Payment API إلا إذا أعيدت كتابة provider لذلك المسار. يستخدم Payment API|طلبات JSON و|Authorization header.|اختر|عن قصد: استخدم|للدفع الفوري، أو|فقط إذا كانت العمليات جاهزة لتنفيذ capture أو void للحجوزات في Monri.|4. اضبط إعدادات Monri API|قدّم checkout وكل Monri return endpoint عبر HTTPS على نطاق الإنتاج النهائي.|في ملف Monri merchant فعّل redirect إلى Success URL. يرسل هذا التطبيق|لكل دفعة ويتحقق من digest العائد قبل تحديث حالة الدفع.|اضبط Callback URL كـ|أو اضبط نفس URL المطلق في|يرسله هذا التطبيق إلى Monri كـ|لكل دفعة.|اطلب من Monri Support إعداد webhooks إذا كنت تحتاج أحداث declined أو refund أو void أو capture أو tokenization خارج callback القياسي approved-transaction.|5. تحقق من معاملات الاختبار|اختبر مسارات Visa وMastercard وMaestro و3-D Secure approved باستخدام بطاقات اختبار Monri قبل طلب موافقة الإنتاج.|اختبر مسارات declined وcancelled. يمكن أن تبقى البطاقة declined على نموذج Monri، لذلك لا تعتمد فقط على عودة المشتري إلى المتجر.|أكد أن callback يرجع HTTP 200، وتحقق من|توقيع SHA-512، وحدّث الطلب مرة واحدة فقط إذا أعاد Monri محاولة نفس callback.|أكد أن digest الخاص بـ Success URL يتم فحصه مقابل URL الخام encoded وأن return URL المزورة أو المنتهية لا تجعل الطلبات مدفوعة.|6. ضوابط Go-live|فعّل Monri أولا لطلب live صغير، طابقه في بوابة Monri وطلب المتجر، ثم افتحه لكل المشترين.|قيّد الوصول إلى أسرار live، ودوّر أي قيم اختبار مسربة، وأبق سجلات Monri خالية من أرقام البطاقات أو بيانات حامل البطاقة الحساسة.|وثق من يتعامل مع captures وvoids وrefunds وcallback الفاشلة وchargebacks وتصعيدات support مع Monri أو بنك acquiring.|التوثيق:|Redirect Form|Payment API|امتثال المتجر الإلكتروني|مسار merchant",
  id: "Checklist kesiapan produksi Monri|Gunakan checklist ini setelah variabel env dasar di atas sudah ada. Monri mewajibkan integrasi uji dan konten webshop ditinjau sebelum akun produksi diaktifkan. Aplikasi ini saat ini menerapkan Redirect Form; alur Payment API terpisah.|1. Selesaikan onboarding Monri|Dapatkan akun merchant uji Monri WebPay dan lengkapi formulir akses yang diminta oleh Monri atau bank acquiring.|Jalankan integrasi redirect-form penuh di lingkungan uji, lalu beri tahu Monri Support saat webshop siap diperiksa.|Tunggu pemeriksaan situs Monri/bank, penandatanganan kontrak bank, penerbitan TID/MID, registrasi 3-D Secure, dan aktivasi lingkungan produksi.|2. Buat webshop sesuai aturan|Publikasikan data legal perusahaan, nomor pajak/perusahaan, alamat terdaftar, alamat webshop jika berbeda, telepon, dan email dukungan pelanggan.|Publikasikan syarat penjualan, pernyataan privasi, waktu pengiriman, penanganan keluhan, pembatalan, refund, dan ketentuan pembayaran.|Tampilkan hanya merek kartu yang diterima, logo kartu dan keamanan pembayaran yang diwajibkan, serta sertakan logo/link Monri Payments PSP jika diwajibkan Monri.|3. Konfigurasikan rahasia produksi|Atur|hanya di produksi. Pisahkan kredensial uji dan live.|Atur live|dari pengaturan merchant API produksi.|Biarkan|tidak diatur kecuali Monri memberi endpoint redirect-form khusus. Target POST live default adalah|default uji adalah|Jangan validasi URL ini dengan membukanya langsung di browser.|Jangan ganti URL formulir dengan path Payment API kecuali provider ditulis ulang untuk alur itu. Payment API menggunakan|permintaan JSON dan sebuah|Authorization header.|Pilih|secara sengaja: gunakan|untuk pembayaran langsung, atau|hanya jika operasi siap melakukan capture atau void reservasi di Monri.|4. Konfigurasikan pengaturan Monri API|Sajikan checkout dan semua Monri return endpoint melalui HTTPS pada domain produksi final.|Di profil merchant Monri, aktifkan redirect ke Success URL. Aplikasi ini mengirim|per pembayaran dan memvalidasi digest yang dikembalikan sebelum memperbarui status pembayaran.|Konfigurasikan Callback URL sebagai|atau atur URL absolut yang sama di|Aplikasi ini mengirimkannya ke Monri sebagai|untuk setiap pembayaran.|Minta Monri Support mengonfigurasi webhooks jika Anda membutuhkan event declined, refund, void, capture, atau tokenization di luar callback approved-transaction standar.|5. Verifikasi transaksi uji|Uji alur approved Visa, Mastercard, Maestro, dan 3-D Secure dengan kartu uji Monri sebelum meminta persetujuan produksi.|Uji alur declined dan cancelled. Kartu declined bisa tetap berada di formulir Monri, jadi jangan hanya mengandalkan pembeli kembali ke toko.|Pastikan callback mengembalikan HTTP 200, verifikasi|tanda tangan SHA-512, dan perbarui pesanan tepat sekali jika Monri mencoba ulang callback yang sama.|Pastikan digest Success URL diperiksa terhadap URL encoded mentah dan return URL palsu atau kedaluwarsa tidak menandai pesanan sebagai dibayar.|6. Kontrol go-live|Aktifkan Monri terlebih dahulu untuk satu pesanan live kecil, rekonsiliasikan di portal Monri dan pesanan webshop, lalu buka untuk semua pembeli.|Batasi akses ke rahasia live, rotasi nilai uji yang bocor, dan pastikan log Monri bebas dari nomor kartu atau data sensitif pemegang kartu.|Dokumentasikan siapa yang menangani captures, voids, refunds, callback gagal, chargebacks, dan eskalasi support dengan Monri atau bank acquiring.|Dokumentasi:|Redirect Form|Payment API|kepatuhan webshop|alur merchant",
  cs: "Kontrolní seznam připravenosti Monri do produkce|Použijte tento seznam poté, co jsou výše přítomné základní env proměnné. Monri vyžaduje kontrolu testovací integrace a obsahu e-shopu před aktivací produkčního účtu. Tato aplikace aktuálně implementuje Redirect Form; tok Payment API je samostatný.|1. Dokončete Monri onboarding|Získejte testovací merchant účet Monri WebPay a vyplňte přístupové formuláře požadované Monri nebo acquiring bankou.|Spusťte úplnou redirect-form integraci v testovacím prostředí a poté informujte Monri Support, když je e-shop připraven ke kontrole.|Počkejte na kontrolu webu Monri/bankou, podpis bankovní smlouvy, vydání TID/MID, registraci 3-D Secure a aktivaci produkčního prostředí.|2. Uveďte e-shop do souladu|Zveřejněte právní údaje firmy, daňová/firemní čísla, registrovanou adresu, adresu e-shopu, pokud se liší, telefon a email zákaznické podpory.|Zveřejněte obchodní podmínky, prohlášení o ochraně soukromí, dodací lhůty, řešení stížností, zrušení, refundace a platební podmínky.|Zobrazte jen přijímané značky karet, povinná loga karet a bezpečnosti plateb a zahrňte logo/link Monri Payments PSP tam, kde to Monri vyžaduje.|3. Nastavte produkční tajemství|Nastavit|pouze v produkci. Testovací a live přihlašovací údaje držte odděleně.|Nastavit live|z produkčních nastavení merchant API.|Ponechat|nenastavené, pokud Monri neposkytne vlastní redirect-form endpoint. Výchozí live POST cíl je|výchozí testovací cíl je|Neověřujte tento URL přímým otevřením v browseru.|Nenahrazujte URL formuláře cestou Payment API, pokud provider není přepsán pro tento tok. Payment API používá|JSON požadavky a|Authorization header.|Vyberte|záměrně: použijte|pro okamžitou platbu, nebo|jen pokud jsou operations připraveny provádět capture nebo void rezervací v Monri.|4. Nastavte Monri API nastavení|Checkout a všechny Monri return endpointy poskytujte přes HTTPS na finální produkční doméně.|V Monri merchant profilu povolte redirect na Success URL. Tato aplikace odesílá|pro každou platbu a ověří vrácený digest před aktualizací stavu platby.|Nastavte Callback URL jako|nebo nastavte stejný absolutní URL v|Tato aplikace jej posílá do Monri jako|pro každou platbu.|Požádejte Monri Support o nastavení webhooks, pokud potřebujete události declined, refund, void, capture nebo tokenization nad rámec standardního approved-transaction callbacku.|5. Ověřte testovací transakce|Otestujte approved toky Visa, Mastercard, Maestro a 3-D Secure s testovacími kartami Monri před žádostí o produkční schválení.|Otestujte declined a cancelled toky. Declined karta může zůstat ve formuláři Monri, proto nespoléhejte pouze na návrat kupujícího do obchodu.|Potvrďte, že callbacky vracejí HTTP 200, ověřte|podpis SHA-512 a objednávku aktualizujte přesně jednou, pokud Monri zopakuje stejný callback.|Potvrďte, že digest Success URL je kontrolován vůči surovému encoded URL a že falešné nebo expirované return URL neoznačí objednávky jako zaplacené.|6. Go-live kontroly|Nejprve zapněte Monri pro malou live objednávku, odsouhlaste ji v portálu Monri a objednávce e-shopu, pak ji otevřete všem kupujícím.|Omezte přístup k live tajemstvím, rotujte uniklé testovací hodnoty a udržujte logy Monri bez čísel karet nebo citlivých údajů držitele karty.|Zdokumentujte, kdo řeší captures, voids, refunds, neúspěšné callbacky, chargebacks a support eskalace s Monri nebo acquiring bankou.|Dokumentace:|Redirect Form|Payment API|soulad e-shopu|merchant tok",
  ro: "Listă de verificare pentru pregătirea Monri în producție|Folosește această listă după ce variabilele env de bază de mai sus sunt prezente. Monri cere ca integrarea de test și conținutul webshopului să fie revizuite înainte de activarea contului de producție. Această aplicație implementează momentan Redirect Form; fluxul Payment API este separat.|1. Finalizează Monri onboarding|Obține un cont merchant de test Monri WebPay și completează formularele de acces cerute de Monri sau de banca acquiring.|Rulează integrarea redirect-form completă în mediul de test, apoi anunță Monri Support când webshopul este pregătit pentru inspecție.|Așteaptă inspecția site-ului Monri/bancă, semnarea contractului bancar, emiterea TID/MID, înregistrarea 3-D Secure și activarea mediului de producție.|2. Fă webshopul conform|Publică datele legale ale companiei, numerele fiscale/de companie, adresa înregistrată, adresa webshopului dacă diferă, telefonul și emailul de suport clienți.|Publică termenii de vânzare, declarația de confidențialitate, timpii de livrare, gestionarea reclamațiilor, anularea, refund și condițiile de plată.|Afișează doar brandurile de card acceptate, logo-urile obligatorii de card și securitate a plății și include logo/link Monri Payments PSP unde Monri cere.|3. Configurează secretele de producție|Setează|doar în producție. Păstrează separat acreditările de test și live.|Setează live|din setările merchant API de producție.|Lasă|nesetat dacă Monri nu oferă un endpoint redirect-form personalizat. Ținta POST live implicită este|valoarea implicită de test este|Nu valida acest URL deschizându-l direct în browser.|Nu înlocui URL-ul formularului cu calea Payment API dacă provider nu este rescris pentru acel flux. Payment API folosește|cereri JSON și un|Authorization header.|Alege|deliberat: folosește|pentru plată imediată, sau|doar dacă operațiunile sunt pregătite să facă capture sau void pentru rezervări în Monri.|4. Configurează setările Monri API|Servește checkout și toate Monri return endpoint-urile prin HTTPS pe domeniul final de producție.|În profilul merchant Monri, activează redirect către Success URL. Această aplicație trimite|pentru fiecare plată și validează digest-ul returnat înainte de actualizarea stării plății.|Configurează Callback URL ca|sau setează același URL absolut în|Această aplicație îl trimite la Monri ca|pentru fiecare plată.|Cere Monri Support să configureze webhooks dacă ai nevoie de evenimente declined, refund, void, capture sau tokenization dincolo de callbackul standard approved-transaction.|5. Verifică tranzacțiile de test|Testează fluxurile approved Visa, Mastercard, Maestro și 3-D Secure cu carduri de test Monri înainte de a cere aprobarea de producție.|Testează fluxurile declined și cancelled. Un card declined poate rămâne în formularul Monri, deci nu te baza doar pe revenirea cumpărătorului în magazin.|Confirmă că callbackurile returnează HTTP 200, verifică|semnătura SHA-512 și actualizează comanda exact o singură dată dacă Monri repetă același callback.|Confirmă că digest-ul Success URL este verificat față de URL-ul encoded brut și că return URL-uri falsificate sau expirate nu marchează comenzile ca plătite.|6. Controale go-live|Activează Monri mai întâi pentru o comandă live mică, reconciliaz-o în portalul Monri și în comanda webshopului, apoi deschide pentru toți cumpărătorii.|Restricționează accesul la secrete live, rotește valorile de test scurse și păstrează logurile Monri fără numere de card sau date sensibile ale deținătorului.|Documentează cine gestionează captures, voids, refunds, callbackuri eșuate, chargebacks și escaladări support cu Monri sau banca acquiring.|Documentație:|Redirect Form|Payment API|conformitate webshop|flux merchant",
  el: "Λίστα ετοιμότητας παραγωγής Monri|Χρησιμοποίησε αυτή τη λίστα αφού υπάρχουν οι βασικές env μεταβλητές παραπάνω. Η Monri απαιτεί να ελεγχθεί η δοκιμαστική ενσωμάτωση και το περιεχόμενο του webshop πριν ενεργοποιηθεί ο λογαριασμός παραγωγής. Αυτή η εφαρμογή υλοποιεί επί του παρόντος Redirect Form· η ροή Payment API είναι ξεχωριστή.|1. Ολοκλήρωσε το Monri onboarding|Απόκτησε έναν δοκιμαστικό merchant λογαριασμό Monri WebPay και συμπλήρωσε τις φόρμες πρόσβασης που ζητά η Monri ή η acquiring τράπεζα.|Εκτέλεσε την πλήρη redirect-form ενσωμάτωση στο δοκιμαστικό περιβάλλον και έπειτα ενημέρωσε το Monri Support όταν το webshop είναι έτοιμο για έλεγχο.|Περίμενε τον έλεγχο ιστότοπου Monri/τράπεζας, την υπογραφή τραπεζικής σύμβασης, την έκδοση TID/MID, την εγγραφή 3-D Secure και την ενεργοποίηση περιβάλλοντος παραγωγής.|2. Κάνε το webshop συμβατό|Δημοσίευσε τα νομικά στοιχεία της εταιρείας, φορολογικούς/εταιρικούς αριθμούς, καταχωρημένη διεύθυνση, διεύθυνση webshop αν διαφέρει, τηλέφωνο και email υποστήριξης πελατών.|Δημοσίευσε όρους πώλησης, δήλωση απορρήτου, χρόνους παράδοσης, διαχείριση παραπόνων, ακύρωση, refund και όρους πληρωμής.|Εμφάνισε μόνο αποδεκτά brands καρτών, τα απαιτούμενα λογότυπα καρτών και ασφάλειας πληρωμών, και συμπερίλαβε το λογότυπο/link Monri Payments PSP όπου το απαιτεί η Monri.|3. Ρύθμισε τα μυστικά παραγωγής|Ορισμός|μόνο στην παραγωγή. Κράτησε χωριστά τα test και live διαπιστευτήρια.|Ορισμός live|από τις ρυθμίσεις production merchant API.|Άφησε|μη ορισμένο εκτός αν η Monri δώσει προσαρμοσμένο redirect-form endpoint. Ο προεπιλεγμένος live POST στόχος είναι|η προεπιλογή δοκιμής είναι|Μην επαληθεύεις αυτό το URL ανοίγοντάς το απευθείας στον browser.|Μην αντικαθιστάς το URL φόρμας με τη διαδρομή Payment API εκτός αν ο provider έχει ξαναγραφτεί για αυτή τη ροή. Το Payment API χρησιμοποιεί|αιτήματα JSON και ένα|Authorization header.|Επίλεξε|σκόπιμα: χρησιμοποίησε|για άμεση πληρωμή, ή|μόνο αν οι λειτουργίες είναι έτοιμες για capture ή void κρατήσεων στη Monri.|4. Ρύθμισε τις Monri API ρυθμίσεις|Σέρβιρε το checkout και όλα τα Monri return endpoint μέσω HTTPS στο τελικό production domain.|Στο Monri merchant προφίλ, ενεργοποίησε redirect στο Success URL. Αυτή η εφαρμογή στέλνει|ανά πληρωμή και επαληθεύει το επιστρεφόμενο digest πριν ενημερώσει την κατάσταση πληρωμής.|Ρύθμισε το Callback URL ως|ή όρισε το ίδιο απόλυτο URL στο|Αυτή η εφαρμογή το στέλνει στη Monri ως|για κάθε πληρωμή.|Ζήτησε από το Monri Support να ρυθμίσει webhooks αν χρειάζεσαι events declined, refund, void, capture ή tokenization πέρα από το τυπικό approved-transaction callback.|5. Επαλήθευσε δοκιμαστικές συναλλαγές|Δοκίμασε approved ροές Visa, Mastercard, Maestro και 3-D Secure με δοκιμαστικές κάρτες Monri πριν ζητήσεις έγκριση παραγωγής.|Δοκίμασε ροές declined και cancelled. Μια declined κάρτα μπορεί να μείνει στη φόρμα Monri, οπότε μην βασίζεσαι μόνο στην επιστροφή του αγοραστή στο κατάστημα.|Επιβεβαίωσε ότι τα callback επιστρέφουν HTTP 200, επαλήθευσε την|υπογραφή SHA-512 και ενημέρωσε την παραγγελία ακριβώς μία φορά αν η Monri επαναλάβει το ίδιο callback.|Επιβεβαίωσε ότι το digest του Success URL ελέγχεται απέναντι στο raw encoded URL και ότι πλαστά ή ληγμένα return URL δεν σημειώνουν παραγγελίες ως πληρωμένες.|6. Έλεγχοι Go-live|Ενεργοποίησε πρώτα τη Monri για μια μικρή live παραγγελία, συμφιλίωσέ την στο Monri portal και στην παραγγελία webshop, μετά άνοιξέ την σε όλους τους αγοραστές.|Περιόρισε την πρόσβαση στα live μυστικά, εναλλάσσε τυχόν διαρρεύσασες test τιμές και κράτα τα Monri logs χωρίς αριθμούς καρτών ή ευαίσθητα δεδομένα κατόχου κάρτας.|Τεκμηρίωσε ποιος χειρίζεται captures, voids, refunds, αποτυχημένα callback, chargebacks και support escalations με τη Monri ή την acquiring τράπεζα.|Τεκμηρίωση:|Redirect Form|Payment API|συμμόρφωση webshop|merchant ροή",
  da: "Monri tjekliste for produktionsklarhed|Brug denne tjekliste, når de grundlæggende env-variabler ovenfor er til stede. Monri kræver, at testintegrationen og webshopindholdet gennemgås, før produktionskontoen aktiveres. Denne app implementerer aktuelt Redirect Form; Payment API-flowet er separat.|1. Afslut Monri onboarding|Få en Monri WebPay test merchant-konto, og udfyld de adgangsformularer, som Monri eller acquiring-banken kræver.|Kør hele redirect-form-integrationen i testmiljøet, og informer derefter Monri Support, når webshoppen er klar til inspektion.|Afvent Monri/bankens website-inspektion, underskrivelse af bankkontrakt, udstedelse af TID/MID, 3-D Secure-registrering og aktivering af produktionsmiljø.|2. Gør webshoppen compliant|Publicer virksomhedens juridiske data, skatte-/virksomhedsnumre, registreret adresse, webshopadresse hvis anderledes, telefon og kundesupport-email.|Publicer salgsbetingelser, privatlivserklæring, leveringstider, klagehåndtering, annullering, refund og betalingsbetingelser.|Vis kun accepterede kortbrands, påkrævede kort- og betalingssikkerhedslogoer, og inkluder Monri Payments PSP-logo/link hvor Monri kræver det.|3. Konfigurer produktionshemmeligheder|Sæt|kun i produktion. Hold test- og live-legitimationsoplysninger adskilt.|Sæt live|fra produktions merchant API-indstillingerne.|Lad|være usat, medmindre Monri giver et tilpasset redirect-form endpoint. Det live standard POST-mål er|teststandarden er|Valider ikke denne URL ved at åbne den direkte i browseren.|Erstat ikke formular-URL'en med Payment API-stien, medmindre provider er omskrevet til det flow. Payment API bruger|JSON-forespørgsler og en|Authorization header.|Vælg|bevidst: brug|til øjeblikkelig betaling, eller|kun hvis operations er klar til capture eller void af reservationer i Monri.|4. Konfigurer Monri API-indstillinger|Servér checkout og alle Monri return endpoints over HTTPS på det endelige produktionsdomæne.|Aktivér redirect til Success URL i Monri merchant-profilen. Denne app sender|pr. betaling og validerer den returnerede digest, før betalingsstatus opdateres.|Konfigurer Callback URL som|eller sæt den samme absolutte URL i|Denne app sender den til Monri som|for hver betaling.|Bed Monri Support konfigurere webhooks, hvis du har brug for declined, refund, void, capture eller tokenization events ud over det standard approved-transaction callback.|5. Verificer testtransaktioner|Test approved Visa-, Mastercard-, Maestro- og 3-D Secure-flows med Monri testkort, før du anmoder om produktionsgodkendelse.|Test declined og cancelled flows. Et declined kort kan blive på Monri-formularen, så stol ikke kun på, at køberen vender tilbage til shoppen.|Bekræft, at callbacks returnerer HTTP 200, verificer|SHA-512-signaturen, og opdater ordren præcis én gang, hvis Monri gentager samme callback.|Bekræft, at Success URL-digest kontrolleres mod den rå encoded URL, og at falske eller udløbne return URLs ikke markerer ordrer som betalt.|6. Go-live-kontroller|Aktivér først Monri for en lille live ordre, afstem den i Monri-portalen og webshopordren, og åbn derefter for alle købere.|Begræns adgang til live-hemmeligheder, roter lækkede testværdier, og hold Monri-logs fri for kortnumre eller følsomme kortindehaverdata.|Dokumentér hvem der håndterer captures, voids, refunds, mislykkede callbacks, chargebacks og supporteskaleringer med Monri eller acquiring-banken.|Dokumentation:|Redirect Form|Payment API|webshop compliance|merchant-flow",
  sv: "Monri checklista för produktionsberedskap|Använd den här checklistan när de grundläggande env-variablerna ovan finns på plats. Monri kräver att testintegrationen och webshopinnehållet granskas innan produktionskontot aktiveras. Den här appen implementerar för närvarande Redirect Form; Payment API-flödet är separat.|1. Slutför Monri onboarding|Skaffa ett Monri WebPay test-merchantkonto och fyll i åtkomstformulären som Monri eller acquiring-banken kräver.|Kör hela redirect-form-integrationen i testmiljön och meddela sedan Monri Support när webshoppen är redo för inspektion.|Vänta på Monri/bankens webbplatsinspektion, underskrift av bankavtal, utfärdande av TID/MID, 3-D Secure-registrering och aktivering av produktionsmiljö.|2. Gör webshoppen compliant|Publicera företagets juridiska uppgifter, skatte-/företagsnummer, registrerad adress, webshopadress om annan, telefon och kundsupport-email.|Publicera köpvillkor, integritetsmeddelande, leveranstider, klagomålshantering, avbokning, refund och betalningsvillkor.|Visa endast accepterade kortvarumärken, obligatoriska kort- och betalningssäkerhetslogotyper och inkludera Monri Payments PSP-logo/link där Monri kräver det.|3. Konfigurera produktionshemligheter|Ange|endast i produktion. Håll test- och live-uppgifter separata.|Ange live|från produktionsinställningarna för merchant API.|Lämna|oangivet om Monri inte ger ett anpassat redirect-form endpoint. Standard live POST-mål är|teststandard är|Validera inte denna URL genom att öppna den direkt i browsern.|Ersätt inte formulär-URL:en med Payment API-sökvägen om inte provider har skrivits om för det flödet. Payment API använder|JSON-förfrågningar och en|Authorization header.|Välj|medvetet: använd|för omedelbar betalning, eller|endast om operations är redo att capture eller void reservationer i Monri.|4. Konfigurera Monri API-inställningar|Servera checkout och alla Monri return endpoints över HTTPS på den slutliga produktionsdomänen.|Aktivera redirect till Success URL i Monri merchant-profilen. Den här appen skickar|per betalning och validerar returnerad digest innan betalningsstatus uppdateras.|Konfigurera Callback URL som|eller ange samma absoluta URL i|Den här appen skickar den till Monri som|för varje betalning.|Be Monri Support konfigurera webhooks om du behöver declined, refund, void, capture eller tokenization events utöver standard approved-transaction callback.|5. Verifiera testtransaktioner|Testa approved Visa-, Mastercard-, Maestro- och 3-D Secure-flöden med Monri testkort innan du begär produktionsgodkännande.|Testa declined och cancelled flöden. Ett declined kort kan stanna på Monri-formuläret, så lita inte bara på att köparen återvänder till butiken.|Bekräfta att callbacks returnerar HTTP 200, verifiera|SHA-512-signaturen och uppdatera ordern exakt en gång om Monri försöker samma callback igen.|Bekräfta att Success URL-digest kontrolleras mot rå encoded URL och att förfalskade eller utgångna return URLs inte markerar ordrar som betalda.|6. Go-live-kontroller|Aktivera först Monri för en liten live order, stäm av den i Monri-portalen och webshopordern, och öppna sedan för alla köpare.|Begränsa åtkomst till live-hemligheter, rotera läckta testvärden och håll Monri-loggar fria från kortnummer eller känsliga kortinnehavardata.|Dokumentera vem som hanterar captures, voids, refunds, misslyckade callbacks, chargebacks och supporteskaleringar med Monri eller acquiring-banken.|Dokumentation:|Redirect Form|Payment API|webshop compliance|merchant-flöde",
  nb: "Monri sjekkliste for produksjonsklarhet|Bruk denne sjekklisten når de grunnleggende env-variablene ovenfor er på plass. Monri krever at testintegrasjonen og webshopinnholdet gjennomgås før produksjonskontoen aktiveres. Denne appen implementerer for øyeblikket Redirect Form; Payment API-flyten er separat.|1. Fullfør Monri onboarding|Skaff en Monri WebPay test merchant-konto og fullfør tilgangsskjemaene som Monri eller acquiring-banken ber om.|Kjør hele redirect-form-integrasjonen i testmiljøet, og varsle deretter Monri Support når webshoppen er klar for inspeksjon.|Vent på Monri/bankens nettstedinspeksjon, signering av bankkontrakt, utstedelse av TID/MID, 3-D Secure-registrering og aktivering av produksjonsmiljø.|2. Gjør webshoppen compliant|Publiser selskapets juridiske data, skatte-/selskapsnumre, registrert adresse, webshopadresse hvis annerledes, telefon og kundestøtte-email.|Publiser salgsvilkår, personvernerklæring, leveringstid, klagehåndtering, kansellering, refund og betalingsvilkår.|Vis bare aksepterte kortmerker, påkrevde kort- og betalingssikkerhetslogoer, og inkluder Monri Payments PSP-logo/link der Monri krever det.|3. Konfigurer produksjonshemmeligheter|Sett|bare i produksjon. Hold test- og live-legitimasjon adskilt.|Sett live|fra produksjonsinnstillingene for merchant API.|La|stå uinnstilt med mindre Monri gir et tilpasset redirect-form endpoint. Standard live POST-mål er|teststandard er|Ikke valider denne URL-en ved å åpne den direkte i browseren.|Ikke erstatt skjema-URL-en med Payment API-stien med mindre provider er skrevet om for den flyten. Payment API bruker|JSON-forespørsler og en|Authorization header.|Velg|bevisst: bruk|for umiddelbar betaling, eller|bare hvis operations er klare til å capture eller void reservasjoner i Monri.|4. Konfigurer Monri API-innstillinger|Server checkout og alle Monri return endpoints over HTTPS på det endelige produksjonsdomenet.|Aktiver redirect til Success URL i Monri merchant-profilen. Denne appen sender|per betaling og validerer returnert digest før betalingsstatus oppdateres.|Konfigurer Callback URL som|eller sett samme absolutte URL i|Denne appen sender den til Monri som|for hver betaling.|Be Monri Support konfigurere webhooks hvis du trenger declined, refund, void, capture eller tokenization events utover standard approved-transaction callback.|5. Verifiser testtransaksjoner|Test approved Visa-, Mastercard-, Maestro- og 3-D Secure-flyter med Monri testkort før du ber om produksjonsgodkjenning.|Test declined og cancelled flyter. Et declined kort kan bli på Monri-skjemaet, så ikke stol bare på at kjøperen returnerer til butikken.|Bekreft at callbacks returnerer HTTP 200, verifiser|SHA-512-signaturen og oppdater ordren nøyaktig én gang hvis Monri prøver samme callback på nytt.|Bekreft at Success URL-digest kontrolleres mot rå encoded URL og at forfalskede eller utløpte return URLs ikke markerer ordrer som betalt.|6. Go-live-kontroller|Aktiver først Monri for en liten live ordre, avstem den i Monri-portalen og webshopordren, og åpne deretter for alle kjøpere.|Begrens tilgang til live-hemmeligheter, roter lekkede testverdier og hold Monri-logger fri for kortnumre eller sensitive kortholderdata.|Dokumenter hvem som håndterer captures, voids, refunds, mislykkede callbacks, chargebacks og supporteskaleringer med Monri eller acquiring-banken.|Dokumentasjon:|Redirect Form|Payment API|webshop compliance|merchant-flyt",
  nn: "Monri sjekkliste for produksjonsklarleik|Bruk denne sjekklista når dei grunnleggjande env-variablane ovanfor er på plass. Monri krev at testintegrasjonen og webshopinnhaldet blir gjennomgått før produksjonskontoen blir aktivert. Denne appen implementerer no Redirect Form; Payment API-flyten er separat.|1. Fullfør Monri onboarding|Skaff ein Monri WebPay test merchant-konto og fullfør tilgangsskjema som Monri eller acquiring-banken ber om.|Køyr heile redirect-form-integrasjonen i testmiljøet, og varsle deretter Monri Support når webshoppen er klar for inspeksjon.|Vent på Monri/banken si nettstadinspeksjon, signering av bankkontrakt, utferding av TID/MID, 3-D Secure-registrering og aktivering av produksjonsmiljø.|2. Gjer webshoppen compliant|Publiser juridiske data for selskapet, skatte-/selskapsnummer, registrert adresse, webshopadresse dersom annleis, telefon og kundestøtte-email.|Publiser salsvilkår, personvernerklæring, leveringstid, klagehandsaming, kansellering, refund og betalingsvilkår.|Vis berre aksepterte kortmerke, påkravde kort- og betalings tryggleikslogoar, og inkluder Monri Payments PSP-logo/link der Monri krev det.|3. Konfigurer produksjonsløyndomar|Set|berre i produksjon. Hald test- og live-legitimasjon skilde.|Set live|frå produksjonsinnstillingane for merchant API.|Lat|stå uinnstilt med mindre Monri gir eit tilpassa redirect-form endpoint. Standard live POST-mål er|teststandard er|Ikkje valider denne URL-en ved å opne han direkte i browseren.|Ikkje erstatt skjema-URL-en med Payment API-stien med mindre provider er skriven om for den flyten. Payment API bruker|JSON-førespurnader og ein|Authorization header.|Vel|medvite: bruk|for umiddelbar betaling, eller|berre dersom operations er klare til å capture eller void reservasjonar i Monri.|4. Konfigurer Monri API-innstillingar|Server checkout og alle Monri return endpoints over HTTPS på det endelege produksjonsdomenet.|Aktiver redirect til Success URL i Monri merchant-profilen. Denne appen sender|per betaling og validerer returnert digest før betalingsstatus blir oppdatert.|Konfigurer Callback URL som|eller set same absolutte URL i|Denne appen sender han til Monri som|for kvar betaling.|Be Monri Support konfigurere webhooks dersom du treng declined, refund, void, capture eller tokenization events utover standard approved-transaction callback.|5. Verifiser testtransaksjonar|Test approved Visa-, Mastercard-, Maestro- og 3-D Secure-flytar med Monri testkort før du ber om produksjonsgodkjenning.|Test declined og cancelled flytar. Eit declined kort kan bli på Monri-skjemaet, så ikkje stol berre på at kjøparen vender tilbake til butikken.|Stadfest at callbacks returnerer HTTP 200, verifiser|SHA-512-signaturen og oppdater ordren nøyaktig éin gong dersom Monri prøver same callback på nytt.|Stadfest at Success URL-digest blir kontrollert mot rå encoded URL og at forfalska eller utgåtte return URLs ikkje markerer ordrar som betalte.|6. Go-live-kontrollar|Aktiver først Monri for ein liten live ordre, avstem han i Monri-portalen og webshopordren, og opne deretter for alle kjøparar.|Avgrens tilgang til live-løyndomar, roter lekne testverdiar og hald Monri-loggar frie for kortnummer eller sensitive korthaldardata.|Dokumenter kven som handterer captures, voids, refunds, mislukka callbacks, chargebacks og supporteskaleringar med Monri eller acquiring-banken.|Dokumentasjon:|Redirect Form|Payment API|webshop compliance|merchant-flyt",
  fi: "Monri tuotantovalmiuden tarkistuslista|Käytä tätä tarkistuslistaa, kun yllä olevat perus env-muuttujat ovat paikallaan. Monri edellyttää testi-integraation ja verkkokaupan sisällön tarkistusta ennen tuotantotilin aktivointia. Tämä sovellus toteuttaa tällä hetkellä Redirect Form -ratkaisun; Payment API -virta on erillinen.|1. Viimeistele Monri onboarding|Hanki Monri WebPay -testi merchant -tili ja täytä Monrin tai acquiring-pankin pyytämät käyttöoikeuslomakkeet.|Suorita koko redirect-form-integraatio testiympäristössä ja ilmoita sitten Monri Supportille, kun verkkokauppa on valmis tarkastukseen.|Odota Monri/pankin sivustotarkastusta, pankkisopimuksen allekirjoitusta, TID/MID-tunnusten myöntämistä, 3-D Secure -rekisteröintiä ja tuotantoympäristön aktivointia.|2. Tee verkkokaupasta vaatimusten mukainen|Julkaise yrityksen lakisääteiset tiedot, vero-/yritysnumerot, rekisteröity osoite, verkkokaupan osoite jos eri, puhelin ja asiakastuen email.|Julkaise myyntiehdot, tietosuojaseloste, toimitusajat, reklamaatioiden käsittely, peruutus, refund ja maksuehdot.|Näytä vain hyväksytyt korttibrändit, vaaditut kortti- ja maksuturvallisuuslogot sekä Monri Payments PSP -logo/link, kun Monri sitä vaatii.|3. Määritä tuotantosalaisuudet|Aseta|vain tuotannossa. Pidä testi- ja live-tunnukset erillään.|Aseta live|tuotannon merchant API -asetuksista.|Jätä|asettamatta, ellei Monri anna mukautettua redirect-form endpointia. Live-oletuksen POST-kohde on|testioletus on|Älä validoi tätä URL-osoitetta avaamalla sitä suoraan browserissa.|Älä korvaa lomakkeen URL-osoitetta Payment API -polulla, ellei provider ole kirjoitettu uudelleen tätä virtaa varten. Payment API käyttää|JSON-pyyntöjä ja|Authorization headeria.|Valitse|tietoisesti: käytä|välittömään maksuun, tai|vain jos operations on valmis tekemään capture- tai void-toimia Monri-varauksille.|4. Määritä Monri API -asetukset|Tarjoa checkout ja kaikki Monri return endpointit HTTPS:n yli lopullisessa tuotantodomainissa.|Ota Monri merchant -profiilissa käyttöön redirect Success URL -osoitteeseen. Tämä sovellus lähettää|jokaiselle maksulle ja validoi palautetun digestin ennen maksutilan päivittämistä.|Määritä Callback URL muodossa|tai aseta sama absoluuttinen URL kohtaan|Tämä sovellus lähettää sen Monrille arvona|jokaiselle maksulle.|Pyydä Monri Supportia määrittämään webhooks, jos tarvitset declined-, refund-, void-, capture- tai tokenization-tapahtumia standardin approved-transaction callbackin lisäksi.|5. Vahvista testitapahtumat|Testaa approved Visa-, Mastercard-, Maestro- ja 3-D Secure -virrat Monri-testikorteilla ennen tuotantohyväksynnän pyytämistä.|Testaa declined- ja cancelled-virrat. Declined kortti voi jäädä Monri-lomakkeelle, joten älä luota vain siihen, että ostaja palaa kauppaan.|Varmista, että callbackit palauttavat HTTP 200, tarkista|SHA-512-allekirjoitus ja päivitä tilaus täsmälleen kerran, jos Monri yrittää samaa callbackia uudelleen.|Varmista, että Success URL -digest tarkistetaan raakaa encoded URL -osoitetta vasten ja ettei väärennetyt tai vanhentuneet return URL:t merkitse tilauksia maksetuiksi.|6. Go-live-kontrollit|Ota Monri ensin käyttöön pienelle live-tilaukselle, täsmäytä se Monri-portaalissa ja verkkokaupan tilauksessa, ja avaa sitten kaikille ostajille.|Rajoita live-salaisuuksien käyttöä, kierrätä vuotaneet testiarvot ja pidä Monri-lokit vapaina korttinumeroista tai arkaluonteisista kortinhaltijatiedoista.|Dokumentoi, kuka käsittelee captures, voids, refunds, epäonnistuneet callbackit, chargebacks ja support-eskalaatiot Monrin tai acquiring-pankin kanssa.|Dokumentaatio:|Redirect Form|Payment API|verkkokaupan vaatimustenmukaisuus|merchant-virta",
  is: "Monri gátlisti fyrir framleiðsluviðbúnað|Notaðu þennan lista þegar grunn env breyturnar hér að ofan eru til staðar. Monri krefst þess að prófunarsamþætting og efni vefverslunar séu yfirfarin áður en framleiðslureikningur er virkjaður. Þetta app útfærir nú Redirect Form; Payment API flæðið er aðskilið.|1. Ljúktu Monri onboarding|Fáðu Monri WebPay prófunar merchant reikning og fylltu út aðgangseyðublöð sem Monri eða acquiring bankinn biður um.|Keyrðu alla redirect-form samþættinguna í prófunarumhverfi og láttu síðan Monri Support vita þegar vefverslunin er tilbúin til skoðunar.|Bíddu eftir Monri/banka vefskoðun, undirritun bankasamnings, útgáfu TID/MID, 3-D Secure skráningu og virkjun framleiðsluumhverfis.|2. Gerðu vefverslunina samhæfa|Birtu lagalegar upplýsingar fyrirtækis, skatta-/fyrirtækjanúmer, skráð heimilisfang, vefverslunarheimilisfang ef annað, síma og email þjónustuvers.|Birtu söluskilmála, persónuverndaryfirlýsingu, afhendingartíma, meðhöndlun kvartana, afturköllun, refund og greiðsluskilmála.|Sýndu aðeins samþykkt kortamerki, nauðsynleg merki korta og greiðsluöryggis og bættu við Monri Payments PSP logo/link þar sem Monri krefst þess.|3. Stilltu framleiðsluleyndarmál|Stilltu|aðeins í framleiðslu. Haltu prófunar- og live skilríkjum aðskildum.|Stilltu live|úr framleiðslu merchant API stillingum.|Skildu|eftir óstillt nema Monri gefi sérsniðið redirect-form endpoint. Sjálfgefið live POST mark er|sjálfgefið prófunarmark er|Ekki staðfesta þessa URL með því að opna hana beint í browser.|Ekki skipta form URL út fyrir Payment API slóð nema provider hafi verið endurskrifaður fyrir það flæði. Payment API notar|JSON beiðnir og|Authorization header.|Veldu|meðvitað: notaðu|fyrir tafarlausa greiðslu, eða|aðeins ef operations eru tilbúnar til að capture eða void bókanir í Monri.|4. Stilltu Monri API stillingar|Þjónaðu checkout og öllum Monri return endpoints yfir HTTPS á endanlegu framleiðsluléni.|Í Monri merchant prófíl skaltu virkja redirect á Success URL. Þetta app sendir|fyrir hverja greiðslu og staðfestir skilað digest áður en greiðslustaða er uppfærð.|Stilltu Callback URL sem|eða stilltu sömu algildu URL í|Þetta app sendir hana til Monri sem|fyrir hverja greiðslu.|Biddu Monri Support að stilla webhooks ef þú þarft declined, refund, void, capture eða tokenization atburði umfram staðlaða approved-transaction callbackið.|5. Staðfestu prófunarfærslur|Prófaðu approved Visa, Mastercard, Maestro og 3-D Secure flæði með Monri prófunarkortum áður en beðið er um framleiðslusamþykki.|Prófaðu declined og cancelled flæði. Declined kort getur verið áfram á Monri forminu, svo treystu ekki aðeins á að kaupandi snúi aftur í búðina.|Staðfestu að callbacks skili HTTP 200, staðfestu|SHA-512 undirskriftina og uppfærðu pöntunina nákvæmlega einu sinni ef Monri reynir sama callback aftur.|Staðfestu að Success URL digest sé athugað gegn hráu encoded URL og að fölsuð eða útrunnin return URL merki ekki pantanir sem greiddar.|6. Go-live stýringar|Virkjaðu Monri fyrst fyrir litla live pöntun, stemmdu hana af í Monri gáttinni og vefverslunarpöntuninni, opnaðu svo fyrir alla kaupendur.|Takmarkaðu aðgang að live leyndarmálum, skiptu út leknu prófunargildum og haltu Monri loggum lausum við kortanúmer eða viðkvæm korthafagögn.|Skráðu hver sér um captures, voids, refunds, misheppnuð callbacks, chargebacks og support escalations með Monri eða acquiring bankanum.|Skjölun:|Redirect Form|Payment API|samræmi vefverslunar|merchant flæði",
} satisfies Record<PaymentAndLicenseRowLanguage, string>;

const SERBIAN_TOOLTIP_TRANSLATIONS = {
  "Account holder": "Primalac plaćanja",
  "Account number": "Broj računa",
  "Adds a government/public sector buyer type alongside business buyers.":
    "Dodaje tip kupca iz javnog sektora pored poslovnih kupaca.",
  "Adds a payment request PDF to customer receipt emails for selected unpaid payment methods.":
    "Dodaje PDF zahtev za plaćanje u mejlove računa kupcu za izabrane neplaćene metode plaćanja.",
  "Allows customers to choose pickup instead of delivery when available.":
    "Omogućava kupcima da izaberu lično preuzimanje umesto dostave kada je dostupno.",
  "Allows customers to place orders without signing in first.":
    "Omogućava kupcima da poruče bez prethodne prijave.",
  "Applies country or region-specific labels and lightweight tax ID format checks.":
    "Primenjuje oznake specifične za državu ili region i osnovne provere formata poreskog ID-a.",
  "Apply free-shipping threshold": "Primeni prag besplatne dostave",
  "Attach for payment methods": "Priloži za metode plaćanja",
  "Attach payment request PDF": "Priloži PDF zahtev za plaćanje",
  "Bank name": "Naziv banke",
  "Base delivery price before product-level shipping additions or fixed-fee overrides.":
    "Osnovna cena dostave pre dodataka za dostavu na nivou proizvoda ili zamena fiksnom naknadom.",
  "Base fee": "Osnovna naknada",
  "Base shipping amount added to shippable orders before discounts or free-shipping rules.":
    "Osnovni iznos dostave dodat porudžbinama koje se šalju pre popusta ili pravila za besplatnu dostavu.",
  "Buyer-facing text shown after checkout with IPS QR payment steps and timing.":
    "Tekst za kupca prikazan posle naplate sa IPS QR koracima plaćanja i rokovima.",
  "Buyer-facing text shown after checkout with payment steps and timing.":
    "Tekst za kupca prikazan posle naplate sa koracima plaćanja i rokovima.",
  Category: "Kategorija",
  "Checkout enabled": "Naplata omogućena",
  "Checkout label": "Labela naplate",
  "Comma or space separated currency codes accepted by the store.":
    "Kodovi valuta koje prodavnica prihvata, odvojeni zarezom ili razmakom.",
  "Configured sender identity for webshop order emails. The delivery provider still uses EMAIL_FROM.":
    "Podešen identitet pošiljaoca za mejlove porudžbina veb-prodavnice. Provajder isporuke i dalje koristi EMAIL_FROM.",
  "Controls whether customers can or must checkout as a business or government buyer.":
    "Kontroliše da li kupci mogu ili moraju da završe kupovinu kao poslovni kupac ili kupac iz javnog sektora.",
  "Courier checkout description": "Opis kurira pri naplati",
  "Courier ID": "ID kurira",
  "Courier name": "Naziv kurira",
  "Courier name shown in admin and checkout courier details.":
    "Naziv kurira prikazan u administraciji i detaljima kurira pri naplati.",
  "Courier services": "Kurirske službe",
  "Couriers shown under shipping methods at checkout.":
    "Kuriri prikazani ispod metoda dostave pri naplati.",
  "Customer receipt email template": "Šablon mejla računa kupcu",
  "Customer receipt subject": "Naslov mejla računa kupcu",
  "Customer receipts": "Računi kupcima",
  "Customer status updates": "Ažuriranja statusa za kupca",
  "Customer-facing name used in checkout and store communication.":
    "Naziv koji kupac vidi tokom naplate i u komunikaciji prodavnice.",
  "Default currency": "Podrazumevana valuta",
  "Default shipping fee": "Podrazumevana dostava",
  "Default tax rate": "Podrazumevana poreska stopa",
  "Delivery choices, fees, limits, and courier coverage.":
    "Opcije dostave, naknade, ograničenja i pokrivenost kurira.",
  "Delivery option name that customers select at checkout.":
    "Naziv opcije dostave koju kupci biraju pri naplati.",
  Description: "Opis",
  "Display order at checkout. Lower numbers appear first.":
    "Redosled prikaza pri naplati. Niži brojevi se prikazuju prvi.",
  "Domestic account number for manual bank transfer payments.":
    "Domaći broj računa za ručna plaćanja bankovnim prenosom.",
  "Domestic Serbian recipient account number used in the IPS QR payload.":
    "Domaći srpski broj računa primaoca koji se koristi u IPS QR podacima.",
  "E-invoice label": "Labela e-fakture",
  "Email address customer replies should go to when they answer receipt emails.":
    "Mejl adresa na koju stižu odgovori kupaca kada odgovore na mejlove računa.",
  "Exemption certificate label": "Labela potvrde o izuzeću",
  "Fallback tax percentage applied when a product or order does not specify another rate.":
    "Rezervni procenat poreza koji se primenjuje kada proizvod ili porudžbina ne navode drugu stopu.",
  "Fallback three-letter currency code for new products, fees, and totals.":
    "Rezervni troslovni kod valute za nove proizvode, naknade i ukupne iznose.",
  "Field profile": "Profil polja",
  "Free shipping threshold": "Prag besplatne dostave",
  "Government customers": "Kupci iz javnog sektora",
  "Guest checkout": "Naplata za goste",
  "Helper text shown under the IPS QR payment option at checkout.":
    "Pomoćni tekst prikazan ispod IPS QR opcije plaćanja pri naplati.",
  "Helper text shown under the Monri payment option at checkout.":
    "Pomoćni tekst prikazan ispod Monri opcije plaćanja pri naplati.",
  "Helper text shown under the Paddle payment option at checkout.":
    "Pomoćni tekst prikazan ispod Paddle opcije plaćanja pri naplati.",
  "Helper text shown under the PayPal payment option at checkout.":
    "Pomoćni tekst prikazan ispod PayPal opcije plaćanja pri naplati.",
  "Helper text shown under the Stripe payment option at checkout.":
    "Pomoćni tekst prikazan ispod Stripe opcije plaćanja pri naplati.",
  IBAN: "IBAN",
  Instructions: "Uputstva",
  "Internal recipient for new-order notifications. If empty, reply-to or sender email is used as a fallback.":
    "Interni primalac obaveštenja o novim porudžbinama. Ako je prazno, koristi se reply-to ili mejl pošiljaoca.",
  "Internal stable key saved on checkout and product overrides. Use lowercase text such as standard, express, or bulky.":
    "Interni stabilni ključ sačuvan na naplati i zamenama na nivou proizvoda. Koristi mala slova kao standard, express ili bulky.",
  "Internal stable key used by shipping methods and product overrides. Use lowercase text such as post-express or dhl.":
    "Interni stabilni ključ koji koriste metode dostave i zamene na nivou proizvoda. Koristi mala slova kao post-express ili dhl.",
  "International bank account number shown when cross-border transfers are supported.":
    "Međunarodni broj bankovnog računa prikazan kada su podržani prekogranični prenosi.",
  "Leave all unchecked to allow every enabled courier.":
    "Ostavi sve neoznačeno da dozvoliš svakog uključenog kurira.",
  "Legal note printed on the payment request PDF so customers understand this is not a final tax invoice.":
    "Pravna napomena odštampana na PDF zahtevu za plaćanje kako bi kupci razumeli da to nije konačna poreska faktura.",
  "Legal or business name customers should use as the payment recipient.":
    "Pravni ili poslovni naziv koji kupci treba da koriste kao primaoca plaćanja.",
  "Legal seller details printed on the payment request PDF, such as company name, address, tax ID, and registration number.":
    "Pravni podaci prodavca odštampani na PDF zahtevu za plaćanje, kao što su naziv firme, adresa, poreski ID i matični broj.",
  "Local pickup": "Lično preuzimanje",
  "Makes new products require shipping unless the product is configured differently.":
    "Podešava da novi proizvodi zahtevaju dostavu osim ako je proizvod podešen drugačije.",
  "Marks catalog prices as tax-inclusive instead of adding tax on top at checkout.":
    "Označava kataloške cene kao cene sa porezom umesto dodavanja poreza pri naplati.",
  "Max dimension": "Maksimalna dimenzija",
  "Max weight": "Maksimalna težina",
  "Maximum cart shipment weight in grams for this method. Leave blank for no weight limit.":
    "Maksimalna težina pošiljke iz korpe u gramima za ovu metodu. Ostavi prazno ako nema ograničenja težine.",
  "Maximum single package dimension in centimeters for this method. Leave blank for no size limit.":
    "Maksimalna dimenzija jednog paketa u centimetrima za ovu metodu. Ostavi prazno ako nema ograničenja veličine.",
  "Method checkout description": "Opis metode pri naplati",
  "Method ID": "ID metode",
  "Method label": "Labela metode",
  Mode: "Režim",
  "Name of the receiving bank shown in bank transfer instructions.":
    "Naziv banke primaoca prikazan u uputstvima za bankovni prenos.",
  "Next numeric sequence value that will be assigned to a new order.":
    "Sledeća numerička vrednost niza koja će biti dodeljena novoj porudžbini.",
  "Next order number": "Sledeći broj porudžbine",
  "Number of days the payment request should be considered valid.":
    "Broj dana tokom kojih zahtev za plaćanje treba smatrati važećim.",
  "Offline payment methods that should receive a payment request PDF attachment. Online receipt PDFs for Stripe, PayPal, and local card gateway are attached automatically when authorized or paid.":
    "Oflajn metode plaćanja koje treba da dobiju PDF zahtev za plaćanje kao prilog. Onlajn PDF računi za Stripe, PayPal i lokalni kartični gejtvej prilažu se automatski kada su autorizovani ili plaćeni.",
  "Open allows cart and checkout actions. Paused keeps catalog browsing visible but disables add-to-cart, coupons, and checkout.":
    "Otvoreno dozvoljava radnje korpe i naplate. Pauzirano ostavlja pregled kataloga vidljivim, ali isključuje dodavanje u korpu, kupone i naplatu.",
  "Optional customer-facing note for this courier, for example delivery area, timing, or handling notes.":
    "Opciona napomena za kupca za ovog kurira, na primer područje dostave, rokovi ili napomene za rukovanje.",
  "Optional customer-facing note shown under this shipping method.":
    "Opciona napomena za kupca prikazana ispod ove metode dostave.",
  "Optional label for buyer tax identification fields, such as VAT ID or PIB.":
    "Opciona labela za polja poreske identifikacije kupca, kao što su VAT ID ili PIB.",
  "Optional order subtotal that makes eligible shipping methods free; leave blank to disable.":
    "Opcioni međuzbir porudžbine koji čini podobne metode dostave besplatnim; ostavi prazno za isključivanje.",
  "Optional override for local e-invoice routing or recipient identifier.":
    "Opciona zamena za lokalno rutiranje e-fakture ili identifikator primaoca.",
  "Optional override for tax exemption or resale certificate reference.":
    "Opciona zamena za referencu poreskog izuzeća ili potvrde za preprodaju.",
  "Optional override for the company registration number label.":
    "Opciona zamena labele za matični broj kompanije.",
  "Optional override for the VAT, PIB, or tax ID label shown in checkout.":
    "Opciona zamena labele za VAT, PIB ili poreski ID prikazane pri naplati.",
  "Optional relative or full URL linked from checkout for terms and conditions.":
    "Opcioni relativni ili puni URL do uslova korišćenja povezan iz naplate.",
  "Order notification email template": "Šablon mejla obaveštenja o porudžbini",
  "Order notification recipient": "Primalac obaveštenja o porudžbini",
  "Order notification subject": "Naslov obaveštenja o porudžbini",
  "Order notifications": "Obaveštenja o porudžbinama",
  "Order prefix": "Prefiks porudžbine",
  "Payment code": "Šifra plaćanja",
  "Payment purpose text embedded into the IPS QR payload.":
    "Tekst svrhe plaćanja ugrađen u IPS QR podatke.",
  "Payment request note": "Napomena zahteva za plaćanje",
  "Payment request number prefix": "Prefiks broja zahteva za plaćanje",
  "Phone required": "Telefon obavezan",
  "Plain-text body sent to the customer after checkout when their order is created.":
    "Tekstualno telo mejla poslato kupcu posle naplate kada je porudžbina kreirana.",
  "Plain-text body sent to the customer when an admin changes order, payment, or fulfillment status.":
    "Tekstualno telo mejla poslato kupcu kada admin promeni status porudžbine, plaćanja ili ispunjenja.",
  "Plain-text body sent to the internal order notification recipient when a new order is created.":
    "Tekstualno telo mejla poslato internom primaocu obaveštenja kada se kreira nova porudžbina.",
  "Prefix added to generated payment references so transfers are easier to match.":
    "Prefiks dodat generisanim referencama plaćanja da bi se prenosi lakše uparili.",
  "Prefix used before the order number in the IPS payment reference.":
    "Prefiks koji se koristi pre broja porudžbine u IPS referenci plaćanja.",
  "Prefix used before the order number on generated payment request documents.":
    "Prefiks koji se koristi pre broja porudžbine na generisanim dokumentima zahteva za plaćanje.",
  "Prices include tax": "Cene uključuju porez",
  Purpose: "Svrha",
  Rate: "Stopa",
  "Recipient name printed into the IPS QR payment payload.":
    "Naziv primaoca odštampan u IPS QR podacima plaćanja.",
  "Reference model": "Model poziva na broj",
  "Reference prefix": "Prefiks poziva na broj",
  "Registration label": "Labela matičnog broja",
  "Reply-to email": "Mejl za odgovor",
  "Require tax ID": "Zahtevaj poreski ID",
  "Requires a phone number during checkout for delivery or support follow-up.":
    "Zahteva broj telefona tokom naplate radi dostave ili podrške.",
  "Requires shipping by default": "Podrazumevano zahteva dostavu",
  "Requires the configured VAT, PIB, or tax identification field for business buyers.":
    "Zahteva podešeno VAT, PIB ili poresko identifikaciono polje za poslovne kupce.",
  "Seller details": "Podaci prodavca",
  "Sender email": "Mejl pošiljaoca",
  "Sends an email to the customer when an admin changes order, payment, or fulfillment status.":
    "Šalje mejl kupcu kada admin promeni status porudžbine, plaćanja ili ispunjenja.",
  "Sends internal notifications when new orders are created.":
    "Šalje interna obaveštenja kada se kreiraju nove porudžbine.",
  "Sends order confirmation and receipt emails to customers after checkout.":
    "Šalje kupcima potvrdu porudžbine i mejlove računa posle naplate.",
  "Shipping methods": "Metodi dostave",
  "Short payment method name customers see during checkout.":
    "Kratak naziv metode plaćanja koji kupci vide tokom naplate.",
  "Sort order": "Redosled sortiranja",
  "Status update email template": "Šablon mejla ažuriranja statusa",
  "Status update subject": "Naslov ažuriranja statusa",
  "Store name": "Naziv prodavnice",
  "Store status": "Status prodavnice",
  "Subject for customer order confirmation and receipt emails.":
    "Naslov mejlova potvrde porudžbine i računa za kupca.",
  "Subject for customer order status update emails.":
    "Naslov mejlova za ažuriranje statusa porudžbine kupca.",
  "Subject for internal new-order notification emails.":
    "Naslov internih mejlova obaveštenja o novoj porudžbini.",
  "Supported currencies": "Podržane valute",
  "Tax ID label": "Labela poreskog ID-a",
  "Tax percentage.": "Procenat poreza.",
  "Terms URL": "URL uslova",
  "Text prefix used before generated order numbers.":
    "Tekstualni prefiks koji se koristi pre generisanih brojeva porudžbina.",
  "Three-digit Serbian payment code used in the IPS QR payload.":
    "Trocifrena srpska šifra plaćanja koja se koristi u IPS QR podacima.",
  "Turns the checkout flow on or off for customers.":
    "Uključuje ili isključuje tok naplate za kupce.",
  "Two-digit reference model prepended to the order payment reference.":
    "Dvocifreni model poziva na broj dodat ispred reference plaćanja porudžbine.",
  "Valid for days": "Važi dana",
  "When the order subtotal reaches the Free shipping threshold, this method becomes free. Turn off for express, bulky, or special delivery.":
    "Kada međuzbir porudžbine dostigne prag besplatne dostave, ova metoda postaje besplatna. Isključi za ekspresnu, kabastu ili posebnu dostavu.",
} as const satisfies Record<string, string>;

export const WEBSHOP_SETTINGS_SOURCE_STRINGS = [
  ...Object.values(COMMON_SOURCES),
  ...EXPLICIT_TOOLTIP_SOURCE_STRINGS,
  ...COURIER_COPY_SOURCE_STRINGS,
  ...PAYMENT_AND_LICENSE_SOURCE_STRINGS,
  ...PAYMENT_CONFIG_SOURCE_STRINGS,
  ...MONRI_CHECKLIST_SOURCE_STRINGS,
] as const;

type WebshopSettingsSource = (typeof WEBSHOP_SETTINGS_SOURCE_STRINGS)[number];
type CommonKey = keyof typeof COMMON_SOURCES;

const COMMON_TRANSLATIONS = {
  "sr-Latn": {
    actions: "Radnje",
    active: "Aktivno",
    addCategory: "Dodaj kategoriju",
    addCourier: "Dodaj kurira",
    addLicenseServer: "Dodaj licencni server",
    addMethod: "Dodaj metod",
    allStatuses: "Svi statusi",
    allVisibility: "Sva vidljivost",
    apiUrl: "API URL",
    archive: "Arhiviraj",
    archiveLicenseServer: "Arhiviraj licencni server",
    archived: "Arhivirano",
    auth: "Autentikacija",
    bankTransfer: "Bankovni prenos",
    businessBilling: "Poslovno fakturisanje",
    cancel: "Otkaži",
    cashOnDelivery: "Plaćanje pouzećem",
    catalog: "Katalog",
    checkout: "Naplata",
    checkoutLabel: "Labela naplate",
    configured: "podešeno",
    courierServices: "Kurirske službe",
    defaultCurrency: "Podrazumevana valuta",
    defaultShippingFee: "Podrazumevana dostava",
    description: "Opis",
    disabled: "Isključeno",
    editable: "Može da se uređuje",
    failed: "Neuspešno",
    fieldProfile: "Profil polja",
    freeShippingThreshold: "Prag besplatne dostave",
    hiddenPolicy: "Sakriveno iz menija politike proizvoda",
    inactive: "Neaktivno",
    instructions: "Uputstva",
    licenseServerArchived: "Licencni server je arhiviran.",
    licenseServerCreated: "Licencni server je kreiran.",
    licenseServerSaved: "Licencni server je sačuvan.",
    licenseServers: "Licencni serveri",
    missing: "nedostaje",
    mode: "Režim",
    monriSetup: "Monri podešavanje",
    needsSetup: "Potrebno podešavanje",
    noCatalogSnapshot: "Nema snimka kataloga",
    noLicenseServers: "Nema pronađenih license servera.",
    noSecret: "Nema tajne",
    notSynced: "Nije sinhronizovano",
    notifications: "Obaveštenja",
    open: "Otvoreno",
    optional: "Opciono",
    orders: "Porudžbine",
    pageOfPageCount: "Strana {page} od {pageCount}",
    paused: "Pauzirano",
    payments: "Plaćanja",
    ready: "Spremno",
    readOnly: "Samo za čitanje",
    required: "Obavezno",
    save: "Sačuvaj",
    saveChanges: "Sačuvaj izmene",
    searchLicenseServers: "Pretraži naslov, URL, client ID, fingerprint",
    secretSet: "Tajna podešena",
    settingsSummary: "Podrazumevane commerce postavke prodavnice.",
    shipping: "Dostava",
    shippingMethods: "Metodi dostave",
    shownPolicy: "Prikazano u meniju politike proizvoda",
    showingRange: "Prikaz {from}-{to} od {total}",
    status: "Status",
    store: "Prodavnica",
    storeName: "Naziv prodavnice",
    storeNameDescription:
      "Naziv koji kupac vidi tokom naplate i u komunikaciji prodavnice.",
    storeStatus: "Status prodavnice",
    supportedCurrencies: "Podržane valute",
    syncCatalog: "Sinhronizuj katalog",
    synced: "Sinhronizovano",
    tax: "Porez",
    taxCategories: "Poreske kategorije",
    title: "Naslov",
    updated: "Ažurirano",
    unknown: "Nepoznato",
    rowsCount: "{count} redova",
    skuSynced: "{count} kataloški SKU sinhronizovan.",
  },
  "sr-Cyrl": {
    actions: "Радње",
    active: "Активно",
    addCategory: "Додај категорију",
    addCourier: "Додај курира",
    addLicenseServer: "Додај лиценцни сервер",
    addMethod: "Додај метод",
    allStatuses: "Сви статуси",
    allVisibility: "Сва видљивост",
    apiUrl: "API URL",
    archive: "Архивирај",
    archiveLicenseServer: "Архивирај лиценцни сервер",
    archived: "Архивирано",
    auth: "Аутентикација",
    bankTransfer: "Банковни пренос",
    businessBilling: "Пословно фактурисање",
    cancel: "Откажи",
    cashOnDelivery: "Плаћање поузећем",
    catalog: "Каталог",
    checkout: "Наплата",
    checkoutLabel: "Лабела наплате",
    configured: "подешено",
    courierServices: "Курирске службе",
    defaultCurrency: "Подразумевана валута",
    defaultShippingFee: "Подразумевана достава",
    description: "Опис",
    disabled: "Искључено",
    editable: "Може да се уређује",
    failed: "Неуспешно",
    fieldProfile: "Профил поља",
    freeShippingThreshold: "Праг бесплатне доставе",
    hiddenPolicy: "Сакривено из менија политике производа",
    inactive: "Неактивно",
    instructions: "Упутства",
    licenseServerArchived: "Лиценцни сервер је архивиран.",
    licenseServerCreated: "Лиценцни сервер је креиран.",
    licenseServerSaved: "Лиценцни сервер је сачуван.",
    licenseServers: "Лиценцни сервери",
    missing: "недостаје",
    mode: "Режим",
    monriSetup: "Monri подешавање",
    needsSetup: "Потребно подешавање",
    noCatalogSnapshot: "Нема снимка каталога",
    noLicenseServers: "Нема пронађених license serverа.",
    noSecret: "Нема тајне",
    notSynced: "Није синхронизовано",
    notifications: "Обавештења",
    open: "Отворено",
    optional: "Опционо",
    orders: "Поруџбине",
    pageOfPageCount: "Страна {page} од {pageCount}",
    paused: "Паузирано",
    payments: "Плаћања",
    ready: "Спремно",
    readOnly: "Само за читање",
    required: "Обавезно",
    save: "Сачувај",
    saveChanges: "Сачувај измене",
    searchLicenseServers: "Претражи наслов, URL, client ID, fingerprint",
    secretSet: "Тајна подешена",
    settingsSummary: "Подразумеване commerce поставке продавнице.",
    shipping: "Достава",
    shippingMethods: "Методи доставе",
    shownPolicy: "Приказано у менију политике производа",
    showingRange: "Приказ {from}-{to} од {total}",
    status: "Статус",
    store: "Продавница",
    storeName: "Назив продавнице",
    storeNameDescription:
      "Назив који купац види током наплате и у комуникацији продавнице.",
    storeStatus: "Статус продавнице",
    supportedCurrencies: "Подржане валуте",
    syncCatalog: "Синхронизуј каталог",
    synced: "Синхронизовано",
    tax: "Порез",
    taxCategories: "Пореске категорије",
    title: "Наслов",
    updated: "Ажурирано",
    unknown: "Непознато",
    rowsCount: "{count} редова",
    skuSynced: "{count} каталошки SKU синхронизован.",
  },
  hr: {
    actions: "Radnje",
    active: "Aktivno",
    addCategory: "Dodaj kategoriju",
    addCourier: "Dodaj kurira",
    addLicenseServer: "Dodaj licencni poslužitelj",
    addMethod: "Dodaj metodu",
    allStatuses: "Svi statusi",
    allVisibility: "Sva vidljivost",
    apiUrl: "API URL",
    archive: "Arhiviraj",
    archiveLicenseServer: "Arhiviraj licencni poslužitelj",
    archived: "Arhivirano",
    auth: "Autentikacija",
    bankTransfer: "Bankovni prijenos",
    businessBilling: "Poslovno fakturiranje",
    cancel: "Odustani",
    cashOnDelivery: "Plaćanje pouzećem",
    catalog: "Katalog",
    checkout: "Checkout",
    checkoutLabel: "Checkout oznaka",
    configured: "podešeno",
    courierServices: "Kurirske službe",
    defaultCurrency: "Zadana valuta",
    defaultShippingFee: "Zadana dostava",
    description: "Opis",
    disabled: "Isključeno",
    editable: "Može se uređivati",
    failed: "Neuspjelo",
    fieldProfile: "Profil polja",
    freeShippingThreshold: "Prag besplatne dostave",
    hiddenPolicy: "Skriveno iz izbornika pravila proizvoda",
    inactive: "Neaktivno",
    instructions: "Upute",
    licenseServerArchived: "Licencni poslužitelj je arhiviran.",
    licenseServerCreated: "Licencni poslužitelj je izrađen.",
    licenseServerSaved: "Licencni poslužitelj je spremljen.",
    licenseServers: "Licencni poslužitelji",
    missing: "nedostaje",
    mode: "Način",
    monriSetup: "Monri postavljanje",
    needsSetup: "Potrebno postavljanje",
    noCatalogSnapshot: "Nema snimke kataloga",
    noLicenseServers: "Nema pronađenih licencnih poslužitelja.",
    noSecret: "Nema tajne",
    notSynced: "Nije sinkronizirano",
    notifications: "Obavijesti",
    open: "Otvoreno",
    optional: "Neobavezno",
    orders: "Narudžbe",
    pageOfPageCount: "Stranica {page} od {pageCount}",
    paused: "Pauzirano",
    payments: "Plaćanja",
    ready: "Spremno",
    readOnly: "Samo za čitanje",
    required: "Obavezno",
    save: "Spremi",
    saveChanges: "Spremi izmjene",
    searchLicenseServers: "Pretraži naslov, URL, client ID, fingerprint",
    secretSet: "Tajna postavljena",
    settingsSummary: "Zadane commerce postavke trgovine.",
    shipping: "Dostava",
    shippingMethods: "Metode dostave",
    shownPolicy: "Prikazano u izborniku pravila proizvoda",
    showingRange: "Prikaz {from}-{to} od {total}",
    status: "Status",
    store: "Trgovina",
    storeName: "Naziv trgovine",
    storeNameDescription:
      "Naziv koji kupac vidi u checkoutu i komunikaciji trgovine.",
    storeStatus: "Status trgovine",
    supportedCurrencies: "Podržane valute",
    syncCatalog: "Sinkroniziraj katalog",
    synced: "Sinkronizirano",
    tax: "Porez",
    taxCategories: "Porezne kategorije",
    title: "Naslov",
    updated: "Ažurirano",
    unknown: "Nepoznato",
    rowsCount: "{count} redaka",
    skuSynced: "{count} kataloški SKU sinkroniziran.",
  },
} satisfies Partial<Record<LocalizedLanguage, Record<CommonKey, string>>>;

const FALLBACK_TERMS = {
  de: {
    actions: "Aktionen",
    active: "Aktiv",
    addCategory: "Kategorie hinzufügen",
    addCourier: "Kurier hinzufügen",
    addLicenseServer: "Lizenzserver hinzufügen",
    addMethod: "Methode hinzufügen",
    allStatuses: "Alle Status",
    allVisibility: "Alle Sichtbarkeit",
    archive: "Archivieren",
    archived: "Archiviert",
    auth: "Auth",
    bankTransfer: "Banküberweisung",
    businessBilling: "Geschäftsabrechnung",
    cancel: "Abbrechen",
    catalog: "Katalog",
    checkout: "Checkout",
    configured: "konfiguriert",
    description: "Beschreibung",
    disabled: "Deaktiviert",
    failed: "Fehlgeschlagen",
    inactive: "Inaktiv",
    instructions: "Anweisungen",
    licenseServers: "Lizenzserver",
    missing: "fehlt",
    mode: "Modus",
    notifications: "Benachrichtigungen",
    optional: "Optional",
    orders: "Bestellungen",
    payments: "Zahlungen",
    ready: "Bereit",
    required: "Erforderlich",
    save: "Speichern",
    saveChanges: "Änderungen speichern",
    shipping: "Versand",
    status: "Status",
    store: "Shop",
    tax: "Steuer",
    title: "Titel",
    unknown: "Unbekannt",
  },
  fr: {
    actions: "Actions",
    active: "Actif",
    addCategory: "Ajouter une catégorie",
    addCourier: "Ajouter un transporteur",
    addLicenseServer: "Ajouter un serveur de licences",
    addMethod: "Ajouter une méthode",
    allStatuses: "Tous les statuts",
    allVisibility: "Toute visibilité",
    archive: "Archiver",
    archived: "Archivé",
    auth: "Auth",
    bankTransfer: "Virement bancaire",
    businessBilling: "Facturation professionnelle",
    cancel: "Annuler",
    catalog: "Catalogue",
    checkout: "Checkout",
    configured: "configuré",
    description: "Description",
    disabled: "Désactivé",
    failed: "Échec",
    inactive: "Inactif",
    instructions: "Instructions",
    licenseServers: "Serveurs de licences",
    missing: "manquant",
    mode: "Mode",
    notifications: "Notifications",
    optional: "Facultatif",
    orders: "Commandes",
    payments: "Paiements",
    ready: "Prêt",
    required: "Obligatoire",
    save: "Enregistrer",
    saveChanges: "Enregistrer les modifications",
    shipping: "Livraison",
    status: "Statut",
    store: "Boutique",
    tax: "Taxe",
    title: "Titre",
    unknown: "Inconnu",
  },
} satisfies Partial<
  Record<LocalizedLanguage, Partial<Record<CommonKey, string>>>
>;

const GENERIC_BASE = {
  actions: "Actions",
  active: "Active",
  addCategory: "Add category",
  addCourier: "Add courier",
  addLicenseServer: "Add license server",
  addMethod: "Add method",
  allStatuses: "All statuses",
  allVisibility: "All visibility",
  apiUrl: "API URL",
  archive: "Archive",
  archiveLicenseServer: "Archive license server",
  archived: "Archived",
  auth: "Auth",
  bankTransfer: "Bank transfer",
  businessBilling: "Business billing",
  cancel: "Cancel",
  cashOnDelivery: "Cash on delivery",
  catalog: "Catalog",
  checkout: "Naplata",
  checkoutLabel: "Oznaka naplate",
  configured: "configured",
  courierServices: "Courier services",
  defaultCurrency: "Default currency",
  defaultShippingFee: "Default shipping fee",
  description: "Description",
  disabled: "Disabled",
  editable: "Editable",
  failed: "Failed",
  fieldProfile: "Field profile",
  freeShippingThreshold: "Free shipping threshold",
  hiddenPolicy: "Hidden from product policy menu",
  inactive: "Inactive",
  instructions: "Instructions",
  licenseServerArchived: "License server archived.",
  licenseServerCreated: "License server created.",
  licenseServerSaved: "License server saved.",
  licenseServers: "License servers",
  missing: "missing",
  mode: "Mode",
  monriSetup: "Monri setup",
  needsSetup: "Needs setup",
  noCatalogSnapshot: "No catalog snapshot",
  noLicenseServers: "No license servers found.",
  noSecret: "No secret",
  notSynced: "Not synced",
  notifications: "Notifications",
  open: "Open",
  optional: "Optional",
  orders: "Orders",
  pageOfPageCount: "Page {page} of {pageCount}",
  paused: "Paused",
  payments: "Payments",
  ready: "Ready",
  readOnly: "Read-only",
  required: "Required",
  save: "Save",
  saveChanges: "Save changes",
  searchLicenseServers: "Search title, URL, client ID, fingerprint",
  secretSet: "Secret set",
  settingsSummary: "Store-wide commerce defaults.",
  shipping: "Shipping",
  shippingMethods: "Shipping methods",
  shownPolicy: "Shown in product policy menu",
  showingRange: "Showing {from}-{to} of {total}",
  status: "Status",
  store: "Store",
  storeName: "Store name",
  storeNameDescription:
    "Customer-facing name used in checkout and store communication.",
  storeStatus: "Store status",
  supportedCurrencies: "Supported currencies",
  syncCatalog: "Sync catalog",
  synced: "Synced",
  tax: "Tax",
  taxCategories: "Tax categories",
  title: "Title",
  updated: "Updated",
  unknown: "Unknown",
  rowsCount: "{count} rows",
  skuSynced: "{count} catalog SKU synced.",
} satisfies Record<CommonKey, string>;

const COMMON_TRANSLATION_MAP: Partial<
  Record<LocalizedLanguage, Record<CommonKey, string>>
> = COMMON_TRANSLATIONS;

const FALLBACK_TERM_MAP: Partial<
  Record<LocalizedLanguage, Partial<Record<CommonKey, string>>>
> = FALLBACK_TERMS;

const ALL_LOCALIZED_LANGUAGES = [
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

const EXPLICIT_TOOLTIP_ROWS = {
  "sr-Latn":
    "Naziv prodavnice|Naziv koji kupac vidi tokom naplate i u komunikaciji prodavnice.|Naplata omogućena|Uključuje ili isključuje tok naplate za kupce.|Naplata za goste|Omogućava kupcima da poruče bez prethodne prijave.|Telefon obavezan|Zahteva broj telefona tokom naplate radi dostave ili podrške.",
  "sr-Cyrl":
    "Назив продавнице|Назив који купац види током наплате и у комуникацији продавнице.|Наплата омогућена|Укључује или искључује ток наплате за купце.|Наплата за госте|Омогућава купцима да поруче без претходне пријаве.|Телефон обавезан|Захтева број телефона током наплате ради доставе или подршке.",
  hr: "Naziv trgovine|Naziv koji kupac vidi tijekom naplate i u komunikaciji trgovine.|Naplata uključena|Uključuje ili isključuje tijek naplate za kupce.|Naplata za goste|Omogućuje kupcima naručivanje bez prethodne prijave.|Telefon obavezan|Zahtijeva broj telefona tijekom naplate radi dostave ili podrške.",
  de: "Shopname|Kunden sichtbarer Name in Checkout und Shop-Kommunikation.|Checkout aktiviert|Schaltet den Checkout-Ablauf für Kunden ein oder aus.|Gast-Checkout|Ermöglicht Kunden, Bestellungen ohne vorherige Anmeldung aufzugeben.|Telefon erforderlich|Erfordert während des Checkouts eine Telefonnummer für Lieferung oder Support.",
  fr: "Nom de la boutique|Nom visible par le client dans le checkout et les communications de la boutique.|Checkout activé|Active ou désactive le parcours de checkout pour les clients.|Checkout invité|Permet aux clients de passer commande sans se connecter d'abord.|Téléphone obligatoire|Demande un numéro de téléphone pendant le checkout pour la livraison ou le suivi support.",
  es: "Nombre de la tienda|Nombre visible para el cliente en el checkout y la comunicación de la tienda.|Checkout activado|Activa o desactiva el flujo de checkout para los clientes.|Checkout como invitado|Permite a los clientes hacer pedidos sin iniciar sesión primero.|Teléfono obligatorio|Requiere un número de teléfono durante el checkout para entrega o soporte.",
  it: "Nome del negozio|Nome visibile al cliente nel checkout e nelle comunicazioni del negozio.|Checkout abilitato|Attiva o disattiva il flusso di checkout per i clienti.|Checkout ospite|Consente ai clienti di effettuare ordini senza accedere prima.|Telefono obbligatorio|Richiede un numero di telefono durante il checkout per consegna o supporto.",
  pt: "Nome da loja|Nome visível ao cliente no checkout e na comunicação da loja.|Checkout ativado|Ativa ou desativa o fluxo de checkout para os clientes.|Checkout como convidado|Permite aos clientes fazer encomendas sem iniciar sessão primeiro.|Telefone obrigatório|Requer um número de telefone durante o checkout para entrega ou apoio.",
  "pt-BR":
    "Nome da loja|Nome visível ao cliente no checkout e na comunicação da loja.|Checkout ativado|Ativa ou desativa o fluxo de checkout para os clientes.|Checkout como convidado|Permite que clientes façam pedidos sem entrar primeiro.|Telefone obrigatório|Exige um número de telefone durante o checkout para entrega ou suporte.",
  nl: "Winkelnaam|Naam die klanten zien in checkout en winkelcommunicatie.|Checkout ingeschakeld|Zet de checkoutstroom voor klanten aan of uit.|Checkout als gast|Laat klanten bestellingen plaatsen zonder eerst in te loggen.|Telefoon verplicht|Vereist een telefoonnummer tijdens checkout voor levering of support.",
  pl: "Nazwa sklepu|Nazwa widoczna dla klienta w checkoutcie i komunikacji sklepu.|Checkout włączony|Włącza lub wyłącza proces checkoutu dla klientów.|Checkout gościa|Pozwala klientom składać zamówienia bez wcześniejszego logowania.|Telefon wymagany|Wymaga numeru telefonu podczas checkoutu na potrzeby dostawy lub wsparcia.",
  tr: "Mağaza adı|Checkout ve mağaza iletişiminde müşteriye görünen ad.|Checkout etkin|Müşteriler için checkout akışını açar veya kapatır.|Misafir checkout|Müşterilerin önce giriş yapmadan sipariş vermesini sağlar.|Telefon zorunlu|Teslimat veya destek takibi için checkout sırasında telefon numarası ister.",
  mk: "Име на продавница|Име што купувачот го гледа при наплата и во комуникацијата на продавницата.|Наплатата е вклучена|Го вклучува или исклучува текот на наплата за купувачите.|Наплата како гостин|Им овозможува на купувачите да нарачуваат без претходна најава.|Телефон е задолжителен|Бара телефонски број при наплата за достава или поддршка.",
  bs: "Naziv prodavnice|Naziv koji kupac vidi tokom naplate i u komunikaciji prodavnice.|Naplata uključena|Uključuje ili isključuje tok naplate za kupce.|Naplata za goste|Omogućava kupcima da naruče bez prethodne prijave.|Telefon obavezan|Zahtijeva broj telefona tokom naplate radi dostave ili podrške.",
  sl: "Ime trgovine|Ime, ki ga stranka vidi pri zaključku nakupa in v komunikaciji trgovine.|Zaključek nakupa omogočen|Vklopi ali izklopi potek zaključka nakupa za stranke.|Zaključek nakupa kot gost|Strankam omogoča naročanje brez predhodne prijave.|Telefon obvezen|Zahteva telefonsko številko pri zaključku nakupa za dostavo ali podporo.",
  ru: "Название магазина|Название, которое клиент видит при оформлении заказа и в коммуникации магазина.|Оформление заказа включено|Включает или отключает процесс оформления заказа для клиентов.|Оформление без входа|Позволяет клиентам оформлять заказы без предварительного входа.|Телефон обязателен|Требует номер телефона при оформлении заказа для доставки или поддержки.",
  hu: "Áruház neve|Az ügyfél által a checkoutban és az áruházi kommunikációban látott név.|Checkout engedélyezve|Be- vagy kikapcsolja a checkout folyamatot az ügyfeleknek.|Vendég checkout|Lehetővé teszi, hogy az ügyfelek bejelentkezés nélkül rendeljenek.|Telefon kötelező|Telefonszámot kér a checkout során szállításhoz vagy támogatáshoz.",
  bg: "Име на магазина|Име, което клиентът вижда при checkout и в комуникацията на магазина.|Checkout е включен|Включва или изключва checkout потока за клиентите.|Checkout като гост|Позволява на клиентите да поръчват без предварително влизане.|Телефонът е задължителен|Изисква телефонен номер при checkout за доставка или поддръжка.",
  ja: "ストア名|チェックアウトとストアからの連絡で顧客に表示される名前。|チェックアウト有効|顧客向けのチェックアウトフローをオンまたはオフにします。|ゲストチェックアウト|顧客が先にサインインせずに注文できるようにします。|電話番号必須|配送またはサポート対応のため、チェックアウト時に電話番号を必須にします。",
  "zh-Hans":
    "商店名称|客户在结账和商店沟通中看到的名称。|已启用结账|为客户开启或关闭结账流程。|访客结账|允许客户无需先登录即可下单。|电话必填|结账时需要电话号码，用于配送或支持跟进。",
  "zh-Hant":
    "商店名稱|客戶在結帳和商店溝通中看到的名稱。|已啟用結帳|為客戶開啟或關閉結帳流程。|訪客結帳|允許客戶無需先登入即可下單。|電話必填|結帳時需要電話號碼，用於配送或支援跟進。",
  ar: "اسم المتجر|الاسم الذي يراه العميل في checkout واتصالات المتجر.|checkout مفعّل|يشغّل أو يوقف مسار checkout للعملاء.|checkout كضيف|يسمح للعملاء بتقديم الطلبات دون تسجيل الدخول أولاً.|الهاتف مطلوب|يتطلب رقم هاتف أثناء checkout للتسليم أو المتابعة مع الدعم.",
  id: "Nama toko|Nama yang dilihat pelanggan saat checkout dan dalam komunikasi toko.|Checkout aktif|Mengaktifkan atau menonaktifkan alur checkout untuk pelanggan.|Checkout tamu|Memungkinkan pelanggan membuat pesanan tanpa masuk terlebih dahulu.|Telepon wajib|Memerlukan nomor telepon saat checkout untuk pengiriman atau tindak lanjut dukungan.",
  cs: "Název obchodu|Název, který zákazník vidí v checkoutu a komunikaci obchodu.|Checkout povolen|Zapíná nebo vypíná checkout tok pro zákazníky.|Checkout jako host|Umožňuje zákazníkům objednávat bez předchozího přihlášení.|Telefon povinný|Vyžaduje telefonní číslo během checkoutu kvůli doručení nebo podpoře.",
  ro: "Numele magazinului|Numele vizibil clientului în checkout și în comunicarea magazinului.|Checkout activat|Activează sau dezactivează fluxul de checkout pentru clienți.|Checkout ca invitat|Permite clienților să plaseze comenzi fără autentificare prealabilă.|Telefon obligatoriu|Solicită un număr de telefon în timpul checkoutului pentru livrare sau suport.",
  el: "Όνομα καταστήματος|Το όνομα που βλέπει ο πελάτης στο checkout και στην επικοινωνία του καταστήματος.|Checkout ενεργό|Ενεργοποιεί ή απενεργοποιεί τη ροή checkout για τους πελάτες.|Checkout επισκέπτη|Επιτρέπει στους πελάτες να κάνουν παραγγελίες χωρίς προηγούμενη σύνδεση.|Απαιτείται τηλέφωνο|Απαιτεί αριθμό τηλεφώνου στο checkout για παράδοση ή υποστήριξη.",
  da: "Butiksnavn|Navnet kunden ser i checkout og butikskommunikation.|Checkout aktiveret|Slår checkoutforløbet til eller fra for kunder.|Gæstecheckout|Giver kunder mulighed for at afgive ordrer uden først at logge ind.|Telefon påkrævet|Kræver et telefonnummer under checkout til levering eller supportopfølgning.",
  sv: "Butiksnamn|Namnet kunden ser i checkout och butikskommunikation.|Checkout aktiverad|Slår på eller av checkoutflödet för kunder.|Gästcheckout|Låter kunder lägga beställningar utan att logga in först.|Telefon krävs|Kräver ett telefonnummer under checkout för leverans eller supportuppföljning.",
  nb: "Butikknavn|Navnet kunden ser i checkout og butikkommunikasjon.|Checkout aktivert|Slår checkoutflyten av eller på for kunder.|Gjest-checkout|Lar kunder legge inn bestillinger uten å logge inn først.|Telefon påkrevd|Krever telefonnummer under checkout for levering eller supportoppfølging.",
  nn: "Butikknamn|Namnet kunden ser i checkout og butikkommunikasjon.|Checkout aktivert|Slår checkout-flyten av eller på for kundar.|Gjest-checkout|Lèt kundar leggja inn bestillingar utan å logga inn fyrst.|Telefon påkravd|Krev telefonnummer under checkout for levering eller supportoppfølging.",
  fi: "Kaupan nimi|Nimi, jonka asiakas näkee checkoutissa ja kaupan viestinnässä.|Checkout käytössä|Ottaa checkout-polun käyttöön tai pois käytöstä asiakkaille.|Vierailijan checkout|Sallii asiakkaiden tehdä tilauksia kirjautumatta ensin sisään.|Puhelin vaaditaan|Edellyttää puhelinnumeroa checkoutissa toimitusta tai tukea varten.",
  is: "Nafn verslunar|Nafnið sem viðskiptavinur sér í checkout og samskiptum verslunar.|Checkout virkt|Kveikir eða slekkur á checkout-ferlinu fyrir viðskiptavini.|Checkout sem gestur|Leyfir viðskiptavinum að leggja inn pantanir án þess að skrá sig fyrst inn.|Sími krafist|Krefst símanúmers í checkout fyrir afhendingu eða þjónustueftirfylgni.",
} satisfies Record<LocalizedLanguage, string>;

function createExplicitTooltipMap(
  language: LocalizedLanguage,
): Record<(typeof EXPLICIT_TOOLTIP_SOURCE_STRINGS)[number], string> {
  const values = EXPLICIT_TOOLTIP_ROWS[language].split("|");
  if (values.length !== EXPLICIT_TOOLTIP_SOURCE_STRINGS.length) {
    throw new Error(
      `Invalid webshop settings tooltip translation row for ${language}.`,
    );
  }

  return Object.fromEntries(
    EXPLICIT_TOOLTIP_SOURCE_STRINGS.map((source, index) => [
      source,
      values[index] ?? source,
    ]),
  ) as Record<(typeof EXPLICIT_TOOLTIP_SOURCE_STRINGS)[number], string>;
}

const SERBIAN_CYRILLIC_PRESERVE =
  /\b(?:API|URL|ID|PDF|SKU|VAT|PIB|IPS|QR|IBAN|EMAIL_FROM|B2B|MB|HTTP|POST|GET|JSON|SHA|Client|Night|Raven|License|Server|Payment|Redirect|redirect|Form|form|WebPay|Billing|Monri|Paddle|PayPal|Stripe|Webhook|webhook(?:ovi|ovima|s)?|browser(?:u)?|callback(?:a|ovi|ovima)?|callbacks?|checkout|price|env|live|merchant|onboarding|Support(?:a)?|support|TID|MID|Secure|PSP|Authorization|header|endpoint(?:e)?|provider|Success|digest|return|capture|captures|void|voids|refund|refunds|declined|cancelled|approved(?:-transaction)?|tokenization|chargeback(?:ovima|s)?|acquiring|Visa|Mastercard|Maestro|Go-live)\b/g;

const SERBIAN_LATIN_TO_CYRILLIC: Record<string, string> = {
  a: "а",
  b: "б",
  c: "ц",
  č: "ч",
  ć: "ћ",
  d: "д",
  đ: "ђ",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "ј",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  r: "р",
  s: "с",
  š: "ш",
  t: "т",
  u: "у",
  v: "в",
  z: "з",
  ž: "ж",
};

function serbianLatinToCyrillic(value: string): string {
  const preserved: string[] = [];
  const masked = value.replace(SERBIAN_CYRILLIC_PRESERVE, (match) => {
    preserved.push(match);
    return `\u0000${preserved.length - 1}\u0000`;
  });

  const converted = masked
    .replace(/dž/g, "џ")
    .replace(/Dž/g, "Џ")
    .replace(/DŽ/g, "Џ")
    .replace(/lj/g, "љ")
    .replace(/Lj/g, "Љ")
    .replace(/LJ/g, "Љ")
    .replace(/nj/g, "њ")
    .replace(/Nj/g, "Њ")
    .replace(/NJ/g, "Њ")
    .replace(/[A-Za-zČĆĐŠŽčćđšž]/g, (char) => {
      const lower = char.toLowerCase();
      const mapped = SERBIAN_LATIN_TO_CYRILLIC[lower] ?? char;
      return char === lower ? mapped : mapped.toUpperCase();
    });

  return converted.replace(/\u0000(\d+)\u0000/g, (_, index: string) => {
    return preserved[Number(index)] ?? "";
  });
}

function createSerbianTooltipMap(language: LocalizedLanguage) {
  if (language === "sr-Latn") return SERBIAN_TOOLTIP_TRANSLATIONS;
  if (language !== "sr-Cyrl") return {};

  return Object.fromEntries(
    Object.entries(SERBIAN_TOOLTIP_TRANSLATIONS).map(
      ([source, translation]) => [source, serbianLatinToCyrillic(translation)],
    ),
  );
}

function createCourierCopyMap(
  language: LocalizedLanguage,
): Record<(typeof COURIER_COPY_SOURCE_STRINGS)[number], string> {
  const values = COURIER_COPY_TRANSLATIONS[language];

  return Object.fromEntries(
    COURIER_COPY_SOURCE_STRINGS.map((source, index) => [
      source,
      values[index] ?? source,
    ]),
  ) as Record<(typeof COURIER_COPY_SOURCE_STRINGS)[number], string>;
}

function createPaymentAndLicenseMap(
  language: LocalizedLanguage,
): Record<(typeof PAYMENT_AND_LICENSE_SOURCE_STRINGS)[number], string> {
  const values =
    language === "sr-Cyrl"
      ? PAYMENT_AND_LICENSE_ROWS["sr-Latn"]
          .split("|")
          .map((value) => serbianLatinToCyrillic(value))
      : PAYMENT_AND_LICENSE_ROWS[
          language as PaymentAndLicenseRowLanguage
        ].split("|");

  if (values.length !== PAYMENT_AND_LICENSE_SOURCE_STRINGS.length) {
    throw new Error(
      `Invalid webshop settings payment/license translation row for ${language}.`,
    );
  }

  return Object.fromEntries(
    PAYMENT_AND_LICENSE_SOURCE_STRINGS.map((source, index) => [
      source,
      values[index] ?? source,
    ]),
  ) as Record<(typeof PAYMENT_AND_LICENSE_SOURCE_STRINGS)[number], string>;
}

function createPaymentConfigMap(
  language: LocalizedLanguage,
): Record<(typeof PAYMENT_CONFIG_SOURCE_STRINGS)[number], string> {
  const values =
    language === "sr-Cyrl"
      ? PAYMENT_CONFIG_ROWS["sr-Latn"]
          .split("|")
          .map((value) => serbianLatinToCyrillic(value))
      : PAYMENT_CONFIG_ROWS[language as PaymentAndLicenseRowLanguage].split(
          "|",
        );

  if (values.length !== PAYMENT_CONFIG_SOURCE_STRINGS.length) {
    throw new Error(
      `Invalid webshop settings payment config translation row for ${language}.`,
    );
  }

  return Object.fromEntries(
    PAYMENT_CONFIG_SOURCE_STRINGS.map((source, index) => [
      source,
      values[index] ?? source,
    ]),
  ) as Record<(typeof PAYMENT_CONFIG_SOURCE_STRINGS)[number], string>;
}

function createMonriChecklistMap(
  language: LocalizedLanguage,
): Record<(typeof MONRI_CHECKLIST_SOURCE_STRINGS)[number], string> {
  const values =
    language === "sr-Cyrl"
      ? MONRI_CHECKLIST_ROWS["sr-Latn"]
          .split("|")
          .map((value) => serbianLatinToCyrillic(value))
      : MONRI_CHECKLIST_ROWS[language as PaymentAndLicenseRowLanguage].split(
          "|",
        );

  if (values.length !== MONRI_CHECKLIST_SOURCE_STRINGS.length) {
    throw new Error(
      `Invalid webshop settings Monri checklist translation row for ${language}.`,
    );
  }

  return Object.fromEntries(
    MONRI_CHECKLIST_SOURCE_STRINGS.map((source, index) => [
      source,
      values[index] ?? source,
    ]),
  ) as Record<(typeof MONRI_CHECKLIST_SOURCE_STRINGS)[number], string>;
}

function createMap(
  language: LocalizedLanguage,
): Record<WebshopSettingsSource, string> {
  const terms =
    COMMON_TRANSLATION_MAP[language] ??
    ({
      ...GENERIC_BASE,
      ...FALLBACK_TERM_MAP[language],
    } as Record<CommonKey, string>);

  const commonMap = Object.fromEntries(
    Object.entries(COMMON_SOURCES).map(([key, source]) => [
      source,
      terms[key as CommonKey] ?? source,
    ]),
  ) as Record<WebshopSettingsSource, string>;

  return {
    ...commonMap,
    ...createExplicitTooltipMap(language),
    ...createSerbianTooltipMap(language),
    ...createCourierCopyMap(language),
    ...createPaymentAndLicenseMap(language),
    ...createPaymentConfigMap(language),
    ...createMonriChecklistMap(language),
  };
}

export const WEBSHOP_SETTINGS_SOURCE_TRANSLATIONS = Object.fromEntries(
  ALL_LOCALIZED_LANGUAGES.map((language) => [language, createMap(language)]),
) as Record<LocalizedLanguage, Record<WebshopSettingsSource, string>>;
