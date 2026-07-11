import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export const ADDON_SHELL_SOURCE_STRINGS = [
  "Add-on required",
  "Available after add-on activation.",
  "Activating...",
  "Disabled",
  "Install disabled",
  "Install pending",
  "Install unavailable",
  "License invalid",
  "License key",
  "License key is required.",
  "License required",
  "License needs attention",
  "Invalid activation input.",
  "Supported install targets: {providers}.",
  "Webshop",
  "Paid commerce add-on foundation and CMS shell.",
  "Activate Webshop",
  "Webshop activation",
  "Activation binds the license to this CMS installation. Package install tokens are short-lived and are not stored by the CMS.",
  "License accepted. Webshop add-on is ready.",
  "License accepted. Install the private Webshop package, set WEBSHOP_ADDON_MODULE, and restart the CMS to finish setup.",
  "License accepted. Webshop add-on install is pending the deployment pipeline.",
  "Back to Webshop",
  "Buy webshop license key",
  "Webshop cannot be installed",
  "Waiting for add-on install",
  "The license was accepted. Install the private Webshop package, set WEBSHOP_ADDON_MODULE, and rebuild or restart the CMS to finish setup.",
  "Webshop install flow is locked",
  "Buy or enter a valid Webshop license key to activate this paid add-on for this CMS deployment.",
  "Webshop add-on is not installed",
  "The public CMS shell is ready. Activate the license, install the private Webshop add-on package, and configure WEBSHOP_ADDON_MODULE before commerce features are available.",
  "Webshop is disabled",
  "Edit shell",
  "View storefront",
  "Set up Webshop",
  "No Webshop shell yet",
  "Create the CMS entry that owns the shop slug, SEO, status, visibility, and routing.",
  "Create CMS shell",
  "Public Preview",
  "Uses the CMS shell renderer.",
  "Webshop categories",
  "Read-only bridge",
  "Webshop category management is available through the paid add-on. This CMS section keeps the navigation entry stable while the add-on controls commerce data.",
  "Webshop dashboard",
  "Edit existing only",
  "Bridge unavailable",
  "The add-on category bridge is not available right now. Open the Webshop management area to review the current add-on state.",
  "Open management",
  "Title",
  "Slug",
  "Status",
  "Category",
  "Products",
  "Categories",
  "Orders",
  "Payments",
  "Storefront",
  "Coupons",
  "Settings",
  "License Server",
  "Paid digital licensing add-on for products your clients sell.",
  "Activate License Server",
  "License Server activation",
  "Activation binds this paid License Server add-on to the CMS installation. Your master license server remains the activation authority.",
  "License accepted. License Server add-on is ready.",
  "License accepted. Install the private License Server package, set LICENSE_SERVER_ADDON_MODULE, and restart the CMS to finish setup.",
  "License accepted. License Server add-on install is pending the deployment pipeline.",
  "Back to License Server",
  "Buy License Server license key",
  "License Server cannot be installed",
  "The license was accepted. Install the private License Server package, set LICENSE_SERVER_ADDON_MODULE, and rebuild or restart the CMS to finish setup.",
  "License Server install flow is locked",
  "Buy or enter a valid License Server license key to activate this paid add-on for this CMS deployment.",
  "License Server add-on is not installed",
  "Activate the license, install the private License Server add-on package, and configure LICENSE_SERVER_ADDON_MODULE before licensing APIs are available.",
  "License Server is disabled",
  "API Clients",
  "Product Types",
  "SKUs",
  "Licenses",
  "Validation Events",
] as const;

type AddonShellSourceString = (typeof ADDON_SHELL_SOURCE_STRINGS)[number];
type AddonShellSourceMap = Record<AddonShellSourceString, string>;

type ProductTemplateSet = {
  activate: string;
  activation: string;
  ready: string;
  selfHostedSuccess: string;
  pendingSuccess: string;
  backTo: string;
  buyKey: string;
  cannotInstall: string;
  pendingInstallDescription: string;
  installLocked: string;
  licenseRequiredDescription: string;
  notInstalledTitle: string;
  disabledTitle: string;
};

type AddonShellTerms = {
  common: {
    addOnRequired: string;
    availableAfterActivation: string;
    activating: string;
    disabled: string;
    installDisabled: string;
    installPending: string;
    installUnavailable: string;
    licenseInvalid: string;
    licenseKey: string;
    licenseKeyRequired: string;
    licenseRequired: string;
    licenseNeedsAttention: string;
    invalidActivationInput: string;
    supportedInstallTargets: string;
  };
  product: ProductTemplateSet;
  webshop: {
    name: string;
    description: string;
    activationDescription: string;
    notInstalledDescription: string;
    editShell: string;
    viewStorefront: string;
    setUp: string;
    noShellTitle: string;
    shellEntryDescription: string;
    createCmsShell: string;
    publicPreview: string;
    usesShellRenderer: string;
    categories: string;
    dashboard: string;
    categoryBridge: {
      readOnlyBadge: string;
      description: string;
      editExistingOnlyBadge: string;
      unavailableBadge: string;
      unavailableDescription: string;
      openManagement: string;
    };
  };
  licenseServer: {
    name: string;
    description: string;
    activationDescription: string;
    notInstalledDescription: string;
  };
  labels: {
    waitingForInstall: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    products: string;
    categories: string;
    orders: string;
    payments: string;
    storefront: string;
    coupons: string;
    settings: string;
    apiClients: string;
    productTypes: string;
    skus: string;
    licenses: string;
    validationEvents: string;
  };
};

function formatTemplate(
  template: string,
  values: Record<"env" | "product", string>,
) {
  return template
    .replace(/\{product\}/g, values.product)
    .replace(/\{env\}/g, values.env);
}

function product(
  template: keyof ProductTemplateSet,
  terms: AddonShellTerms,
  productName: string,
  env: string,
) {
  return formatTemplate(terms.product[template], {
    env,
    product: productName,
  });
}

function buildAddonShellTranslations(
  terms: AddonShellTerms,
): AddonShellSourceMap {
  const webshop = terms.webshop.name;
  const licenseServer = terms.licenseServer.name;

  return {
    "Add-on required": terms.common.addOnRequired,
    "Available after add-on activation.": terms.common.availableAfterActivation,
    "Activating...": terms.common.activating,
    Disabled: terms.common.disabled,
    "Install disabled": terms.common.installDisabled,
    "Install pending": terms.common.installPending,
    "Install unavailable": terms.common.installUnavailable,
    "License invalid": terms.common.licenseInvalid,
    "License key": terms.common.licenseKey,
    "License key is required.": terms.common.licenseKeyRequired,
    "License required": terms.common.licenseRequired,
    "License needs attention": terms.common.licenseNeedsAttention,
    "Invalid activation input.": terms.common.invalidActivationInput,
    "Supported install targets: {providers}.":
      terms.common.supportedInstallTargets,
    Webshop: webshop,
    "Paid commerce add-on foundation and CMS shell.": terms.webshop.description,
    "Activate Webshop": product(
      "activate",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Webshop activation": product(
      "activation",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Activation binds the license to this CMS installation. Package install tokens are short-lived and are not stored by the CMS.":
      terms.webshop.activationDescription,
    "License accepted. Webshop add-on is ready.": product(
      "ready",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "License accepted. Install the private Webshop package, set WEBSHOP_ADDON_MODULE, and restart the CMS to finish setup.":
      product("selfHostedSuccess", terms, webshop, "WEBSHOP_ADDON_MODULE"),
    "License accepted. Webshop add-on install is pending the deployment pipeline.":
      product("pendingSuccess", terms, webshop, "WEBSHOP_ADDON_MODULE"),
    "Back to Webshop": product(
      "backTo",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Buy webshop license key": product(
      "buyKey",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Webshop cannot be installed": product(
      "cannotInstall",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Waiting for add-on install": terms.labels.waitingForInstall,
    "The license was accepted. Install the private Webshop package, set WEBSHOP_ADDON_MODULE, and rebuild or restart the CMS to finish setup.":
      product(
        "pendingInstallDescription",
        terms,
        webshop,
        "WEBSHOP_ADDON_MODULE",
      ),
    "Webshop install flow is locked": product(
      "installLocked",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Buy or enter a valid Webshop license key to activate this paid add-on for this CMS deployment.":
      product(
        "licenseRequiredDescription",
        terms,
        webshop,
        "WEBSHOP_ADDON_MODULE",
      ),
    "Webshop add-on is not installed": product(
      "notInstalledTitle",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "The public CMS shell is ready. Activate the license, install the private Webshop add-on package, and configure WEBSHOP_ADDON_MODULE before commerce features are available.":
      terms.webshop.notInstalledDescription,
    "Webshop is disabled": product(
      "disabledTitle",
      terms,
      webshop,
      "WEBSHOP_ADDON_MODULE",
    ),
    "Edit shell": terms.webshop.editShell,
    "View storefront": terms.webshop.viewStorefront,
    "Set up Webshop": terms.webshop.setUp,
    "No Webshop shell yet": terms.webshop.noShellTitle,
    "Create the CMS entry that owns the shop slug, SEO, status, visibility, and routing.":
      terms.webshop.shellEntryDescription,
    "Create CMS shell": terms.webshop.createCmsShell,
    "Public Preview": terms.webshop.publicPreview,
    "Uses the CMS shell renderer.": terms.webshop.usesShellRenderer,
    "Webshop categories": terms.webshop.categories,
    "Read-only bridge": terms.webshop.categoryBridge.readOnlyBadge,
    "Webshop category management is available through the paid add-on. This CMS section keeps the navigation entry stable while the add-on controls commerce data.":
      terms.webshop.categoryBridge.description,
    "Webshop dashboard": terms.webshop.dashboard,
    "Edit existing only": terms.webshop.categoryBridge.editExistingOnlyBadge,
    "Bridge unavailable": terms.webshop.categoryBridge.unavailableBadge,
    "The add-on category bridge is not available right now. Open the Webshop management area to review the current add-on state.":
      terms.webshop.categoryBridge.unavailableDescription,
    "Open management": terms.webshop.categoryBridge.openManagement,
    Title: terms.labels.title,
    Slug: terms.labels.slug,
    Status: terms.labels.status,
    Category: terms.labels.category,
    Products: terms.labels.products,
    Categories: terms.labels.categories,
    Orders: terms.labels.orders,
    Payments: terms.labels.payments,
    Storefront: terms.labels.storefront,
    Coupons: terms.labels.coupons,
    Settings: terms.labels.settings,
    "License Server": licenseServer,
    "Paid digital licensing add-on for products your clients sell.":
      terms.licenseServer.description,
    "Activate License Server": product(
      "activate",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "License Server activation": product(
      "activation",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "Activation binds this paid License Server add-on to the CMS installation. Your master license server remains the activation authority.":
      terms.licenseServer.activationDescription,
    "License accepted. License Server add-on is ready.": product(
      "ready",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "License accepted. Install the private License Server package, set LICENSE_SERVER_ADDON_MODULE, and restart the CMS to finish setup.":
      product(
        "selfHostedSuccess",
        terms,
        licenseServer,
        "LICENSE_SERVER_ADDON_MODULE",
      ),
    "License accepted. License Server add-on install is pending the deployment pipeline.":
      product(
        "pendingSuccess",
        terms,
        licenseServer,
        "LICENSE_SERVER_ADDON_MODULE",
      ),
    "Back to License Server": product(
      "backTo",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "Buy License Server license key": product(
      "buyKey",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "License Server cannot be installed": product(
      "cannotInstall",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "The license was accepted. Install the private License Server package, set LICENSE_SERVER_ADDON_MODULE, and rebuild or restart the CMS to finish setup.":
      product(
        "pendingInstallDescription",
        terms,
        licenseServer,
        "LICENSE_SERVER_ADDON_MODULE",
      ),
    "License Server install flow is locked": product(
      "installLocked",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "Buy or enter a valid License Server license key to activate this paid add-on for this CMS deployment.":
      product(
        "licenseRequiredDescription",
        terms,
        licenseServer,
        "LICENSE_SERVER_ADDON_MODULE",
      ),
    "License Server add-on is not installed": product(
      "notInstalledTitle",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "Activate the license, install the private License Server add-on package, and configure LICENSE_SERVER_ADDON_MODULE before licensing APIs are available.":
      terms.licenseServer.notInstalledDescription,
    "License Server is disabled": product(
      "disabledTitle",
      terms,
      licenseServer,
      "LICENSE_SERVER_ADDON_MODULE",
    ),
    "API Clients": terms.labels.apiClients,
    "Product Types": terms.labels.productTypes,
    SKUs: terms.labels.skus,
    Licenses: terms.labels.licenses,
    "Validation Events": terms.labels.validationEvents,
  };
}

const baseTerms = {
  product: {
    activate: "Activate {product}",
    activation: "{product} activation",
    ready: "License accepted. {product} add-on is ready.",
    selfHostedSuccess:
      "License accepted. Install the private {product} package, set {env}, and restart the CMS to finish setup.",
    pendingSuccess:
      "License accepted. {product} add-on install is pending the deployment pipeline.",
    backTo: "Back to {product}",
    buyKey: "Buy {product} license key",
    cannotInstall: "{product} cannot be installed",
    pendingInstallDescription:
      "The license was accepted. Install the private {product} package, set {env}, and rebuild or restart the CMS to finish setup.",
    installLocked: "{product} install flow is locked",
    licenseRequiredDescription:
      "Buy or enter a valid {product} license key to activate this paid add-on for this CMS deployment.",
    notInstalledTitle: "{product} add-on is not installed",
    disabledTitle: "{product} is disabled",
  },
  webshopName: "Webshop",
  licenseServerName: "License Server",
};

export const ADDON_SHELL_SOURCE_TRANSLATIONS = {
  "sr-Latn": buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on je obavezan",
      availableAfterActivation: "Dostupno posle aktivacije add-ona.",
      activating: "Aktiviranje...",
      disabled: "Onemogućeno",
      installDisabled: "Instalacija onemogućena",
      installPending: "Instalacija na čekanju",
      installUnavailable: "Instalacija nije dostupna",
      licenseInvalid: "Licenca nije važeća",
      licenseKey: "Licencni ključ",
      licenseKeyRequired: "Licencni ključ je obavezan.",
      licenseRequired: "Licenca je obavezna",
      licenseNeedsAttention: "Licenca zahteva pažnju",
      invalidActivationInput: "Nevažeći unos za aktivaciju.",
      supportedInstallTargets: "Podržana odredišta instalacije: {providers}.",
    },
    product: {
      activate: "Aktiviraj {product}",
      activation: "Aktivacija za {product}",
      ready: "Licenca prihvaćena. Add-on {product} je spreman.",
      selfHostedSuccess:
        "Licenca prihvaćena. Instaliraj privatni paket {product}, podesi {env} i restartuj CMS da završiš podešavanje.",
      pendingSuccess:
        "Licenca prihvaćena. Instalacija add-ona {product} čeka deployment pipeline.",
      backTo: "Nazad na {product}",
      buyKey: "Kupi licencni ključ za {product}",
      cannotInstall: "{product} ne može da se instalira",
      pendingInstallDescription:
        "Licenca je prihvaćena. Instaliraj privatni paket {product}, podesi {env} i ponovo izgradi ili restartuj CMS da završiš podešavanje.",
      installLocked: "Tok instalacije za {product} je zaključan",
      licenseRequiredDescription:
        "Kupi ili unesi važeći licencni ključ za {product} da aktiviraš ovaj plaćeni add-on za ovaj CMS deployment.",
      notInstalledTitle: "Add-on {product} nije instaliran",
      disabledTitle: "{product} je onemogućen",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Osnova plaćenog commerce add-ona i CMS shell.",
      activationDescription:
        "Aktivacija vezuje licencu za ovu CMS instalaciju. Tokeni za instalaciju paketa su kratkog veka i CMS ih ne čuva.",
      notInstalledDescription:
        "Javni CMS shell je spreman. Aktiviraj licencu, instaliraj privatni Webshop add-on paket i podesi WEBSHOP_ADDON_MODULE pre nego što commerce funkcije budu dostupne.",
      editShell: "Izmeni shell",
      viewStorefront: "Prikaži storefront",
      setUp: "Podesi veb-prodavnicu",
      noShellTitle: "Shell veb-prodavnice još ne postoji",
      shellEntryDescription:
        "Kreiraj CMS unos koji poseduje slug prodavnice, SEO, status, vidljivost i rutiranje.",
      createCmsShell: "Kreiraj CMS shell",
      publicPreview: "Javni pregled",
      usesShellRenderer: "Koristi CMS shell renderer.",
      categories: "Kategorije veb-prodavnice",
      dashboard: "Kontrolna tabla veb-prodavnice",
      categoryBridge: {
        readOnlyBadge: "Read-only most",
        description:
          "Upravljanje kategorijama veb-prodavnice dostupno je kroz plaćeni add-on. Ova CMS sekcija održava stabilan navigacioni unos dok add-on kontroliše commerce podatke.",
        editExistingOnlyBadge: "Samo izmena postojećih",
        unavailableBadge: "Most nije dostupan",
        unavailableDescription:
          "Add-on most za kategorije trenutno nije dostupan. Otvori upravljanje veb-prodavnicom da pregledaš trenutno stanje add-ona.",
        openManagement: "Otvori upravljanje",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Plaćeni add-on za digitalno licenciranje proizvoda koje tvoji klijenti prodaju.",
      activationDescription:
        "Aktivacija vezuje ovaj plaćeni License Server add-on za CMS instalaciju. Tvoj master license server ostaje autoritet za aktivaciju.",
      notInstalledDescription:
        "Aktiviraj licencu, instaliraj privatni License Server add-on paket i podesi LICENSE_SERVER_ADDON_MODULE pre nego što API-ji za licenciranje budu dostupni.",
    },
    labels: {
      waitingForInstall: "Čeka se instalacija add-ona",
      title: "Naslov",
      slug: "URL oznaka",
      status: "Status",
      category: "Kategorija",
      products: "Proizvodi",
      categories: "Kategorije",
      orders: "Porudžbine",
      payments: "Plaćanja",
      storefront: "Storefront",
      coupons: "Kuponi",
      settings: "Podešavanja",
      apiClients: "API klijenti",
      productTypes: "Tipovi proizvoda",
      skus: "SKU-ovi",
      licenses: "Licence",
      validationEvents: "Događaji validacije",
    },
  }),
  "sr-Cyrl": buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on је обавезан",
      availableAfterActivation: "Доступно после активације add-ona.",
      activating: "Активирање...",
      disabled: "Онемогућено",
      installDisabled: "Инсталација онемогућена",
      installPending: "Инсталација на чекању",
      installUnavailable: "Инсталација није доступна",
      licenseInvalid: "Лиценца није важећа",
      licenseKey: "Лиценцни кључ",
      licenseKeyRequired: "Лиценцни кључ је обавезан.",
      licenseRequired: "Лиценца је обавезна",
      licenseNeedsAttention: "Лиценца захтева пажњу",
      invalidActivationInput: "Неважећи унос за активацију.",
      supportedInstallTargets: "Подржана одредишта инсталације: {providers}.",
    },
    product: {
      activate: "Активирај {product}",
      activation: "Активација за {product}",
      ready: "Лиценца прихваћена. Add-on {product} је спреман.",
      selfHostedSuccess:
        "Лиценца прихваћена. Инсталирај приватни пакет {product}, подеси {env} и рестартуј CMS да завршиш подешавање.",
      pendingSuccess:
        "Лиценца прихваћена. Инсталација add-ona {product} чека deployment pipeline.",
      backTo: "Назад на {product}",
      buyKey: "Купи лиценцни кључ за {product}",
      cannotInstall: "{product} не може да се инсталира",
      pendingInstallDescription:
        "Лиценца је прихваћена. Инсталирај приватни пакет {product}, подеси {env} и поново изгради или рестартуј CMS да завршиш подешавање.",
      installLocked: "Ток инсталације за {product} је закључан",
      licenseRequiredDescription:
        "Купи или унеси важећи лиценцни кључ за {product} да активираш овај плаћени add-on за овај CMS deployment.",
      notInstalledTitle: "Add-on {product} није инсталиран",
      disabledTitle: "{product} је онемогућен",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Основа плаћеног commerce add-ona и CMS shell.",
      activationDescription:
        "Активација везује лиценцу за ову CMS инсталацију. Токени за инсталацију пакета су кратког века и CMS их не чува.",
      notInstalledDescription:
        "Јавни CMS shell је спреман. Активирај лиценцу, инсталирај приватни Webshop add-on пакет и подеси WEBSHOP_ADDON_MODULE пре него што commerce функције буду доступне.",
      editShell: "Измени shell",
      viewStorefront: "Прикажи storefront",
      setUp: "Подеси веб-продавницу",
      noShellTitle: "Shell веб-продавнице још не постоји",
      shellEntryDescription:
        "Креирај CMS унос који поседује slug продавнице, SEO, статус, видљивост и рутирање.",
      createCmsShell: "Креирај CMS shell",
      publicPreview: "Јавни преглед",
      usesShellRenderer: "Користи CMS shell renderer.",
      categories: "Категорије веб-продавнице",
      dashboard: "Контролна табла веб-продавнице",
      categoryBridge: {
        readOnlyBadge: "Read-only мост",
        description:
          "Управљање категоријама веб-продавнице доступно је кроз плаћени add-on. Ова CMS секција одржава стабилан навигациони унос док add-on контролише commerce податке.",
        editExistingOnlyBadge: "Само измена постојећих",
        unavailableBadge: "Мост није доступан",
        unavailableDescription:
          "Add-on мост за категорије тренутно није доступан. Отвори управљање веб-продавницом да прегледаш тренутно стање add-ona.",
        openManagement: "Отвори управљање",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Плаћени add-on за дигитално лиценцирање производа које твоји клијенти продају.",
      activationDescription:
        "Активација везује овај плаћени License Server add-on за CMS инсталацију. Твој master license server остаје ауторитет за активацију.",
      notInstalledDescription:
        "Активирај лиценцу, инсталирај приватни License Server add-on пакет и подеси LICENSE_SERVER_ADDON_MODULE пре него што API-ји за лиценцирање буду доступни.",
    },
    labels: {
      waitingForInstall: "Чека се инсталација add-ona",
      title: "Наслов",
      slug: "URL ознака",
      status: "Статус",
      category: "Категорија",
      products: "Производи",
      categories: "Категорије",
      orders: "Поруџбине",
      payments: "Плаћања",
      storefront: "Storefront",
      coupons: "Купони",
      settings: "Подешавања",
      apiClients: "API клијенти",
      productTypes: "Типови производа",
      skus: "SKU-ови",
      licenses: "Лиценце",
      validationEvents: "Догађаји валидације",
    },
  }),
  hr: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on je obavezan",
      availableAfterActivation: "Dostupno nakon aktivacije add-ona.",
      activating: "Aktiviranje...",
      disabled: "Onemogućeno",
      installDisabled: "Instalacija onemogućena",
      installPending: "Instalacija na čekanju",
      installUnavailable: "Instalacija nije dostupna",
      licenseInvalid: "Licenca nije valjana",
      licenseKey: "Licencni ključ",
      licenseKeyRequired: "Licencni ključ je obavezan.",
      licenseRequired: "Licenca je obavezna",
      licenseNeedsAttention: "Licenca zahtijeva pažnju",
      invalidActivationInput: "Nevaljan unos za aktivaciju.",
      supportedInstallTargets: "Podržana odredišta instalacije: {providers}.",
    },
    product: {
      activate: "Aktiviraj {product}",
      activation: "Aktivacija za {product}",
      ready: "Licenca prihvaćena. Add-on {product} je spreman.",
      selfHostedSuccess:
        "Licenca prihvaćena. Instaliraj privatni paket {product}, postavi {env} i ponovno pokreni CMS za dovršetak postavljanja.",
      pendingSuccess:
        "Licenca prihvaćena. Instalacija add-ona {product} čeka deployment pipeline.",
      backTo: "Natrag na {product}",
      buyKey: "Kupi licencni ključ za {product}",
      cannotInstall: "{product} se ne može instalirati",
      pendingInstallDescription:
        "Licenca je prihvaćena. Instaliraj privatni paket {product}, postavi {env} i ponovno izgradi ili pokreni CMS za dovršetak postavljanja.",
      installLocked: "Tijek instalacije za {product} je zaključan",
      licenseRequiredDescription:
        "Kupi ili unesi valjan licencni ključ za {product} kako bi aktivirao ovaj plaćeni add-on za ovu CMS implementaciju.",
      notInstalledTitle: "Add-on {product} nije instaliran",
      disabledTitle: "{product} je onemogućen",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Temelj plaćenog commerce add-ona i CMS shell.",
      activationDescription:
        "Aktivacija veže licencu uz ovu CMS instalaciju. Tokeni za instalaciju paketa kratko traju i CMS ih ne pohranjuje.",
      notInstalledDescription:
        "Javni CMS shell je spreman. Aktiviraj licencu, instaliraj privatni Webshop add-on paket i konfiguriraj WEBSHOP_ADDON_MODULE prije dostupnosti commerce značajki.",
      editShell: "Uredi shell",
      viewStorefront: "Prikaži storefront",
      setUp: "Postavi Webshop",
      noShellTitle: "Webshop shell još ne postoji",
      shellEntryDescription:
        "Stvori CMS zapis koji posjeduje slug trgovine, SEO, status, vidljivost i rutiranje.",
      createCmsShell: "Stvori CMS shell",
      publicPreview: "Javni pregled",
      usesShellRenderer: "Koristi CMS shell renderer.",
      categories: "Webshop kategorije",
      dashboard: "Webshop nadzorna ploča",
      categoryBridge: {
        readOnlyBadge: "Most samo za čitanje",
        description:
          "Upravljanje Webshop kategorijama dostupno je kroz plaćeni add-on. Ova CMS sekcija održava stabilan navigacijski unos dok add-on upravlja commerce podacima.",
        editExistingOnlyBadge: "Samo uređivanje postojećih",
        unavailableBadge: "Most nije dostupan",
        unavailableDescription:
          "Add-on most za kategorije trenutačno nije dostupan. Otvori Webshop upravljanje za pregled trenutačnog stanja add-ona.",
        openManagement: "Otvori upravljanje",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Plaćeni add-on za digitalno licenciranje proizvoda koje tvoji klijenti prodaju.",
      activationDescription:
        "Aktivacija veže ovaj plaćeni License Server add-on uz CMS instalaciju. Tvoj master license server ostaje autoritet za aktivaciju.",
      notInstalledDescription:
        "Aktiviraj licencu, instaliraj privatni License Server add-on paket i konfiguriraj LICENSE_SERVER_ADDON_MODULE prije dostupnosti API-ja za licenciranje.",
    },
    labels: {
      waitingForInstall: "Čeka se instalacija add-ona",
      title: "Naslov",
      slug: "URL oznaka",
      status: "Status",
      category: "Kategorija",
      products: "Proizvodi",
      categories: "Kategorije",
      orders: "Narudžbe",
      payments: "Plaćanja",
      storefront: "Storefront",
      coupons: "Kuponi",
      settings: "Postavke",
      apiClients: "API klijenti",
      productTypes: "Vrste proizvoda",
      skus: "SKU-ovi",
      licenses: "Licence",
      validationEvents: "Događaji validacije",
    },
  }),
  de: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on erforderlich",
      availableAfterActivation: "Nach Aktivierung des Add-ons verfügbar.",
      activating: "Aktivierung...",
      disabled: "Deaktiviert",
      installDisabled: "Installation deaktiviert",
      installPending: "Installation ausstehend",
      installUnavailable: "Installation nicht verfügbar",
      licenseInvalid: "Lizenz ungültig",
      licenseKey: "Lizenzschlüssel",
      licenseKeyRequired: "Lizenzschlüssel ist erforderlich.",
      licenseRequired: "Lizenz erforderlich",
      licenseNeedsAttention: "Lizenz benötigt Aufmerksamkeit",
      invalidActivationInput: "Ungültige Aktivierungseingabe.",
      supportedInstallTargets: "Unterstützte Installationsziele: {providers}.",
    },
    product: {
      activate: "{product} aktivieren",
      activation: "{product}-Aktivierung",
      ready: "Lizenz akzeptiert. Das {product}-Add-on ist bereit.",
      selfHostedSuccess:
        "Lizenz akzeptiert. Installiere das private {product}-Paket, setze {env} und starte das CMS neu, um die Einrichtung abzuschließen.",
      pendingSuccess:
        "Lizenz akzeptiert. Die Installation des {product}-Add-ons wartet auf die Deployment-Pipeline.",
      backTo: "Zurück zu {product}",
      buyKey: "{product}-Lizenzschlüssel kaufen",
      cannotInstall: "{product} kann nicht installiert werden",
      pendingInstallDescription:
        "Die Lizenz wurde akzeptiert. Installiere das private {product}-Paket, setze {env} und baue das CMS neu oder starte es neu, um die Einrichtung abzuschließen.",
      installLocked: "Installationsablauf für {product} ist gesperrt",
      licenseRequiredDescription:
        "Kaufe oder gib einen gültigen {product}-Lizenzschlüssel ein, um dieses kostenpflichtige Add-on für diese CMS-Bereitstellung zu aktivieren.",
      notInstalledTitle: "{product}-Add-on ist nicht installiert",
      disabledTitle: "{product} ist deaktiviert",
    },
    webshop: {
      name: baseTerms.webshopName,
      description:
        "Grundlage für das kostenpflichtige Commerce-Add-on und CMS-Shell.",
      activationDescription:
        "Die Aktivierung bindet die Lizenz an diese CMS-Installation. Installations-Tokens für Pakete sind kurzlebig und werden vom CMS nicht gespeichert.",
      notInstalledDescription:
        "Die öffentliche CMS-Shell ist bereit. Aktiviere die Lizenz, installiere das private Webshop-Add-on-Paket und konfiguriere WEBSHOP_ADDON_MODULE, bevor Commerce-Funktionen verfügbar sind.",
      editShell: "Shell bearbeiten",
      viewStorefront: "Storefront anzeigen",
      setUp: "Webshop einrichten",
      noShellTitle: "Noch keine Webshop-Shell",
      shellEntryDescription:
        "Erstelle den CMS-Eintrag, der Shop-Slug, SEO, Status, Sichtbarkeit und Routing verwaltet.",
      createCmsShell: "CMS-Shell erstellen",
      publicPreview: "Öffentliche Vorschau",
      usesShellRenderer: "Verwendet den CMS-Shell-Renderer.",
      categories: "Webshop-Kategorien",
      dashboard: "Webshop-Dashboard",
      categoryBridge: {
        readOnlyBadge: "Schreibgeschützte Brücke",
        description:
          "Die Verwaltung von Webshop-Kategorien ist über das kostenpflichtige Add-on verfügbar. Dieser CMS-Bereich hält den Navigationseintrag stabil, während das Add-on die Commerce-Daten steuert.",
        editExistingOnlyBadge: "Nur bestehende bearbeiten",
        unavailableBadge: "Brücke nicht verfügbar",
        unavailableDescription:
          "Die Add-on-Kategoriebrücke ist derzeit nicht verfügbar. Öffne die Webshop-Verwaltung, um den aktuellen Add-on-Status zu prüfen.",
        openManagement: "Verwaltung öffnen",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Kostenpflichtiges Add-on für digitale Lizenzierung von Produkten, die deine Kunden verkaufen.",
      activationDescription:
        "Die Aktivierung bindet dieses kostenpflichtige License-Server-Add-on an die CMS-Installation. Dein Master-License-Server bleibt die Aktivierungsautorität.",
      notInstalledDescription:
        "Aktiviere die Lizenz, installiere das private License-Server-Add-on-Paket und konfiguriere LICENSE_SERVER_ADDON_MODULE, bevor Lizenzierungs-APIs verfügbar sind.",
    },
    labels: {
      waitingForInstall: "Warten auf Add-on-Installation",
      title: "Titel",
      slug: "URL-Kennung",
      status: "Status",
      category: "Kategorie",
      products: "Produkte",
      categories: "Kategorien",
      orders: "Bestellungen",
      payments: "Zahlungen",
      storefront: "Storefront",
      coupons: "Gutscheine",
      settings: "Einstellungen",
      apiClients: "API-Clients",
      productTypes: "Produkttypen",
      skus: "SKUs",
      licenses: "Lizenzen",
      validationEvents: "Validierungsereignisse",
    },
  }),
  fr: buildAddonShellTranslations({
    common: {
      addOnRequired: "Module complémentaire requis",
      availableAfterActivation: "Disponible après l'activation du module.",
      activating: "Activation...",
      disabled: "Désactivé",
      installDisabled: "Installation désactivée",
      installPending: "Installation en attente",
      installUnavailable: "Installation indisponible",
      licenseInvalid: "Licence invalide",
      licenseKey: "Clé de licence",
      licenseKeyRequired: "La clé de licence est obligatoire.",
      licenseRequired: "Licence requise",
      licenseNeedsAttention: "La licence nécessite une attention",
      invalidActivationInput: "Saisie d'activation invalide.",
      supportedInstallTargets:
        "Cibles d'installation prises en charge : {providers}.",
    },
    product: {
      activate: "Activer {product}",
      activation: "Activation de {product}",
      ready: "Licence acceptée. Le module {product} est prêt.",
      selfHostedSuccess:
        "Licence acceptée. Installez le paquet privé {product}, définissez {env} et redémarrez le CMS pour terminer la configuration.",
      pendingSuccess:
        "Licence acceptée. L'installation du module {product} attend le pipeline de déploiement.",
      backTo: "Retour à {product}",
      buyKey: "Acheter une clé de licence {product}",
      cannotInstall: "{product} ne peut pas être installé",
      pendingInstallDescription:
        "La licence a été acceptée. Installez le paquet privé {product}, définissez {env} puis reconstruisez ou redémarrez le CMS pour terminer la configuration.",
      installLocked: "Le flux d'installation de {product} est verrouillé",
      licenseRequiredDescription:
        "Achetez ou saisissez une clé de licence {product} valide pour activer ce module payant pour ce déploiement CMS.",
      notInstalledTitle: "Le module {product} n'est pas installé",
      disabledTitle: "{product} est désactivé",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Base du module commerce payant et shell CMS.",
      activationDescription:
        "L'activation lie la licence à cette installation CMS. Les jetons d'installation de paquet sont de courte durée et ne sont pas stockés par le CMS.",
      notInstalledDescription:
        "Le shell CMS public est prêt. Activez la licence, installez le paquet privé du module Webshop et configurez WEBSHOP_ADDON_MODULE avant que les fonctions commerce soient disponibles.",
      editShell: "Modifier le shell",
      viewStorefront: "Voir la vitrine",
      setUp: "Configurer Webshop",
      noShellTitle: "Aucun shell Webshop pour l'instant",
      shellEntryDescription:
        "Créez l'entrée CMS qui possède le slug de boutique, le SEO, le statut, la visibilité et le routage.",
      createCmsShell: "Créer le shell CMS",
      publicPreview: "Aperçu public",
      usesShellRenderer: "Utilise le moteur de rendu du shell CMS.",
      categories: "Catégories Webshop",
      dashboard: "Tableau de bord Webshop",
      categoryBridge: {
        readOnlyBadge: "Pont en lecture seule",
        description:
          "La gestion des catégories Webshop est disponible via le module payant. Cette section CMS garde l'entrée de navigation stable pendant que le module contrôle les données commerce.",
        editExistingOnlyBadge: "Modifier l'existant uniquement",
        unavailableBadge: "Pont indisponible",
        unavailableDescription:
          "Le pont de catégories du module n'est pas disponible pour le moment. Ouvrez la gestion Webshop pour vérifier l'état actuel du module.",
        openManagement: "Ouvrir la gestion",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Module payant de licences numériques pour les produits vendus par vos clients.",
      activationDescription:
        "L'activation lie ce module License Server payant à l'installation CMS. Votre serveur de licences maître reste l'autorité d'activation.",
      notInstalledDescription:
        "Activez la licence, installez le paquet privé du module License Server et configurez LICENSE_SERVER_ADDON_MODULE avant que les API de licence soient disponibles.",
    },
    labels: {
      waitingForInstall: "En attente de l'installation du module",
      title: "Titre",
      slug: "Identifiant URL",
      status: "Statut",
      category: "Catégorie",
      products: "Produits",
      categories: "Catégories",
      orders: "Commandes",
      payments: "Paiements",
      storefront: "Vitrine",
      coupons: "Coupons",
      settings: "Paramètres",
      apiClients: "Clients API",
      productTypes: "Types de produits",
      skus: "SKU",
      licenses: "Licences",
      validationEvents: "Événements de validation",
    },
  }),
  es: buildAddonShellTranslations({
    common: {
      addOnRequired: "Complemento requerido",
      availableAfterActivation: "Disponible después de activar el complemento.",
      activating: "Activando...",
      disabled: "Deshabilitado",
      installDisabled: "Instalación deshabilitada",
      installPending: "Instalación pendiente",
      installUnavailable: "Instalación no disponible",
      licenseInvalid: "Licencia no válida",
      licenseKey: "Clave de licencia",
      licenseKeyRequired: "La clave de licencia es obligatoria.",
      licenseRequired: "Licencia requerida",
      licenseNeedsAttention: "La licencia requiere atención",
      invalidActivationInput: "Entrada de activación no válida.",
      supportedInstallTargets:
        "Destinos de instalación compatibles: {providers}.",
    },
    product: {
      activate: "Activar {product}",
      activation: "Activación de {product}",
      ready: "Licencia aceptada. El complemento {product} está listo.",
      selfHostedSuccess:
        "Licencia aceptada. Instala el paquete privado {product}, define {env} y reinicia el CMS para completar la configuración.",
      pendingSuccess:
        "Licencia aceptada. La instalación del complemento {product} está pendiente del pipeline de despliegue.",
      backTo: "Volver a {product}",
      buyKey: "Comprar clave de licencia de {product}",
      cannotInstall: "{product} no se puede instalar",
      pendingInstallDescription:
        "La licencia fue aceptada. Instala el paquete privado {product}, define {env} y recompila o reinicia el CMS para completar la configuración.",
      installLocked: "El flujo de instalación de {product} está bloqueado",
      licenseRequiredDescription:
        "Compra o introduce una clave de licencia válida de {product} para activar este complemento de pago en este despliegue CMS.",
      notInstalledTitle: "El complemento {product} no está instalado",
      disabledTitle: "{product} está deshabilitado",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Base del complemento de comercio de pago y shell CMS.",
      activationDescription:
        "La activación vincula la licencia a esta instalación CMS. Los tokens de instalación de paquetes duran poco y el CMS no los almacena.",
      notInstalledDescription:
        "El shell CMS público está listo. Activa la licencia, instala el paquete privado del complemento Webshop y configura WEBSHOP_ADDON_MODULE antes de que las funciones de comercio estén disponibles.",
      editShell: "Editar shell",
      viewStorefront: "Ver escaparate",
      setUp: "Configurar Webshop",
      noShellTitle: "Aún no hay shell de Webshop",
      shellEntryDescription:
        "Crea la entrada CMS que controla el slug de la tienda, SEO, estado, visibilidad y enrutamiento.",
      createCmsShell: "Crear shell CMS",
      publicPreview: "Vista previa pública",
      usesShellRenderer: "Usa el renderizador del shell CMS.",
      categories: "Categorías de Webshop",
      dashboard: "Panel de Webshop",
      categoryBridge: {
        readOnlyBadge: "Puente de solo lectura",
        description:
          "La gestión de categorías de Webshop está disponible mediante el complemento de pago. Esta sección CMS mantiene estable la entrada de navegación mientras el complemento controla los datos de comercio.",
        editExistingOnlyBadge: "Solo editar existentes",
        unavailableBadge: "Puente no disponible",
        unavailableDescription:
          "El puente de categorías del complemento no está disponible ahora. Abre la gestión de Webshop para revisar el estado actual del complemento.",
        openManagement: "Abrir gestión",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Complemento de licencias digitales de pago para productos que venden tus clientes.",
      activationDescription:
        "La activación vincula este complemento License Server de pago a la instalación CMS. Tu servidor maestro de licencias sigue siendo la autoridad de activación.",
      notInstalledDescription:
        "Activa la licencia, instala el paquete privado del complemento License Server y configura LICENSE_SERVER_ADDON_MODULE antes de que las API de licencias estén disponibles.",
    },
    labels: {
      waitingForInstall: "Esperando la instalación del complemento",
      title: "Título",
      slug: "Identificador URL",
      status: "Estado",
      category: "Categoría",
      products: "Productos",
      categories: "Categorías",
      orders: "Pedidos",
      payments: "Pagos",
      storefront: "Escaparate",
      coupons: "Cupones",
      settings: "Configuración",
      apiClients: "Clientes API",
      productTypes: "Tipos de producto",
      skus: "SKU",
      licenses: "Licencias",
      validationEvents: "Eventos de validación",
    },
  }),
  it: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on richiesto",
      availableAfterActivation: "Disponibile dopo l'attivazione dell'add-on.",
      activating: "Attivazione...",
      disabled: "Disabilitato",
      installDisabled: "Installazione disabilitata",
      installPending: "Installazione in sospeso",
      installUnavailable: "Installazione non disponibile",
      licenseInvalid: "Licenza non valida",
      licenseKey: "Chiave di licenza",
      licenseKeyRequired: "La chiave di licenza è obbligatoria.",
      licenseRequired: "Licenza richiesta",
      licenseNeedsAttention: "La licenza richiede attenzione",
      invalidActivationInput: "Input di attivazione non valido.",
      supportedInstallTargets:
        "Destinazioni di installazione supportate: {providers}.",
    },
    product: {
      activate: "Attiva {product}",
      activation: "Attivazione di {product}",
      ready: "Licenza accettata. L'add-on {product} è pronto.",
      selfHostedSuccess:
        "Licenza accettata. Installa il pacchetto privato {product}, imposta {env} e riavvia il CMS per completare la configurazione.",
      pendingSuccess:
        "Licenza accettata. L'installazione dell'add-on {product} è in attesa della pipeline di deployment.",
      backTo: "Torna a {product}",
      buyKey: "Acquista chiave di licenza {product}",
      cannotInstall: "{product} non può essere installato",
      pendingInstallDescription:
        "La licenza è stata accettata. Installa il pacchetto privato {product}, imposta {env} e ricompila o riavvia il CMS per completare la configurazione.",
      installLocked: "Il flusso di installazione di {product} è bloccato",
      licenseRequiredDescription:
        "Acquista o inserisci una chiave di licenza {product} valida per attivare questo add-on a pagamento per questa distribuzione CMS.",
      notInstalledTitle: "L'add-on {product} non è installato",
      disabledTitle: "{product} è disabilitato",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Base dell'add-on commerce a pagamento e shell CMS.",
      activationDescription:
        "L'attivazione collega la licenza a questa installazione CMS. I token di installazione dei pacchetti sono di breve durata e non vengono memorizzati dal CMS.",
      notInstalledDescription:
        "La shell CMS pubblica è pronta. Attiva la licenza, installa il pacchetto privato dell'add-on Webshop e configura WEBSHOP_ADDON_MODULE prima che le funzioni commerce siano disponibili.",
      editShell: "Modifica shell",
      viewStorefront: "Visualizza storefront",
      setUp: "Configura Webshop",
      noShellTitle: "Nessuna shell Webshop ancora",
      shellEntryDescription:
        "Crea la voce CMS che possiede slug del negozio, SEO, stato, visibilità e routing.",
      createCmsShell: "Crea shell CMS",
      publicPreview: "Anteprima pubblica",
      usesShellRenderer: "Usa il renderer della shell CMS.",
      categories: "Categorie Webshop",
      dashboard: "Dashboard Webshop",
      categoryBridge: {
        readOnlyBadge: "Bridge in sola lettura",
        description:
          "La gestione delle categorie Webshop è disponibile tramite l'add-on a pagamento. Questa sezione CMS mantiene stabile la voce di navigazione mentre l'add-on controlla i dati commerce.",
        editExistingOnlyBadge: "Solo modifica esistenti",
        unavailableBadge: "Bridge non disponibile",
        unavailableDescription:
          "Il bridge categorie dell'add-on non è disponibile al momento. Apri la gestione Webshop per controllare lo stato attuale dell'add-on.",
        openManagement: "Apri gestione",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Add-on a pagamento per licenze digitali dei prodotti venduti dai tuoi clienti.",
      activationDescription:
        "L'attivazione collega questo add-on License Server a pagamento all'installazione CMS. Il tuo master license server resta l'autorità di attivazione.",
      notInstalledDescription:
        "Attiva la licenza, installa il pacchetto privato dell'add-on License Server e configura LICENSE_SERVER_ADDON_MODULE prima che le API di licenza siano disponibili.",
    },
    labels: {
      waitingForInstall: "In attesa dell'installazione dell'add-on",
      title: "Titolo",
      slug: "Identificatore URL",
      status: "Stato",
      category: "Categoria",
      products: "Prodotti",
      categories: "Categorie",
      orders: "Ordini",
      payments: "Pagamenti",
      storefront: "Storefront",
      coupons: "Coupon",
      settings: "Impostazioni",
      apiClients: "Client API",
      productTypes: "Tipi di prodotto",
      skus: "SKU",
      licenses: "Licenze",
      validationEvents: "Eventi di validazione",
    },
  }),
  pt: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on obrigatório",
      availableAfterActivation: "Disponível após a ativação do add-on.",
      activating: "A ativar...",
      disabled: "Desativado",
      installDisabled: "Instalação desativada",
      installPending: "Instalação pendente",
      installUnavailable: "Instalação indisponível",
      licenseInvalid: "Licença inválida",
      licenseKey: "Chave de licença",
      licenseKeyRequired: "A chave de licença é obrigatória.",
      licenseRequired: "Licença obrigatória",
      licenseNeedsAttention: "A licença requer atenção",
      invalidActivationInput: "Entrada de ativação inválida.",
      supportedInstallTargets:
        "Destinos de instalação suportados: {providers}.",
    },
    product: {
      activate: "Ativar {product}",
      activation: "Ativação de {product}",
      ready: "Licença aceite. O add-on {product} está pronto.",
      selfHostedSuccess:
        "Licença aceite. Instale o pacote privado {product}, defina {env} e reinicie o CMS para concluir a configuração.",
      pendingSuccess:
        "Licença aceite. A instalação do add-on {product} aguarda o pipeline de implementação.",
      backTo: "Voltar a {product}",
      buyKey: "Comprar chave de licença de {product}",
      cannotInstall: "{product} não pode ser instalado",
      pendingInstallDescription:
        "A licença foi aceite. Instale o pacote privado {product}, defina {env} e reconstrua ou reinicie o CMS para concluir a configuração.",
      installLocked: "O fluxo de instalação de {product} está bloqueado",
      licenseRequiredDescription:
        "Compre ou introduza uma chave de licença válida de {product} para ativar este add-on pago nesta implementação CMS.",
      notInstalledTitle: "O add-on {product} não está instalado",
      disabledTitle: "{product} está desativado",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Base do add-on commerce pago e shell CMS.",
      activationDescription:
        "A ativação associa a licença a esta instalação CMS. Os tokens de instalação de pacotes têm curta duração e não são guardados pelo CMS.",
      notInstalledDescription:
        "A shell CMS pública está pronta. Ative a licença, instale o pacote privado do add-on Webshop e configure WEBSHOP_ADDON_MODULE antes de as funções commerce ficarem disponíveis.",
      editShell: "Editar shell",
      viewStorefront: "Ver storefront",
      setUp: "Configurar Webshop",
      noShellTitle: "Ainda não há shell Webshop",
      shellEntryDescription:
        "Crie a entrada CMS que gere o slug da loja, SEO, estado, visibilidade e rotas.",
      createCmsShell: "Criar shell CMS",
      publicPreview: "Pré-visualização pública",
      usesShellRenderer: "Usa o renderer da shell CMS.",
      categories: "Categorias Webshop",
      dashboard: "Painel Webshop",
      categoryBridge: {
        readOnlyBadge: "Ponte só de leitura",
        description:
          "A gestão de categorias Webshop está disponível através do add-on pago. Esta secção CMS mantém a entrada de navegação estável enquanto o add-on controla os dados commerce.",
        editExistingOnlyBadge: "Editar apenas existentes",
        unavailableBadge: "Ponte indisponível",
        unavailableDescription:
          "A ponte de categorias do add-on não está disponível neste momento. Abra a gestão Webshop para rever o estado atual do add-on.",
        openManagement: "Abrir gestão",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Add-on pago de licenciamento digital para produtos vendidos pelos seus clientes.",
      activationDescription:
        "A ativação associa este add-on License Server pago à instalação CMS. O seu master license server continua a ser a autoridade de ativação.",
      notInstalledDescription:
        "Ative a licença, instale o pacote privado do add-on License Server e configure LICENSE_SERVER_ADDON_MODULE antes de as APIs de licenciamento ficarem disponíveis.",
    },
    labels: {
      waitingForInstall: "A aguardar instalação do add-on",
      title: "Título",
      slug: "Identificador URL",
      status: "Estado",
      category: "Categoria",
      products: "Produtos",
      categories: "Categorias",
      orders: "Encomendas",
      payments: "Pagamentos",
      storefront: "Storefront",
      coupons: "Cupões",
      settings: "Definições",
      apiClients: "Clientes API",
      productTypes: "Tipos de produto",
      skus: "SKUs",
      licenses: "Licenças",
      validationEvents: "Eventos de validação",
    },
  }),
  "pt-BR": buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on obrigatório",
      availableAfterActivation: "Disponível após a ativação do add-on.",
      activating: "Ativando...",
      disabled: "Desativado",
      installDisabled: "Instalação desativada",
      installPending: "Instalação pendente",
      installUnavailable: "Instalação indisponível",
      licenseInvalid: "Licença inválida",
      licenseKey: "Chave de licença",
      licenseKeyRequired: "A chave de licença é obrigatória.",
      licenseRequired: "Licença obrigatória",
      licenseNeedsAttention: "A licença requer atenção",
      invalidActivationInput: "Entrada de ativação inválida.",
      supportedInstallTargets:
        "Destinos de instalação compatíveis: {providers}.",
    },
    product: {
      activate: "Ativar {product}",
      activation: "Ativação do {product}",
      ready: "Licença aceita. O add-on {product} está pronto.",
      selfHostedSuccess:
        "Licença aceita. Instale o pacote privado {product}, defina {env} e reinicie o CMS para concluir a configuração.",
      pendingSuccess:
        "Licença aceita. A instalação do add-on {product} aguarda o pipeline de implantação.",
      backTo: "Voltar para {product}",
      buyKey: "Comprar chave de licença do {product}",
      cannotInstall: "{product} não pode ser instalado",
      pendingInstallDescription:
        "A licença foi aceita. Instale o pacote privado {product}, defina {env} e reconstrua ou reinicie o CMS para concluir a configuração.",
      installLocked: "O fluxo de instalação do {product} está bloqueado",
      licenseRequiredDescription:
        "Compre ou informe uma chave de licença válida do {product} para ativar este add-on pago nesta implantação CMS.",
      notInstalledTitle: "O add-on {product} não está instalado",
      disabledTitle: "{product} está desativado",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Base do add-on commerce pago e shell CMS.",
      activationDescription:
        "A ativação vincula a licença a esta instalação CMS. Os tokens de instalação de pacote duram pouco e não são armazenados pelo CMS.",
      notInstalledDescription:
        "O shell CMS público está pronto. Ative a licença, instale o pacote privado do add-on Webshop e configure WEBSHOP_ADDON_MODULE antes que os recursos commerce fiquem disponíveis.",
      editShell: "Editar shell",
      viewStorefront: "Ver storefront",
      setUp: "Configurar Webshop",
      noShellTitle: "Ainda não há shell Webshop",
      shellEntryDescription:
        "Crie a entrada CMS que controla o slug da loja, SEO, status, visibilidade e rotas.",
      createCmsShell: "Criar shell CMS",
      publicPreview: "Prévia pública",
      usesShellRenderer: "Usa o renderizador do shell CMS.",
      categories: "Categorias Webshop",
      dashboard: "Painel Webshop",
      categoryBridge: {
        readOnlyBadge: "Ponte somente leitura",
        description:
          "O gerenciamento de categorias Webshop está disponível pelo add-on pago. Esta seção CMS mantém a entrada de navegação estável enquanto o add-on controla os dados commerce.",
        editExistingOnlyBadge: "Editar apenas existentes",
        unavailableBadge: "Ponte indisponível",
        unavailableDescription:
          "A ponte de categorias do add-on não está disponível agora. Abra o gerenciamento do Webshop para revisar o estado atual do add-on.",
        openManagement: "Abrir gerenciamento",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Add-on pago de licenciamento digital para produtos vendidos pelos seus clientes.",
      activationDescription:
        "A ativação vincula este add-on License Server pago à instalação CMS. Seu master license server continua sendo a autoridade de ativação.",
      notInstalledDescription:
        "Ative a licença, instale o pacote privado do add-on License Server e configure LICENSE_SERVER_ADDON_MODULE antes que as APIs de licenciamento fiquem disponíveis.",
    },
    labels: {
      waitingForInstall: "Aguardando instalação do add-on",
      title: "Título",
      slug: "Identificador URL",
      status: "Status",
      category: "Categoria",
      products: "Produtos",
      categories: "Categorias",
      orders: "Pedidos",
      payments: "Pagamentos",
      storefront: "Storefront",
      coupons: "Cupons",
      settings: "Configurações",
      apiClients: "Clientes API",
      productTypes: "Tipos de produto",
      skus: "SKUs",
      licenses: "Licenças",
      validationEvents: "Eventos de validação",
    },
  }),
  nl: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on vereist",
      availableAfterActivation: "Beschikbaar na activering van de add-on.",
      activating: "Activeren...",
      disabled: "Uitgeschakeld",
      installDisabled: "Installatie uitgeschakeld",
      installPending: "Installatie in behandeling",
      installUnavailable: "Installatie niet beschikbaar",
      licenseInvalid: "Licentie ongeldig",
      licenseKey: "Licentiesleutel",
      licenseKeyRequired: "Licentiesleutel is verplicht.",
      licenseRequired: "Licentie vereist",
      licenseNeedsAttention: "Licentie vereist aandacht",
      invalidActivationInput: "Ongeldige activeringsinvoer.",
      supportedInstallTargets: "Ondersteunde installatiedoelen: {providers}.",
    },
    product: {
      activate: "{product} activeren",
      activation: "{product}-activering",
      ready: "Licentie geaccepteerd. De {product}-add-on is klaar.",
      selfHostedSuccess:
        "Licentie geaccepteerd. Installeer het private {product}-pakket, stel {env} in en herstart het CMS om de configuratie te voltooien.",
      pendingSuccess:
        "Licentie geaccepteerd. De installatie van de {product}-add-on wacht op de deployment-pipeline.",
      backTo: "Terug naar {product}",
      buyKey: "{product}-licentiesleutel kopen",
      cannotInstall: "{product} kan niet worden geïnstalleerd",
      pendingInstallDescription:
        "De licentie is geaccepteerd. Installeer het private {product}-pakket, stel {env} in en bouw of herstart het CMS om de configuratie te voltooien.",
      installLocked: "Installatiestroom voor {product} is vergrendeld",
      licenseRequiredDescription:
        "Koop of voer een geldige {product}-licentiesleutel in om deze betaalde add-on voor deze CMS-deployment te activeren.",
      notInstalledTitle: "{product}-add-on is niet geïnstalleerd",
      disabledTitle: "{product} is uitgeschakeld",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Basis voor de betaalde commerce-add-on en CMS-shell.",
      activationDescription:
        "Activering koppelt de licentie aan deze CMS-installatie. Installatietokens voor pakketten zijn kort geldig en worden niet door het CMS opgeslagen.",
      notInstalledDescription:
        "De openbare CMS-shell is klaar. Activeer de licentie, installeer het private Webshop-add-onpakket en configureer WEBSHOP_ADDON_MODULE voordat commercefuncties beschikbaar zijn.",
      editShell: "Shell bewerken",
      viewStorefront: "Storefront bekijken",
      setUp: "Webshop instellen",
      noShellTitle: "Nog geen Webshop-shell",
      shellEntryDescription:
        "Maak de CMS-vermelding die de shop-slug, SEO, status, zichtbaarheid en routing beheert.",
      createCmsShell: "CMS-shell maken",
      publicPreview: "Openbare preview",
      usesShellRenderer: "Gebruikt de CMS-shell-renderer.",
      categories: "Webshop-categorieën",
      dashboard: "Webshop-dashboard",
      categoryBridge: {
        readOnlyBadge: "Alleen-lezen brug",
        description:
          "Webshop-categoriebeheer is beschikbaar via de betaalde add-on. Deze CMS-sectie houdt de navigatievermelding stabiel terwijl de add-on commercegegevens beheert.",
        editExistingOnlyBadge: "Alleen bestaande bewerken",
        unavailableBadge: "Brug niet beschikbaar",
        unavailableDescription:
          "De add-on-categoriebrug is momenteel niet beschikbaar. Open Webshop-beheer om de huidige add-onstatus te bekijken.",
        openManagement: "Beheer openen",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Betaalde add-on voor digitale licenties van producten die je klanten verkopen.",
      activationDescription:
        "Activering koppelt deze betaalde License Server-add-on aan de CMS-installatie. Je master license server blijft de activeringsautoriteit.",
      notInstalledDescription:
        "Activeer de licentie, installeer het private License Server-add-onpakket en configureer LICENSE_SERVER_ADDON_MODULE voordat licentie-API's beschikbaar zijn.",
    },
    labels: {
      waitingForInstall: "Wachten op add-oninstallatie",
      title: "Titel",
      slug: "URL-kenmerk",
      status: "Status",
      category: "Categorie",
      products: "Producten",
      categories: "Categorieën",
      orders: "Bestellingen",
      payments: "Betalingen",
      storefront: "Storefront",
      coupons: "Coupons",
      settings: "Instellingen",
      apiClients: "API-clients",
      productTypes: "Producttypen",
      skus: "SKU's",
      licenses: "Licenties",
      validationEvents: "Validatiegebeurtenissen",
    },
  }),
  pl: buildAddonShellTranslations({
    common: {
      addOnRequired: "Wymagany dodatek",
      availableAfterActivation: "Dostępne po aktywacji dodatku.",
      activating: "Aktywowanie...",
      disabled: "Wyłączone",
      installDisabled: "Instalacja wyłączona",
      installPending: "Instalacja oczekuje",
      installUnavailable: "Instalacja niedostępna",
      licenseInvalid: "Licencja nieprawidłowa",
      licenseKey: "Klucz licencyjny",
      licenseKeyRequired: "Klucz licencyjny jest wymagany.",
      licenseRequired: "Licencja wymagana",
      licenseNeedsAttention: "Licencja wymaga uwagi",
      invalidActivationInput: "Nieprawidłowe dane aktywacji.",
      supportedInstallTargets: "Obsługiwane cele instalacji: {providers}.",
    },
    product: {
      activate: "Aktywuj {product}",
      activation: "Aktywacja {product}",
      ready: "Licencja zaakceptowana. Dodatek {product} jest gotowy.",
      selfHostedSuccess:
        "Licencja zaakceptowana. Zainstaluj prywatny pakiet {product}, ustaw {env} i uruchom ponownie CMS, aby zakończyć konfigurację.",
      pendingSuccess:
        "Licencja zaakceptowana. Instalacja dodatku {product} oczekuje na pipeline wdrożeniowy.",
      backTo: "Wróć do {product}",
      buyKey: "Kup klucz licencyjny {product}",
      cannotInstall: "Nie można zainstalować {product}",
      pendingInstallDescription:
        "Licencja została zaakceptowana. Zainstaluj prywatny pakiet {product}, ustaw {env} i przebuduj lub uruchom ponownie CMS, aby zakończyć konfigurację.",
      installLocked: "Proces instalacji {product} jest zablokowany",
      licenseRequiredDescription:
        "Kup lub wpisz prawidłowy klucz licencyjny {product}, aby aktywować ten płatny dodatek dla tego wdrożenia CMS.",
      notInstalledTitle: "Dodatek {product} nie jest zainstalowany",
      disabledTitle: "{product} jest wyłączony",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Podstawa płatnego dodatku commerce i powłoki CMS.",
      activationDescription:
        "Aktywacja wiąże licencję z tą instalacją CMS. Tokeny instalacji pakietu są krótkotrwałe i nie są przechowywane przez CMS.",
      notInstalledDescription:
        "Publiczna powłoka CMS jest gotowa. Aktywuj licencję, zainstaluj prywatny pakiet dodatku Webshop i skonfiguruj WEBSHOP_ADDON_MODULE, zanim funkcje commerce będą dostępne.",
      editShell: "Edytuj powłokę",
      viewStorefront: "Zobacz storefront",
      setUp: "Skonfiguruj Webshop",
      noShellTitle: "Brak powłoki Webshop",
      shellEntryDescription:
        "Utwórz wpis CMS, który zarządza slugiem sklepu, SEO, statusem, widocznością i routingiem.",
      createCmsShell: "Utwórz powłokę CMS",
      publicPreview: "Publiczny podgląd",
      usesShellRenderer: "Używa renderera powłoki CMS.",
      categories: "Kategorie Webshop",
      dashboard: "Panel Webshop",
      categoryBridge: {
        readOnlyBadge: "Most tylko do odczytu",
        description:
          "Zarządzanie kategoriami Webshop jest dostępne przez płatny dodatek. Ta sekcja CMS utrzymuje stabilny wpis nawigacji, gdy dodatek kontroluje dane commerce.",
        editExistingOnlyBadge: "Tylko edycja istniejących",
        unavailableBadge: "Most niedostępny",
        unavailableDescription:
          "Most kategorii dodatku nie jest teraz dostępny. Otwórz zarządzanie Webshop, aby sprawdzić bieżący stan dodatku.",
        openManagement: "Otwórz zarządzanie",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Płatny dodatek do cyfrowego licencjonowania produktów sprzedawanych przez twoich klientów.",
      activationDescription:
        "Aktywacja wiąże ten płatny dodatek License Server z instalacją CMS. Twój master license server pozostaje autorytetem aktywacji.",
      notInstalledDescription:
        "Aktywuj licencję, zainstaluj prywatny pakiet dodatku License Server i skonfiguruj LICENSE_SERVER_ADDON_MODULE, zanim API licencjonowania będą dostępne.",
    },
    labels: {
      waitingForInstall: "Oczekiwanie na instalację dodatku",
      title: "Tytuł",
      slug: "Identyfikator URL",
      status: "Status",
      category: "Kategoria",
      products: "Produkty",
      categories: "Kategorie",
      orders: "Zamówienia",
      payments: "Płatności",
      storefront: "Storefront",
      coupons: "Kupony",
      settings: "Ustawienia",
      apiClients: "Klienci API",
      productTypes: "Typy produktów",
      skus: "SKU",
      licenses: "Licencje",
      validationEvents: "Zdarzenia walidacji",
    },
  }),
  tr: buildAddonShellTranslations({
    common: {
      addOnRequired: "Eklenti gerekli",
      availableAfterActivation:
        "Eklenti etkinleştirildikten sonra kullanılabilir.",
      activating: "Etkinleştiriliyor...",
      disabled: "Devre dışı",
      installDisabled: "Kurulum devre dışı",
      installPending: "Kurulum bekliyor",
      installUnavailable: "Kurulum kullanılamıyor",
      licenseInvalid: "Lisans geçersiz",
      licenseKey: "Lisans anahtarı",
      licenseKeyRequired: "Lisans anahtarı gereklidir.",
      licenseRequired: "Lisans gerekli",
      licenseNeedsAttention: "Lisans dikkat gerektiriyor",
      invalidActivationInput: "Geçersiz etkinleştirme girdisi.",
      supportedInstallTargets: "Desteklenen kurulum hedefleri: {providers}.",
    },
    product: {
      activate: "{product} etkinleştir",
      activation: "{product} etkinleştirme",
      ready: "Lisans kabul edildi. {product} eklentisi hazır.",
      selfHostedSuccess:
        "Lisans kabul edildi. Özel {product} paketini kurun, {env} değerini ayarlayın ve kurulumu tamamlamak için CMS'i yeniden başlatın.",
      pendingSuccess:
        "Lisans kabul edildi. {product} eklentisi kurulumu dağıtım hattını bekliyor.",
      backTo: "{product} bölümüne dön",
      buyKey: "{product} lisans anahtarı satın al",
      cannotInstall: "{product} kurulamaz",
      pendingInstallDescription:
        "Lisans kabul edildi. Özel {product} paketini kurun, {env} değerini ayarlayın ve kurulumu tamamlamak için CMS'i yeniden derleyin veya yeniden başlatın.",
      installLocked: "{product} kurulum akışı kilitli",
      licenseRequiredDescription:
        "Bu ücretli eklentiyi bu CMS dağıtımı için etkinleştirmek üzere geçerli bir {product} lisans anahtarı satın alın veya girin.",
      notInstalledTitle: "{product} eklentisi kurulu değil",
      disabledTitle: "{product} devre dışı",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Ücretli commerce eklentisi temeli ve CMS shell.",
      activationDescription:
        "Etkinleştirme lisansı bu CMS kurulumuna bağlar. Paket kurulum belirteçleri kısa ömürlüdür ve CMS tarafından saklanmaz.",
      notInstalledDescription:
        "Genel CMS shell hazır. Commerce özellikleri kullanılmadan önce lisansı etkinleştirin, özel Webshop eklenti paketini kurun ve WEBSHOP_ADDON_MODULE değerini yapılandırın.",
      editShell: "Shell'i düzenle",
      viewStorefront: "Storefront görüntüle",
      setUp: "Webshop kur",
      noShellTitle: "Henüz Webshop shell yok",
      shellEntryDescription:
        "Mağaza slug'ını, SEO'yu, durumu, görünürlüğü ve yönlendirmeyi yöneten CMS kaydını oluşturun.",
      createCmsShell: "CMS shell oluştur",
      publicPreview: "Genel önizleme",
      usesShellRenderer: "CMS shell renderer kullanır.",
      categories: "Webshop kategorileri",
      dashboard: "Webshop paneli",
      categoryBridge: {
        readOnlyBadge: "Salt okunur köprü",
        description:
          "Webshop kategori yönetimi ücretli eklenti üzerinden kullanılabilir. Bu CMS bölümü, eklenti commerce verilerini kontrol ederken navigasyon girişini sabit tutar.",
        editExistingOnlyBadge: "Yalnızca mevcutları düzenle",
        unavailableBadge: "Köprü kullanılamıyor",
        unavailableDescription:
          "Eklenti kategori köprüsü şu anda kullanılamıyor. Geçerli eklenti durumunu incelemek için Webshop yönetimini açın.",
        openManagement: "Yönetimi aç",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Müşterilerinizin sattığı ürünler için ücretli dijital lisanslama eklentisi.",
      activationDescription:
        "Etkinleştirme bu ücretli License Server eklentisini CMS kurulumuna bağlar. Master license server aktivasyon otoritesi olarak kalır.",
      notInstalledDescription:
        "Lisansı etkinleştirin, özel License Server eklenti paketini kurun ve lisanslama API'leri kullanılmadan önce LICENSE_SERVER_ADDON_MODULE değerini yapılandırın.",
    },
    labels: {
      waitingForInstall: "Eklenti kurulumu bekleniyor",
      title: "Başlık",
      slug: "URL kimliği",
      status: "Durum",
      category: "Kategori",
      products: "Ürünler",
      categories: "Kategoriler",
      orders: "Siparişler",
      payments: "Ödemeler",
      storefront: "Storefront",
      coupons: "Kuponlar",
      settings: "Ayarlar",
      apiClients: "API istemcileri",
      productTypes: "Ürün türleri",
      skus: "SKU'lar",
      licenses: "Lisanslar",
      validationEvents: "Doğrulama olayları",
    },
  }),
  mk: buildAddonShellTranslations({
    common: {
      addOnRequired: "Потребен е add-on",
      availableAfterActivation: "Достапно по активирање на add-онот.",
      activating: "Се активира...",
      disabled: "Оневозможено",
      installDisabled: "Инсталацијата е оневозможена",
      installPending: "Инсталацијата е на чекање",
      installUnavailable: "Инсталацијата не е достапна",
      licenseInvalid: "Лиценцата е неважечка",
      licenseKey: "Лиценцен клуч",
      licenseKeyRequired: "Лиценцниот клуч е задолжителен.",
      licenseRequired: "Потребна е лиценца",
      licenseNeedsAttention: "Лиценцата бара внимание",
      invalidActivationInput: "Невалиден внес за активирање.",
      supportedInstallTargets: "Поддржани цели за инсталација: {providers}.",
    },
    product: {
      activate: "Активирај {product}",
      activation: "Активирање на {product}",
      ready: "Лиценцата е прифатена. Add-on {product} е подготвен.",
      selfHostedSuccess:
        "Лиценцата е прифатена. Инсталирај го приватниот пакет {product}, постави {env} и рестартирај го CMS за да го завршиш поставувањето.",
      pendingSuccess:
        "Лиценцата е прифатена. Инсталацијата на add-on {product} го чека deployment pipeline.",
      backTo: "Назад кон {product}",
      buyKey: "Купи лиценцен клуч за {product}",
      cannotInstall: "{product} не може да се инсталира",
      pendingInstallDescription:
        "Лиценцата е прифатена. Инсталирај го приватниот пакет {product}, постави {env} и повторно изгради или рестартирај го CMS за да го завршиш поставувањето.",
      installLocked: "Текот на инсталација за {product} е заклучен",
      licenseRequiredDescription:
        "Купи или внеси важечки лиценцен клуч за {product} за да го активираш овој платен add-on за ова CMS deployment.",
      notInstalledTitle: "Add-on {product} не е инсталиран",
      disabledTitle: "{product} е оневозможен",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Основа за платен commerce add-on и CMS shell.",
      activationDescription:
        "Активирањето ја врзува лиценцата со оваа CMS инсталација. Токените за инсталација на пакети се краткотрајни и CMS не ги чува.",
      notInstalledDescription:
        "Јавниот CMS shell е подготвен. Активирај ја лиценцата, инсталирај го приватниот Webshop add-on пакет и конфигурирај WEBSHOP_ADDON_MODULE пред да бидат достапни commerce функциите.",
      editShell: "Уреди shell",
      viewStorefront: "Прикажи storefront",
      setUp: "Постави Webshop",
      noShellTitle: "Сè уште нема Webshop shell",
      shellEntryDescription:
        "Креирај CMS запис што ги поседува slug-от на продавницата, SEO, статусот, видливоста и рутирањето.",
      createCmsShell: "Креирај CMS shell",
      publicPreview: "Јавен преглед",
      usesShellRenderer: "Го користи CMS shell renderer.",
      categories: "Webshop категории",
      dashboard: "Webshop контролна табла",
      categoryBridge: {
        readOnlyBadge: "Мост само за читање",
        description:
          "Управувањето со Webshop категории е достапно преку платениот add-on. Оваа CMS секција го одржува стабилен навигацискиот запис додека add-on-от ги контролира commerce податоците.",
        editExistingOnlyBadge: "Само уредување постоечки",
        unavailableBadge: "Мостот не е достапен",
        unavailableDescription:
          "Add-on мостот за категории не е достапен во моментов. Отвори Webshop управување за да ја провериш тековната состојба на add-on-от.",
        openManagement: "Отвори управување",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Платен add-on за дигитално лиценцирање производи што ги продаваат твоите клиенти.",
      activationDescription:
        "Активирањето го врзува овој платен License Server add-on со CMS инсталацијата. Твојот master license server останува авторитет за активирање.",
      notInstalledDescription:
        "Активирај ја лиценцата, инсталирај го приватниот License Server add-on пакет и конфигурирај LICENSE_SERVER_ADDON_MODULE пред да бидат достапни API-јата за лиценцирање.",
    },
    labels: {
      waitingForInstall: "Се чека инсталација на add-on",
      title: "Наслов",
      slug: "URL ознака",
      status: "Статус",
      category: "Категорија",
      products: "Производи",
      categories: "Категории",
      orders: "Нарачки",
      payments: "Плаќања",
      storefront: "Storefront",
      coupons: "Купони",
      settings: "Поставки",
      apiClients: "API клиенти",
      productTypes: "Типови производи",
      skus: "SKU-ови",
      licenses: "Лиценци",
      validationEvents: "Настани за валидација",
    },
  }),
  bs: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on je obavezan",
      availableAfterActivation: "Dostupno nakon aktivacije add-ona.",
      activating: "Aktiviranje...",
      disabled: "Onemogućeno",
      installDisabled: "Instalacija onemogućena",
      installPending: "Instalacija na čekanju",
      installUnavailable: "Instalacija nije dostupna",
      licenseInvalid: "Licenca nije važeća",
      licenseKey: "Licencni ključ",
      licenseKeyRequired: "Licencni ključ je obavezan.",
      licenseRequired: "Licenca je obavezna",
      licenseNeedsAttention: "Licenca zahtijeva pažnju",
      invalidActivationInput: "Nevažeći unos za aktivaciju.",
      supportedInstallTargets: "Podržana odredišta instalacije: {providers}.",
    },
    product: {
      activate: "Aktiviraj {product}",
      activation: "Aktivacija za {product}",
      ready: "Licenca prihvaćena. Add-on {product} je spreman.",
      selfHostedSuccess:
        "Licenca prihvaćena. Instaliraj privatni paket {product}, postavi {env} i restartuj CMS da završiš postavljanje.",
      pendingSuccess:
        "Licenca prihvaćena. Instalacija add-ona {product} čeka deployment pipeline.",
      backTo: "Nazad na {product}",
      buyKey: "Kupi licencni ključ za {product}",
      cannotInstall: "{product} se ne može instalirati",
      pendingInstallDescription:
        "Licenca je prihvaćena. Instaliraj privatni paket {product}, postavi {env} i ponovo izgradi ili restartuj CMS da završiš postavljanje.",
      installLocked: "Tok instalacije za {product} je zaključan",
      licenseRequiredDescription:
        "Kupi ili unesi važeći licencni ključ za {product} da aktiviraš ovaj plaćeni add-on za ovaj CMS deployment.",
      notInstalledTitle: "Add-on {product} nije instaliran",
      disabledTitle: "{product} je onemogućen",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Osnova plaćenog commerce add-ona i CMS shell.",
      activationDescription:
        "Aktivacija vezuje licencu za ovu CMS instalaciju. Tokeni za instalaciju paketa su kratkog vijeka i CMS ih ne čuva.",
      notInstalledDescription:
        "Javni CMS shell je spreman. Aktiviraj licencu, instaliraj privatni Webshop add-on paket i konfiguriši WEBSHOP_ADDON_MODULE prije nego što commerce funkcije budu dostupne.",
      editShell: "Uredi shell",
      viewStorefront: "Prikaži storefront",
      setUp: "Postavi Webshop",
      noShellTitle: "Webshop shell još ne postoji",
      shellEntryDescription:
        "Kreiraj CMS zapis koji posjeduje slug prodavnice, SEO, status, vidljivost i rutiranje.",
      createCmsShell: "Kreiraj CMS shell",
      publicPreview: "Javni pregled",
      usesShellRenderer: "Koristi CMS shell renderer.",
      categories: "Webshop kategorije",
      dashboard: "Webshop kontrolna tabla",
      categoryBridge: {
        readOnlyBadge: "Most samo za čitanje",
        description:
          "Upravljanje Webshop kategorijama dostupno je kroz plaćeni add-on. Ova CMS sekcija održava stabilan navigacijski zapis dok add-on kontroliše commerce podatke.",
        editExistingOnlyBadge: "Samo uređivanje postojećih",
        unavailableBadge: "Most nije dostupan",
        unavailableDescription:
          "Add-on most za kategorije trenutno nije dostupan. Otvori Webshop upravljanje da pregledaš trenutno stanje add-ona.",
        openManagement: "Otvori upravljanje",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Plaćeni add-on za digitalno licenciranje proizvoda koje tvoji klijenti prodaju.",
      activationDescription:
        "Aktivacija vezuje ovaj plaćeni License Server add-on za CMS instalaciju. Tvoj master license server ostaje autoritet za aktivaciju.",
      notInstalledDescription:
        "Aktiviraj licencu, instaliraj privatni License Server add-on paket i konfiguriši LICENSE_SERVER_ADDON_MODULE prije nego što API-ji za licenciranje budu dostupni.",
    },
    labels: {
      waitingForInstall: "Čeka se instalacija add-ona",
      title: "Naslov",
      slug: "URL oznaka",
      status: "Status",
      category: "Kategorija",
      products: "Proizvodi",
      categories: "Kategorije",
      orders: "Narudžbe",
      payments: "Plaćanja",
      storefront: "Storefront",
      coupons: "Kuponi",
      settings: "Postavke",
      apiClients: "API klijenti",
      productTypes: "Tipovi proizvoda",
      skus: "SKU-ovi",
      licenses: "Licence",
      validationEvents: "Događaji validacije",
    },
  }),
  sl: buildAddonShellTranslations({
    common: {
      addOnRequired: "Dodatek je obvezen",
      availableAfterActivation: "Na voljo po aktivaciji dodatka.",
      activating: "Aktiviranje...",
      disabled: "Onemogočeno",
      installDisabled: "Namestitev onemogočena",
      installPending: "Namestitev v teku",
      installUnavailable: "Namestitev ni na voljo",
      licenseInvalid: "Licenca ni veljavna",
      licenseKey: "Licenčni ključ",
      licenseKeyRequired: "Licenčni ključ je obvezen.",
      licenseRequired: "Licenca je obvezna",
      licenseNeedsAttention: "Licenca zahteva pozornost",
      invalidActivationInput: "Neveljaven vnos za aktivacijo.",
      supportedInstallTargets: "Podprti cilji namestitve: {providers}.",
    },
    product: {
      activate: "Aktiviraj {product}",
      activation: "Aktivacija {product}",
      ready: "Licenca sprejeta. Dodatek {product} je pripravljen.",
      selfHostedSuccess:
        "Licenca sprejeta. Namestite zasebni paket {product}, nastavite {env} in znova zaženite CMS za dokončanje nastavitve.",
      pendingSuccess:
        "Licenca sprejeta. Namestitev dodatka {product} čaka na uvedbeni pipeline.",
      backTo: "Nazaj na {product}",
      buyKey: "Kupi licenčni ključ za {product}",
      cannotInstall: "{product} ni mogoče namestiti",
      pendingInstallDescription:
        "Licenca je bila sprejeta. Namestite zasebni paket {product}, nastavite {env} in znova zgradite ali zaženite CMS za dokončanje nastavitve.",
      installLocked: "Namestitveni tok za {product} je zaklenjen",
      licenseRequiredDescription:
        "Kupite ali vnesite veljaven licenčni ključ za {product}, da aktivirate ta plačljivi dodatek za to CMS uvedbo.",
      notInstalledTitle: "Dodatek {product} ni nameščen",
      disabledTitle: "{product} je onemogočen",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Osnova plačljivega commerce dodatka in CMS shell.",
      activationDescription:
        "Aktivacija poveže licenco s to CMS namestitvijo. Žetoni za namestitev paketov so kratkotrajni in jih CMS ne shranjuje.",
      notInstalledDescription:
        "Javni CMS shell je pripravljen. Aktivirajte licenco, namestite zasebni paket dodatka Webshop in konfigurirajte WEBSHOP_ADDON_MODULE, preden so commerce funkcije na voljo.",
      editShell: "Uredi shell",
      viewStorefront: "Prikaži storefront",
      setUp: "Nastavi Webshop",
      noShellTitle: "Webshop shell še ne obstaja",
      shellEntryDescription:
        "Ustvarite CMS vnos, ki upravlja slug trgovine, SEO, stanje, vidnost in usmerjanje.",
      createCmsShell: "Ustvari CMS shell",
      publicPreview: "Javni predogled",
      usesShellRenderer: "Uporablja CMS shell renderer.",
      categories: "Webshop kategorije",
      dashboard: "Webshop nadzorna plošča",
      categoryBridge: {
        readOnlyBadge: "Most samo za branje",
        description:
          "Upravljanje Webshop kategorij je na voljo prek plačljivega dodatka. Ta CMS razdelek ohranja navigacijski vnos stabilen, medtem ko dodatek upravlja commerce podatke.",
        editExistingOnlyBadge: "Samo urejanje obstoječih",
        unavailableBadge: "Most ni na voljo",
        unavailableDescription:
          "Most kategorij dodatka trenutno ni na voljo. Odprite upravljanje Webshop, da pregledate trenutno stanje dodatka.",
        openManagement: "Odpri upravljanje",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Plačljiv dodatek za digitalno licenciranje izdelkov, ki jih prodajajo vaše stranke.",
      activationDescription:
        "Aktivacija poveže ta plačljivi dodatek License Server s CMS namestitvijo. Vaš master license server ostane avtoriteta za aktivacijo.",
      notInstalledDescription:
        "Aktivirajte licenco, namestite zasebni paket dodatka License Server in konfigurirajte LICENSE_SERVER_ADDON_MODULE, preden so API-ji za licenciranje na voljo.",
    },
    labels: {
      waitingForInstall: "Čakanje na namestitev dodatka",
      title: "Naslov",
      slug: "URL oznaka",
      status: "Stanje",
      category: "Kategorija",
      products: "Izdelki",
      categories: "Kategorije",
      orders: "Naročila",
      payments: "Plačila",
      storefront: "Storefront",
      coupons: "Kuponi",
      settings: "Nastavitve",
      apiClients: "API odjemalci",
      productTypes: "Vrste izdelkov",
      skus: "SKU-ji",
      licenses: "Licence",
      validationEvents: "Dogodki validacije",
    },
  }),
  ru: buildAddonShellTranslations({
    common: {
      addOnRequired: "Требуется дополнение",
      availableAfterActivation: "Доступно после активации дополнения.",
      activating: "Активация...",
      disabled: "Отключено",
      installDisabled: "Установка отключена",
      installPending: "Установка ожидает",
      installUnavailable: "Установка недоступна",
      licenseInvalid: "Лицензия недействительна",
      licenseKey: "Лицензионный ключ",
      licenseKeyRequired: "Требуется лицензионный ключ.",
      licenseRequired: "Требуется лицензия",
      licenseNeedsAttention: "Лицензия требует внимания",
      invalidActivationInput: "Недопустимые данные активации.",
      supportedInstallTargets: "Поддерживаемые цели установки: {providers}.",
    },
    product: {
      activate: "Активировать {product}",
      activation: "Активация {product}",
      ready: "Лицензия принята. Дополнение {product} готово.",
      selfHostedSuccess:
        "Лицензия принята. Установите приватный пакет {product}, задайте {env} и перезапустите CMS, чтобы завершить настройку.",
      pendingSuccess:
        "Лицензия принята. Установка дополнения {product} ожидает deployment pipeline.",
      backTo: "Назад к {product}",
      buyKey: "Купить лицензионный ключ {product}",
      cannotInstall: "{product} нельзя установить",
      pendingInstallDescription:
        "Лицензия принята. Установите приватный пакет {product}, задайте {env} и пересоберите или перезапустите CMS, чтобы завершить настройку.",
      installLocked: "Поток установки {product} заблокирован",
      licenseRequiredDescription:
        "Купите или введите действительный лицензионный ключ {product}, чтобы активировать это платное дополнение для данного развертывания CMS.",
      notInstalledTitle: "Дополнение {product} не установлено",
      disabledTitle: "{product} отключен",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Основа платного commerce-дополнения и CMS shell.",
      activationDescription:
        "Активация привязывает лицензию к этой установке CMS. Токены установки пакета краткоживущие и не сохраняются CMS.",
      notInstalledDescription:
        "Публичная CMS shell готова. Активируйте лицензию, установите приватный пакет дополнения Webshop и настройте WEBSHOP_ADDON_MODULE до доступности commerce-функций.",
      editShell: "Редактировать shell",
      viewStorefront: "Открыть storefront",
      setUp: "Настроить Webshop",
      noShellTitle: "Shell Webshop еще нет",
      shellEntryDescription:
        "Создайте запись CMS, которая управляет slug магазина, SEO, статусом, видимостью и маршрутизацией.",
      createCmsShell: "Создать CMS shell",
      publicPreview: "Публичный предпросмотр",
      usesShellRenderer: "Использует renderer CMS shell.",
      categories: "Категории Webshop",
      dashboard: "Панель Webshop",
      categoryBridge: {
        readOnlyBadge: "Мост только для чтения",
        description:
          "Управление категориями Webshop доступно через платное дополнение. Этот раздел CMS сохраняет навигационный пункт стабильным, пока дополнение управляет commerce-данными.",
        editExistingOnlyBadge: "Только редактирование существующих",
        unavailableBadge: "Мост недоступен",
        unavailableDescription:
          "Мост категорий дополнения сейчас недоступен. Откройте управление Webshop, чтобы проверить текущее состояние дополнения.",
        openManagement: "Открыть управление",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Платное дополнение для цифрового лицензирования продуктов, которые продают ваши клиенты.",
      activationDescription:
        "Активация привязывает это платное дополнение License Server к установке CMS. Ваш master license server остается центром активации.",
      notInstalledDescription:
        "Активируйте лицензию, установите приватный пакет дополнения License Server и настройте LICENSE_SERVER_ADDON_MODULE до доступности API лицензирования.",
    },
    labels: {
      waitingForInstall: "Ожидание установки дополнения",
      title: "Заголовок",
      slug: "URL-метка",
      status: "Статус",
      category: "Категория",
      products: "Продукты",
      categories: "Категории",
      orders: "Заказы",
      payments: "Платежи",
      storefront: "Storefront",
      coupons: "Купоны",
      settings: "Настройки",
      apiClients: "API-клиенты",
      productTypes: "Типы продуктов",
      skus: "SKU",
      licenses: "Лицензии",
      validationEvents: "События валидации",
    },
  }),
  hu: buildAddonShellTranslations({
    common: {
      addOnRequired: "Kiegészítő szükséges",
      availableAfterActivation: "A kiegészítő aktiválása után érhető el.",
      activating: "Aktiválás...",
      disabled: "Letiltva",
      installDisabled: "Telepítés letiltva",
      installPending: "Telepítés függőben",
      installUnavailable: "Telepítés nem érhető el",
      licenseInvalid: "Érvénytelen licenc",
      licenseKey: "Licenckulcs",
      licenseKeyRequired: "A licenckulcs kötelező.",
      licenseRequired: "Licenc szükséges",
      licenseNeedsAttention: "A licenc figyelmet igényel",
      invalidActivationInput: "Érvénytelen aktiválási adat.",
      supportedInstallTargets: "Támogatott telepítési célok: {providers}.",
    },
    product: {
      activate: "{product} aktiválása",
      activation: "{product} aktiválás",
      ready: "Licenc elfogadva. A {product} kiegészítő készen áll.",
      selfHostedSuccess:
        "Licenc elfogadva. Telepítse a privát {product} csomagot, állítsa be a(z) {env} értéket, majd indítsa újra a CMS-t a beállítás befejezéséhez.",
      pendingSuccess:
        "Licenc elfogadva. A {product} kiegészítő telepítése a deployment pipeline-ra vár.",
      backTo: "Vissza ide: {product}",
      buyKey: "{product} licenckulcs vásárlása",
      cannotInstall: "A {product} nem telepíthető",
      pendingInstallDescription:
        "A licenc elfogadva. Telepítse a privát {product} csomagot, állítsa be a(z) {env} értéket, majd építse újra vagy indítsa újra a CMS-t a beállítás befejezéséhez.",
      installLocked: "A {product} telepítési folyamata zárolva van",
      licenseRequiredDescription:
        "Vásároljon vagy adjon meg érvényes {product} licenckulcsot a fizetős kiegészítő aktiválásához ehhez a CMS telepítéshez.",
      notInstalledTitle: "A {product} kiegészítő nincs telepítve",
      disabledTitle: "A {product} le van tiltva",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Fizetős commerce kiegészítő alap és CMS shell.",
      activationDescription:
        "Az aktiválás a licencet ehhez a CMS telepítéshez köti. A csomagtelepítési tokenek rövid életűek, és a CMS nem tárolja őket.",
      notInstalledDescription:
        "A nyilvános CMS shell készen áll. Aktiválja a licencet, telepítse a privát Webshop kiegészítőcsomagot, és konfigurálja a WEBSHOP_ADDON_MODULE értéket, mielőtt a commerce funkciók elérhetők lesznek.",
      editShell: "Shell szerkesztése",
      viewStorefront: "Storefront megtekintése",
      setUp: "Webshop beállítása",
      noShellTitle: "Még nincs Webshop shell",
      shellEntryDescription:
        "Hozza létre azt a CMS bejegyzést, amely a bolt slugját, SEO-t, állapotot, láthatóságot és útválasztást kezeli.",
      createCmsShell: "CMS shell létrehozása",
      publicPreview: "Nyilvános előnézet",
      usesShellRenderer: "A CMS shell renderert használja.",
      categories: "Webshop kategóriák",
      dashboard: "Webshop vezérlőpult",
      categoryBridge: {
        readOnlyBadge: "Csak olvasható híd",
        description:
          "A Webshop kategóriakezelés a fizetős kiegészítőn keresztül érhető el. Ez a CMS szakasz stabilan tartja a navigációs bejegyzést, miközben a kiegészítő kezeli a commerce adatokat.",
        editExistingOnlyBadge: "Csak meglévők szerkesztése",
        unavailableBadge: "Híd nem érhető el",
        unavailableDescription:
          "A kiegészítő kategóriahídja jelenleg nem érhető el. Nyissa meg a Webshop kezelést az aktuális kiegészítőállapot ellenőrzéséhez.",
        openManagement: "Kezelés megnyitása",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Fizetős digitális licencelési kiegészítő az ügyfelei által értékesített termékekhez.",
      activationDescription:
        "Az aktiválás ezt a fizetős License Server kiegészítőt a CMS telepítéshez köti. A master license server marad az aktiválási hatóság.",
      notInstalledDescription:
        "Aktiválja a licencet, telepítse a privát License Server kiegészítőcsomagot, és konfigurálja a LICENSE_SERVER_ADDON_MODULE értéket, mielőtt a licencelési API-k elérhetők lesznek.",
    },
    labels: {
      waitingForInstall: "Várakozás a kiegészítő telepítésére",
      title: "Cím",
      slug: "URL-azonosító",
      status: "Állapot",
      category: "Kategória",
      products: "Termékek",
      categories: "Kategóriák",
      orders: "Rendelések",
      payments: "Fizetések",
      storefront: "Storefront",
      coupons: "Kuponok",
      settings: "Beállítások",
      apiClients: "API-kliensek",
      productTypes: "Terméktípusok",
      skus: "SKU-k",
      licenses: "Licencek",
      validationEvents: "Validációs események",
    },
  }),
  bg: buildAddonShellTranslations({
    common: {
      addOnRequired: "Необходима е добавка",
      availableAfterActivation: "Достъпно след активиране на добавката.",
      activating: "Активиране...",
      disabled: "Деактивирано",
      installDisabled: "Инсталацията е деактивирана",
      installPending: "Инсталацията чака",
      installUnavailable: "Инсталацията не е налична",
      licenseInvalid: "Лицензът е невалиден",
      licenseKey: "Лицензионен ключ",
      licenseKeyRequired: "Лицензионният ключ е задължителен.",
      licenseRequired: "Изисква се лиценз",
      licenseNeedsAttention: "Лицензът изисква внимание",
      invalidActivationInput: "Невалидни данни за активация.",
      supportedInstallTargets: "Поддържани цели за инсталация: {providers}.",
    },
    product: {
      activate: "Активирай {product}",
      activation: "Активация на {product}",
      ready: "Лицензът е приет. Добавката {product} е готова.",
      selfHostedSuccess:
        "Лицензът е приет. Инсталирайте частния пакет {product}, задайте {env} и рестартирайте CMS, за да завършите настройката.",
      pendingSuccess:
        "Лицензът е приет. Инсталацията на добавката {product} чака deployment pipeline.",
      backTo: "Назад към {product}",
      buyKey: "Купи лицензионен ключ за {product}",
      cannotInstall: "{product} не може да бъде инсталиран",
      pendingInstallDescription:
        "Лицензът е приет. Инсталирайте частния пакет {product}, задайте {env} и изградете отново или рестартирайте CMS, за да завършите настройката.",
      installLocked: "Инсталационният поток за {product} е заключен",
      licenseRequiredDescription:
        "Купете или въведете валиден лицензионен ключ за {product}, за да активирате тази платена добавка за това CMS внедряване.",
      notInstalledTitle: "Добавката {product} не е инсталирана",
      disabledTitle: "{product} е деактивиран",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Основа за платена commerce добавка и CMS shell.",
      activationDescription:
        "Активацията свързва лиценза с тази CMS инсталация. Токените за инсталиране на пакети са краткотрайни и не се съхраняват от CMS.",
      notInstalledDescription:
        "Публичният CMS shell е готов. Активирайте лиценза, инсталирайте частния пакет на добавката Webshop и конфигурирайте WEBSHOP_ADDON_MODULE, преди commerce функциите да са налични.",
      editShell: "Редактирай shell",
      viewStorefront: "Преглед на storefront",
      setUp: "Настрой Webshop",
      noShellTitle: "Все още няма Webshop shell",
      shellEntryDescription:
        "Създайте CMS запис, който управлява slug на магазина, SEO, статус, видимост и маршрутизиране.",
      createCmsShell: "Създай CMS shell",
      publicPreview: "Публичен преглед",
      usesShellRenderer: "Използва CMS shell renderer.",
      categories: "Webshop категории",
      dashboard: "Webshop табло",
      categoryBridge: {
        readOnlyBadge: "Мост само за четене",
        description:
          "Управлението на Webshop категории е достъпно чрез платената добавка. Тази CMS секция поддържа навигационния запис стабилен, докато добавката контролира commerce данните.",
        editExistingOnlyBadge: "Само редакция на съществуващи",
        unavailableBadge: "Мостът не е наличен",
        unavailableDescription:
          "Категорийният мост на добавката в момента не е наличен. Отворете управлението на Webshop, за да прегледате текущото състояние на добавката.",
        openManagement: "Отвори управление",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Платена добавка за цифрово лицензиране на продукти, които вашите клиенти продават.",
      activationDescription:
        "Активацията свързва тази платена добавка License Server с CMS инсталацията. Вашият master license server остава органът за активация.",
      notInstalledDescription:
        "Активирайте лиценза, инсталирайте частния пакет на добавката License Server и конфигурирайте LICENSE_SERVER_ADDON_MODULE, преди API-тата за лицензиране да са налични.",
    },
    labels: {
      waitingForInstall: "Изчаква се инсталация на добавката",
      title: "Заглавие",
      slug: "URL означение",
      status: "Статус",
      category: "Категория",
      products: "Продукти",
      categories: "Категории",
      orders: "Поръчки",
      payments: "Плащания",
      storefront: "Storefront",
      coupons: "Купони",
      settings: "Настройки",
      apiClients: "API клиенти",
      productTypes: "Типове продукти",
      skus: "SKU",
      licenses: "Лицензи",
      validationEvents: "Събития за валидация",
    },
  }),
  ja: buildAddonShellTranslations({
    common: {
      addOnRequired: "アドオンが必要です",
      availableAfterActivation: "アドオンの有効化後に利用できます。",
      activating: "有効化中...",
      disabled: "無効",
      installDisabled: "インストール無効",
      installPending: "インストール保留中",
      installUnavailable: "インストール不可",
      licenseInvalid: "ライセンスが無効です",
      licenseKey: "ライセンスキー",
      licenseKeyRequired: "ライセンスキーは必須です。",
      licenseRequired: "ライセンスが必要です",
      licenseNeedsAttention: "ライセンスの確認が必要です",
      invalidActivationInput: "有効化入力が無効です。",
      supportedInstallTargets: "対応インストール先: {providers}。",
    },
    product: {
      activate: "{product} を有効化",
      activation: "{product} の有効化",
      ready: "ライセンスが承認されました。{product} アドオンは準備完了です。",
      selfHostedSuccess:
        "ライセンスが承認されました。プライベート {product} パッケージをインストールし、{env} を設定して CMS を再起動すると設定が完了します。",
      pendingSuccess:
        "ライセンスが承認されました。{product} アドオンのインストールはデプロイパイプライン待ちです。",
      backTo: "{product} に戻る",
      buyKey: "{product} ライセンスキーを購入",
      cannotInstall: "{product} をインストールできません",
      pendingInstallDescription:
        "ライセンスが承認されました。プライベート {product} パッケージをインストールし、{env} を設定して CMS を再ビルドまたは再起動すると設定が完了します。",
      installLocked: "{product} のインストールフローはロックされています",
      licenseRequiredDescription:
        "この CMS デプロイでこの有料アドオンを有効化するには、有効な {product} ライセンスキーを購入または入力してください。",
      notInstalledTitle: "{product} アドオンはインストールされていません",
      disabledTitle: "{product} は無効です",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "有料コマースアドオンの基盤と CMS シェル。",
      activationDescription:
        "有効化によりライセンスがこの CMS インストールに紐づきます。パッケージインストールトークンは短期間のみ有効で、CMS には保存されません。",
      notInstalledDescription:
        "公開 CMS シェルは準備できています。コマース機能を利用する前に、ライセンスを有効化し、プライベート Webshop アドオンパッケージをインストールして WEBSHOP_ADDON_MODULE を設定してください。",
      editShell: "シェルを編集",
      viewStorefront: "ストアフロントを表示",
      setUp: "Webshop を設定",
      noShellTitle: "Webshop シェルはまだありません",
      shellEntryDescription:
        "ショップ slug、SEO、ステータス、表示設定、ルーティングを所有する CMS エントリを作成します。",
      createCmsShell: "CMS シェルを作成",
      publicPreview: "公開プレビュー",
      usesShellRenderer: "CMS シェルレンダラーを使用します。",
      categories: "Webshop カテゴリ",
      dashboard: "Webshop ダッシュボード",
      categoryBridge: {
        readOnlyBadge: "読み取り専用ブリッジ",
        description:
          "Webshop カテゴリ管理は有料アドオンから利用できます。この CMS セクションは、アドオンがコマースデータを管理する間もナビゲーション項目を安定させます。",
        editExistingOnlyBadge: "既存のみ編集",
        unavailableBadge: "ブリッジ利用不可",
        unavailableDescription:
          "アドオンのカテゴリブリッジは現在利用できません。Webshop 管理を開いて現在のアドオン状態を確認してください。",
        openManagement: "管理を開く",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "クライアントが販売する製品向けの有料デジタルライセンスアドオン。",
      activationDescription:
        "有効化により、この有料 License Server アドオンが CMS インストールに紐づきます。マスターライセンスサーバーは引き続き有効化権限を持ちます。",
      notInstalledDescription:
        "ライセンス API を利用する前に、ライセンスを有効化し、プライベート License Server アドオンパッケージをインストールして LICENSE_SERVER_ADDON_MODULE を設定してください。",
    },
    labels: {
      waitingForInstall: "アドオンのインストール待ち",
      title: "タイトル",
      slug: "URL識別子",
      status: "ステータス",
      category: "カテゴリ",
      products: "商品",
      categories: "カテゴリ",
      orders: "注文",
      payments: "支払い",
      storefront: "ストアフロント",
      coupons: "クーポン",
      settings: "設定",
      apiClients: "API クライアント",
      productTypes: "製品タイプ",
      skus: "SKU",
      licenses: "ライセンス",
      validationEvents: "検証イベント",
    },
  }),
  "zh-Hans": buildAddonShellTranslations({
    common: {
      addOnRequired: "需要插件",
      availableAfterActivation: "插件激活后可用。",
      activating: "正在激活...",
      disabled: "已禁用",
      installDisabled: "安装已禁用",
      installPending: "安装待处理",
      installUnavailable: "安装不可用",
      licenseInvalid: "许可证无效",
      licenseKey: "许可证密钥",
      licenseKeyRequired: "许可证密钥为必填项。",
      licenseRequired: "需要许可证",
      licenseNeedsAttention: "许可证需要处理",
      invalidActivationInput: "激活输入无效。",
      supportedInstallTargets: "支持的安装目标：{providers}。",
    },
    product: {
      activate: "激活 {product}",
      activation: "{product} 激活",
      ready: "许可证已接受。{product} 插件已就绪。",
      selfHostedSuccess:
        "许可证已接受。请安装私有 {product} 包，设置 {env}，并重启 CMS 以完成配置。",
      pendingSuccess: "许可证已接受。{product} 插件安装正在等待部署流水线。",
      backTo: "返回 {product}",
      buyKey: "购买 {product} 许可证密钥",
      cannotInstall: "无法安装 {product}",
      pendingInstallDescription:
        "许可证已接受。请安装私有 {product} 包，设置 {env}，并重新构建或重启 CMS 以完成配置。",
      installLocked: "{product} 安装流程已锁定",
      licenseRequiredDescription:
        "购买或输入有效的 {product} 许可证密钥，以便为此 CMS 部署激活该付费插件。",
      notInstalledTitle: "{product} 插件未安装",
      disabledTitle: "{product} 已禁用",
    },
    webshop: {
      name: "网店",
      description: "付费商务插件基础和 CMS 外壳。",
      activationDescription:
        "激活会将许可证绑定到此 CMS 安装。包安装令牌有效期很短，CMS 不会存储它们。",
      notInstalledDescription:
        "公共 CMS 外壳已准备好。请先激活许可证、安装私有 Webshop 插件包并配置 WEBSHOP_ADDON_MODULE，然后才能使用商务功能。",
      editShell: "编辑外壳",
      viewStorefront: "查看店面",
      setUp: "设置 Webshop",
      noShellTitle: "尚无 Webshop 外壳",
      shellEntryDescription:
        "创建拥有店铺 slug、SEO、状态、可见性和路由的 CMS 条目。",
      createCmsShell: "创建 CMS 外壳",
      publicPreview: "公开预览",
      usesShellRenderer: "使用 CMS 外壳渲染器。",
      categories: "Webshop 分类",
      dashboard: "Webshop 仪表板",
      categoryBridge: {
        readOnlyBadge: "只读桥接",
        description:
          "Webshop 分类管理通过付费插件提供。该 CMS 区域在插件控制商务数据时保持导航入口稳定。",
        editExistingOnlyBadge: "仅编辑现有项",
        unavailableBadge: "桥接不可用",
        unavailableDescription:
          "插件分类桥接当前不可用。请打开 Webshop 管理区查看当前插件状态。",
        openManagement: "打开管理",
      },
    },
    licenseServer: {
      name: "许可证服务器",
      description: "面向客户所售产品的付费数字许可证插件。",
      activationDescription:
        "激活会将此付费 License Server 插件绑定到 CMS 安装。您的主许可证服务器仍是激活授权方。",
      notInstalledDescription:
        "请激活许可证、安装私有 License Server 插件包并配置 LICENSE_SERVER_ADDON_MODULE，然后才能使用许可证 API。",
    },
    labels: {
      waitingForInstall: "等待插件安装",
      title: "标题",
      slug: "URL 标识",
      status: "状态",
      category: "分类",
      products: "产品",
      categories: "分类",
      orders: "订单",
      payments: "付款",
      storefront: "店面",
      coupons: "优惠券",
      settings: "设置",
      apiClients: "API 客户端",
      productTypes: "产品类型",
      skus: "SKU",
      licenses: "许可证",
      validationEvents: "验证事件",
    },
  }),
  "zh-Hant": buildAddonShellTranslations({
    common: {
      addOnRequired: "需要外掛",
      availableAfterActivation: "外掛啟用後可用。",
      activating: "正在啟用...",
      disabled: "已停用",
      installDisabled: "安裝已停用",
      installPending: "安裝待處理",
      installUnavailable: "安裝不可用",
      licenseInvalid: "授權無效",
      licenseKey: "授權金鑰",
      licenseKeyRequired: "授權金鑰為必填。",
      licenseRequired: "需要授權",
      licenseNeedsAttention: "授權需要處理",
      invalidActivationInput: "啟用輸入無效。",
      supportedInstallTargets: "支援的安裝目標：{providers}。",
    },
    product: {
      activate: "啟用 {product}",
      activation: "{product} 啟用",
      ready: "授權已接受。{product} 外掛已就緒。",
      selfHostedSuccess:
        "授權已接受。請安裝私有 {product} 套件，設定 {env}，並重新啟動 CMS 以完成設定。",
      pendingSuccess: "授權已接受。{product} 外掛安裝正在等待部署管線。",
      backTo: "返回 {product}",
      buyKey: "購買 {product} 授權金鑰",
      cannotInstall: "無法安裝 {product}",
      pendingInstallDescription:
        "授權已接受。請安裝私有 {product} 套件，設定 {env}，並重新建置或重新啟動 CMS 以完成設定。",
      installLocked: "{product} 安裝流程已鎖定",
      licenseRequiredDescription:
        "購買或輸入有效的 {product} 授權金鑰，以便為此 CMS 部署啟用該付費外掛。",
      notInstalledTitle: "{product} 外掛尚未安裝",
      disabledTitle: "{product} 已停用",
    },
    webshop: {
      name: "網店",
      description: "付費商務外掛基礎與 CMS 外殼。",
      activationDescription:
        "啟用會將授權綁定到此 CMS 安裝。套件安裝權杖有效期很短，CMS 不會儲存。",
      notInstalledDescription:
        "公開 CMS 外殼已準備好。請先啟用授權、安裝私有 Webshop 外掛套件並設定 WEBSHOP_ADDON_MODULE，才能使用商務功能。",
      editShell: "編輯外殼",
      viewStorefront: "查看店面",
      setUp: "設定 Webshop",
      noShellTitle: "尚無 Webshop 外殼",
      shellEntryDescription:
        "建立擁有商店 slug、SEO、狀態、可見性與路由的 CMS 項目。",
      createCmsShell: "建立 CMS 外殼",
      publicPreview: "公開預覽",
      usesShellRenderer: "使用 CMS 外殼渲染器。",
      categories: "Webshop 分類",
      dashboard: "Webshop 控制台",
      categoryBridge: {
        readOnlyBadge: "唯讀橋接",
        description:
          "Webshop 分類管理可透過付費外掛使用。此 CMS 區段會在外掛控制商務資料時保持導覽項目穩定。",
        editExistingOnlyBadge: "僅編輯現有項目",
        unavailableBadge: "橋接不可用",
        unavailableDescription:
          "外掛分類橋接目前不可用。請開啟 Webshop 管理區查看目前外掛狀態。",
        openManagement: "開啟管理",
      },
    },
    licenseServer: {
      name: "授權伺服器",
      description: "供客戶銷售產品使用的付費數位授權外掛。",
      activationDescription:
        "啟用會將此付費 License Server 外掛綁定到 CMS 安裝。您的主授權伺服器仍是啟用授權方。",
      notInstalledDescription:
        "請啟用授權、安裝私有 License Server 外掛套件並設定 LICENSE_SERVER_ADDON_MODULE，才能使用授權 API。",
    },
    labels: {
      waitingForInstall: "等待外掛安裝",
      title: "標題",
      slug: "URL 識別碼",
      status: "狀態",
      category: "分類",
      products: "產品",
      categories: "分類",
      orders: "訂單",
      payments: "付款",
      storefront: "店面",
      coupons: "優惠券",
      settings: "設定",
      apiClients: "API 用戶端",
      productTypes: "產品類型",
      skus: "SKU",
      licenses: "授權",
      validationEvents: "驗證事件",
    },
  }),
  ar: buildAddonShellTranslations({
    common: {
      addOnRequired: "إضافة مطلوبة",
      availableAfterActivation: "متاح بعد تفعيل الإضافة.",
      activating: "جار التفعيل...",
      disabled: "معطل",
      installDisabled: "التثبيت معطل",
      installPending: "التثبيت قيد الانتظار",
      installUnavailable: "التثبيت غير متاح",
      licenseInvalid: "الترخيص غير صالح",
      licenseKey: "مفتاح الترخيص",
      licenseKeyRequired: "مفتاح الترخيص مطلوب.",
      licenseRequired: "الترخيص مطلوب",
      licenseNeedsAttention: "الترخيص يحتاج إلى مراجعة",
      invalidActivationInput: "إدخال التفعيل غير صالح.",
      supportedInstallTargets: "أهداف التثبيت المدعومة: {providers}.",
    },
    product: {
      activate: "تفعيل {product}",
      activation: "تفعيل {product}",
      ready: "تم قبول الترخيص. إضافة {product} جاهزة.",
      selfHostedSuccess:
        "تم قبول الترخيص. ثبّت حزمة {product} الخاصة، واضبط {env}، ثم أعد تشغيل CMS لإكمال الإعداد.",
      pendingSuccess:
        "تم قبول الترخيص. تثبيت إضافة {product} ينتظر مسار النشر.",
      backTo: "العودة إلى {product}",
      buyKey: "شراء مفتاح ترخيص {product}",
      cannotInstall: "لا يمكن تثبيت {product}",
      pendingInstallDescription:
        "تم قبول الترخيص. ثبّت حزمة {product} الخاصة، واضبط {env}، ثم أعد بناء CMS أو تشغيله لإكمال الإعداد.",
      installLocked: "مسار تثبيت {product} مقفل",
      licenseRequiredDescription:
        "اشتر أو أدخل مفتاح ترخيص صالحًا لـ {product} لتفعيل هذه الإضافة المدفوعة لهذا نشر CMS.",
      notInstalledTitle: "إضافة {product} غير مثبتة",
      disabledTitle: "{product} معطل",
    },
    webshop: {
      name: "المتجر الإلكتروني",
      description: "أساس إضافة التجارة المدفوعة وواجهة CMS.",
      activationDescription:
        "يربط التفعيل الترخيص بتثبيت CMS هذا. رموز تثبيت الحزم قصيرة العمر ولا يخزنها CMS.",
      notInstalledDescription:
        "واجهة CMS العامة جاهزة. فعّل الترخيص وثبّت حزمة إضافة Webshop الخاصة واضبط WEBSHOP_ADDON_MODULE قبل توفر ميزات التجارة.",
      editShell: "تعديل الواجهة",
      viewStorefront: "عرض واجهة المتجر",
      setUp: "إعداد Webshop",
      noShellTitle: "لا توجد واجهة Webshop بعد",
      shellEntryDescription:
        "أنشئ إدخال CMS الذي يملك slug المتجر وSEO والحالة والرؤية والتوجيه.",
      createCmsShell: "إنشاء واجهة CMS",
      publicPreview: "معاينة عامة",
      usesShellRenderer: "يستخدم عارض واجهة CMS.",
      categories: "تصنيفات Webshop",
      dashboard: "لوحة Webshop",
      categoryBridge: {
        readOnlyBadge: "جسر للقراءة فقط",
        description:
          "إدارة تصنيفات Webshop متاحة عبر الإضافة المدفوعة. يحافظ قسم CMS هذا على ثبات عنصر التنقل بينما تتحكم الإضافة في بيانات التجارة.",
        editExistingOnlyBadge: "تعديل الموجود فقط",
        unavailableBadge: "الجسر غير متاح",
        unavailableDescription:
          "جسر تصنيفات الإضافة غير متاح الآن. افتح إدارة Webshop لمراجعة حالة الإضافة الحالية.",
        openManagement: "فتح الإدارة",
      },
    },
    licenseServer: {
      name: "خادم التراخيص",
      description: "إضافة مدفوعة للترخيص الرقمي للمنتجات التي يبيعها عملاؤك.",
      activationDescription:
        "يربط التفعيل إضافة License Server المدفوعة بتثبيت CMS. يبقى master license server سلطة التفعيل.",
      notInstalledDescription:
        "فعّل الترخيص وثبّت حزمة إضافة License Server الخاصة واضبط LICENSE_SERVER_ADDON_MODULE قبل توفر واجهات API للترخيص.",
    },
    labels: {
      waitingForInstall: "انتظار تثبيت الإضافة",
      title: "العنوان",
      slug: "معرّف URL",
      status: "الحالة",
      category: "التصنيف",
      products: "المنتجات",
      categories: "التصنيفات",
      orders: "الطلبات",
      payments: "المدفوعات",
      storefront: "واجهة المتجر",
      coupons: "القسائم",
      settings: "الإعدادات",
      apiClients: "عملاء API",
      productTypes: "أنواع المنتجات",
      skus: "SKU",
      licenses: "التراخيص",
      validationEvents: "أحداث التحقق",
    },
  }),
  id: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on diperlukan",
      availableAfterActivation: "Tersedia setelah add-on diaktifkan.",
      activating: "Mengaktifkan...",
      disabled: "Dinonaktifkan",
      installDisabled: "Instalasi dinonaktifkan",
      installPending: "Instalasi tertunda",
      installUnavailable: "Instalasi tidak tersedia",
      licenseInvalid: "Lisensi tidak valid",
      licenseKey: "Kunci lisensi",
      licenseKeyRequired: "Kunci lisensi wajib diisi.",
      licenseRequired: "Lisensi diperlukan",
      licenseNeedsAttention: "Lisensi perlu diperiksa",
      invalidActivationInput: "Input aktivasi tidak valid.",
      supportedInstallTargets: "Target instalasi yang didukung: {providers}.",
    },
    product: {
      activate: "Aktifkan {product}",
      activation: "Aktivasi {product}",
      ready: "Lisensi diterima. Add-on {product} siap.",
      selfHostedSuccess:
        "Lisensi diterima. Instal paket privat {product}, atur {env}, dan mulai ulang CMS untuk menyelesaikan konfigurasi.",
      pendingSuccess:
        "Lisensi diterima. Instalasi add-on {product} menunggu pipeline deployment.",
      backTo: "Kembali ke {product}",
      buyKey: "Beli kunci lisensi {product}",
      cannotInstall: "{product} tidak dapat diinstal",
      pendingInstallDescription:
        "Lisensi diterima. Instal paket privat {product}, atur {env}, lalu build ulang atau mulai ulang CMS untuk menyelesaikan konfigurasi.",
      installLocked: "Alur instalasi {product} terkunci",
      licenseRequiredDescription:
        "Beli atau masukkan kunci lisensi {product} yang valid untuk mengaktifkan add-on berbayar ini pada deployment CMS ini.",
      notInstalledTitle: "Add-on {product} belum diinstal",
      disabledTitle: "{product} dinonaktifkan",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Fondasi add-on commerce berbayar dan shell CMS.",
      activationDescription:
        "Aktivasi mengikat lisensi ke instalasi CMS ini. Token instalasi paket berumur pendek dan tidak disimpan oleh CMS.",
      notInstalledDescription:
        "Shell CMS publik siap. Aktifkan lisensi, instal paket add-on Webshop privat, dan konfigurasi WEBSHOP_ADDON_MODULE sebelum fitur commerce tersedia.",
      editShell: "Edit shell",
      viewStorefront: "Lihat storefront",
      setUp: "Siapkan Webshop",
      noShellTitle: "Belum ada shell Webshop",
      shellEntryDescription:
        "Buat entri CMS yang memiliki slug toko, SEO, status, visibilitas, dan routing.",
      createCmsShell: "Buat shell CMS",
      publicPreview: "Pratinjau publik",
      usesShellRenderer: "Menggunakan renderer shell CMS.",
      categories: "Kategori Webshop",
      dashboard: "Dasbor Webshop",
      categoryBridge: {
        readOnlyBadge: "Jembatan hanya-baca",
        description:
          "Manajemen kategori Webshop tersedia melalui add-on berbayar. Bagian CMS ini menjaga entri navigasi tetap stabil saat add-on mengontrol data commerce.",
        editExistingOnlyBadge: "Edit yang ada saja",
        unavailableBadge: "Jembatan tidak tersedia",
        unavailableDescription:
          "Jembatan kategori add-on saat ini tidak tersedia. Buka manajemen Webshop untuk meninjau status add-on terkini.",
        openManagement: "Buka manajemen",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Add-on lisensi digital berbayar untuk produk yang dijual klien Anda.",
      activationDescription:
        "Aktivasi mengikat add-on License Server berbayar ini ke instalasi CMS. Master license server Anda tetap menjadi otoritas aktivasi.",
      notInstalledDescription:
        "Aktifkan lisensi, instal paket add-on License Server privat, dan konfigurasi LICENSE_SERVER_ADDON_MODULE sebelum API lisensi tersedia.",
    },
    labels: {
      waitingForInstall: "Menunggu instalasi add-on",
      title: "Judul",
      slug: "Penanda URL",
      status: "Status",
      category: "Kategori",
      products: "Produk",
      categories: "Kategori",
      orders: "Pesanan",
      payments: "Pembayaran",
      storefront: "Storefront",
      coupons: "Kupon",
      settings: "Pengaturan",
      apiClients: "Klien API",
      productTypes: "Jenis produk",
      skus: "SKU",
      licenses: "Lisensi",
      validationEvents: "Peristiwa validasi",
    },
  }),
  cs: buildAddonShellTranslations({
    common: {
      addOnRequired: "Vyžadován doplněk",
      availableAfterActivation: "Dostupné po aktivaci doplňku.",
      activating: "Aktivace...",
      disabled: "Zakázáno",
      installDisabled: "Instalace zakázána",
      installPending: "Instalace čeká",
      installUnavailable: "Instalace není dostupná",
      licenseInvalid: "Licence je neplatná",
      licenseKey: "Licenční klíč",
      licenseKeyRequired: "Licenční klíč je povinný.",
      licenseRequired: "Licence je povinná",
      licenseNeedsAttention: "Licence vyžaduje pozornost",
      invalidActivationInput: "Neplatný aktivační vstup.",
      supportedInstallTargets: "Podporované cíle instalace: {providers}.",
    },
    product: {
      activate: "Aktivovat {product}",
      activation: "Aktivace {product}",
      ready: "Licence přijata. Doplněk {product} je připraven.",
      selfHostedSuccess:
        "Licence přijata. Nainstalujte privátní balíček {product}, nastavte {env} a restartujte CMS pro dokončení nastavení.",
      pendingSuccess:
        "Licence přijata. Instalace doplňku {product} čeká na deployment pipeline.",
      backTo: "Zpět na {product}",
      buyKey: "Koupit licenční klíč {product}",
      cannotInstall: "{product} nelze nainstalovat",
      pendingInstallDescription:
        "Licence byla přijata. Nainstalujte privátní balíček {product}, nastavte {env} a znovu sestavte nebo restartujte CMS pro dokončení nastavení.",
      installLocked: "Instalační tok {product} je uzamčen",
      licenseRequiredDescription:
        "Kupte nebo zadejte platný licenční klíč {product}, abyste aktivovali tento placený doplněk pro toto nasazení CMS.",
      notInstalledTitle: "Doplněk {product} není nainstalován",
      disabledTitle: "{product} je zakázán",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Základ placeného commerce doplňku a CMS shell.",
      activationDescription:
        "Aktivace propojí licenci s touto instalací CMS. Tokeny pro instalaci balíčků jsou krátkodobé a CMS je neukládá.",
      notInstalledDescription:
        "Veřejný CMS shell je připraven. Aktivujte licenci, nainstalujte privátní balíček doplňku Webshop a nakonfigurujte WEBSHOP_ADDON_MODULE před dostupností commerce funkcí.",
      editShell: "Upravit shell",
      viewStorefront: "Zobrazit storefront",
      setUp: "Nastavit Webshop",
      noShellTitle: "Zatím žádný Webshop shell",
      shellEntryDescription:
        "Vytvořte CMS záznam, který vlastní slug obchodu, SEO, stav, viditelnost a směrování.",
      createCmsShell: "Vytvořit CMS shell",
      publicPreview: "Veřejný náhled",
      usesShellRenderer: "Používá renderer CMS shell.",
      categories: "Kategorie Webshop",
      dashboard: "Panel Webshop",
      categoryBridge: {
        readOnlyBadge: "Most pouze pro čtení",
        description:
          "Správa kategorií Webshop je dostupná přes placený doplněk. Tato sekce CMS udržuje navigační položku stabilní, zatímco doplněk řídí commerce data.",
        editExistingOnlyBadge: "Upravit pouze existující",
        unavailableBadge: "Most není dostupný",
        unavailableDescription:
          "Kategorický most doplňku nyní není dostupný. Otevřete správu Webshop pro kontrolu aktuálního stavu doplňku.",
        openManagement: "Otevřít správu",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Placený doplněk digitálního licencování pro produkty prodávané vašimi klienty.",
      activationDescription:
        "Aktivace propojí tento placený doplněk License Server s instalací CMS. Váš master license server zůstává autoritou aktivace.",
      notInstalledDescription:
        "Aktivujte licenci, nainstalujte privátní balíček doplňku License Server a nakonfigurujte LICENSE_SERVER_ADDON_MODULE před dostupností licenčních API.",
    },
    labels: {
      waitingForInstall: "Čekání na instalaci doplňku",
      title: "Název",
      slug: "URL označení",
      status: "Stav",
      category: "Kategorie",
      products: "Produkty",
      categories: "Kategorie",
      orders: "Objednávky",
      payments: "Platby",
      storefront: "Storefront",
      coupons: "Kupóny",
      settings: "Nastavení",
      apiClients: "API klienti",
      productTypes: "Typy produktů",
      skus: "SKU",
      licenses: "Licence",
      validationEvents: "Validační události",
    },
  }),
  ro: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on necesar",
      availableAfterActivation: "Disponibil după activarea add-onului.",
      activating: "Se activează...",
      disabled: "Dezactivat",
      installDisabled: "Instalare dezactivată",
      installPending: "Instalare în așteptare",
      installUnavailable: "Instalare indisponibilă",
      licenseInvalid: "Licență invalidă",
      licenseKey: "Cheie de licență",
      licenseKeyRequired: "Cheia de licență este obligatorie.",
      licenseRequired: "Licență obligatorie",
      licenseNeedsAttention: "Licența necesită atenție",
      invalidActivationInput: "Date de activare invalide.",
      supportedInstallTargets: "Ținte de instalare acceptate: {providers}.",
    },
    product: {
      activate: "Activează {product}",
      activation: "Activare {product}",
      ready: "Licență acceptată. Add-onul {product} este pregătit.",
      selfHostedSuccess:
        "Licență acceptată. Instalați pachetul privat {product}, setați {env} și reporniți CMS-ul pentru a finaliza configurarea.",
      pendingSuccess:
        "Licență acceptată. Instalarea add-onului {product} așteaptă pipeline-ul de deployment.",
      backTo: "Înapoi la {product}",
      buyKey: "Cumpără cheia de licență {product}",
      cannotInstall: "{product} nu poate fi instalat",
      pendingInstallDescription:
        "Licența a fost acceptată. Instalați pachetul privat {product}, setați {env} și reconstruiți sau reporniți CMS-ul pentru a finaliza configurarea.",
      installLocked: "Fluxul de instalare {product} este blocat",
      licenseRequiredDescription:
        "Cumpărați sau introduceți o cheie de licență {product} validă pentru a activa acest add-on plătit pentru această implementare CMS.",
      notInstalledTitle: "Add-onul {product} nu este instalat",
      disabledTitle: "{product} este dezactivat",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Fundația add-onului commerce plătit și shell CMS.",
      activationDescription:
        "Activarea leagă licența de această instalare CMS. Tokenurile de instalare a pachetelor au durată scurtă și nu sunt stocate de CMS.",
      notInstalledDescription:
        "Shell-ul CMS public este pregătit. Activați licența, instalați pachetul privat al add-onului Webshop și configurați WEBSHOP_ADDON_MODULE înainte ca funcțiile commerce să fie disponibile.",
      editShell: "Editează shell",
      viewStorefront: "Vezi storefront",
      setUp: "Configurează Webshop",
      noShellTitle: "Încă nu există shell Webshop",
      shellEntryDescription:
        "Creați intrarea CMS care deține slug-ul magazinului, SEO, statusul, vizibilitatea și rutarea.",
      createCmsShell: "Creează shell CMS",
      publicPreview: "Previzualizare publică",
      usesShellRenderer: "Folosește rendererul shell-ului CMS.",
      categories: "Categorii Webshop",
      dashboard: "Panou Webshop",
      categoryBridge: {
        readOnlyBadge: "Punte doar-citire",
        description:
          "Gestionarea categoriilor Webshop este disponibilă prin add-onul plătit. Această secțiune CMS păstrează stabilă intrarea de navigare în timp ce add-onul controlează datele commerce.",
        editExistingOnlyBadge: "Editează doar existente",
        unavailableBadge: "Punte indisponibilă",
        unavailableDescription:
          "Puntea de categorii a add-onului nu este disponibilă acum. Deschideți administrarea Webshop pentru a verifica starea curentă a add-onului.",
        openManagement: "Deschide administrarea",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Add-on plătit de licențiere digitală pentru produsele vândute de clienții dvs.",
      activationDescription:
        "Activarea leagă acest add-on License Server plătit de instalarea CMS. Master license server rămâne autoritatea de activare.",
      notInstalledDescription:
        "Activați licența, instalați pachetul privat al add-onului License Server și configurați LICENSE_SERVER_ADDON_MODULE înainte ca API-urile de licențiere să fie disponibile.",
    },
    labels: {
      waitingForInstall: "Se așteaptă instalarea add-onului",
      title: "Titlu",
      slug: "Identificator URL",
      status: "Status",
      category: "Categorie",
      products: "Produse",
      categories: "Categorii",
      orders: "Comenzi",
      payments: "Plăți",
      storefront: "Storefront",
      coupons: "Cupoane",
      settings: "Setări",
      apiClients: "Clienți API",
      productTypes: "Tipuri de produse",
      skus: "SKU-uri",
      licenses: "Licențe",
      validationEvents: "Evenimente de validare",
    },
  }),
  el: buildAddonShellTranslations({
    common: {
      addOnRequired: "Απαιτείται πρόσθετο",
      availableAfterActivation:
        "Διαθέσιμο μετά την ενεργοποίηση του πρόσθετου.",
      activating: "Ενεργοποίηση...",
      disabled: "Απενεργοποιημένο",
      installDisabled: "Η εγκατάσταση είναι απενεργοποιημένη",
      installPending: "Η εγκατάσταση εκκρεμεί",
      installUnavailable: "Η εγκατάσταση δεν είναι διαθέσιμη",
      licenseInvalid: "Η άδεια δεν είναι έγκυρη",
      licenseKey: "Κλειδί άδειας",
      licenseKeyRequired: "Το κλειδί άδειας είναι υποχρεωτικό.",
      licenseRequired: "Απαιτείται άδεια",
      licenseNeedsAttention: "Η άδεια χρειάζεται προσοχή",
      invalidActivationInput: "Μη έγκυρα δεδομένα ενεργοποίησης.",
      supportedInstallTargets:
        "Υποστηριζόμενοι στόχοι εγκατάστασης: {providers}.",
    },
    product: {
      activate: "Ενεργοποίηση {product}",
      activation: "Ενεργοποίηση {product}",
      ready: "Η άδεια έγινε αποδεκτή. Το πρόσθετο {product} είναι έτοιμο.",
      selfHostedSuccess:
        "Η άδεια έγινε αποδεκτή. Εγκαταστήστε το ιδιωτικό πακέτο {product}, ορίστε {env} και επανεκκινήστε το CMS για να ολοκληρωθεί η ρύθμιση.",
      pendingSuccess:
        "Η άδεια έγινε αποδεκτή. Η εγκατάσταση του πρόσθετου {product} περιμένει το deployment pipeline.",
      backTo: "Πίσω στο {product}",
      buyKey: "Αγορά κλειδιού άδειας {product}",
      cannotInstall: "Δεν είναι δυνατή η εγκατάσταση του {product}",
      pendingInstallDescription:
        "Η άδεια έγινε αποδεκτή. Εγκαταστήστε το ιδιωτικό πακέτο {product}, ορίστε {env} και αναδομήστε ή επανεκκινήστε το CMS για να ολοκληρωθεί η ρύθμιση.",
      installLocked: "Η ροή εγκατάστασης του {product} είναι κλειδωμένη",
      licenseRequiredDescription:
        "Αγοράστε ή εισαγάγετε έγκυρο κλειδί άδειας {product} για να ενεργοποιήσετε αυτό το πληρωμένο πρόσθετο για αυτήν την εγκατάσταση CMS.",
      notInstalledTitle: "Το πρόσθετο {product} δεν είναι εγκατεστημένο",
      disabledTitle: "Το {product} είναι απενεργοποιημένο",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Βάση πληρωμένου commerce πρόσθετου και CMS shell.",
      activationDescription:
        "Η ενεργοποίηση συνδέει την άδεια με αυτήν την εγκατάσταση CMS. Τα token εγκατάστασης πακέτων έχουν μικρή διάρκεια και δεν αποθηκεύονται από το CMS.",
      notInstalledDescription:
        "Το δημόσιο CMS shell είναι έτοιμο. Ενεργοποιήστε την άδεια, εγκαταστήστε το ιδιωτικό πακέτο πρόσθετου Webshop και διαμορφώστε το WEBSHOP_ADDON_MODULE πριν διατεθούν οι commerce λειτουργίες.",
      editShell: "Επεξεργασία shell",
      viewStorefront: "Προβολή storefront",
      setUp: "Ρύθμιση Webshop",
      noShellTitle: "Δεν υπάρχει ακόμη Webshop shell",
      shellEntryDescription:
        "Δημιουργήστε την εγγραφή CMS που κατέχει το slug καταστήματος, SEO, κατάσταση, ορατότητα και δρομολόγηση.",
      createCmsShell: "Δημιουργία CMS shell",
      publicPreview: "Δημόσια προεπισκόπηση",
      usesShellRenderer: "Χρησιμοποιεί τον CMS shell renderer.",
      categories: "Κατηγορίες Webshop",
      dashboard: "Πίνακας Webshop",
      categoryBridge: {
        readOnlyBadge: "Γέφυρα μόνο για ανάγνωση",
        description:
          "Η διαχείριση κατηγοριών Webshop είναι διαθέσιμη μέσω του πληρωμένου πρόσθετου. Αυτή η ενότητα CMS κρατά σταθερή την εγγραφή πλοήγησης ενώ το πρόσθετο ελέγχει τα commerce δεδομένα.",
        editExistingOnlyBadge: "Επεξεργασία μόνο υπαρχόντων",
        unavailableBadge: "Η γέφυρα δεν είναι διαθέσιμη",
        unavailableDescription:
          "Η γέφυρα κατηγοριών του πρόσθετου δεν είναι διαθέσιμη τώρα. Ανοίξτε τη διαχείριση Webshop για να ελέγξετε την τρέχουσα κατάσταση του πρόσθετου.",
        openManagement: "Άνοιγμα διαχείρισης",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Πληρωμένο πρόσθετο ψηφιακής αδειοδότησης για προϊόντα που πωλούν οι πελάτες σας.",
      activationDescription:
        "Η ενεργοποίηση συνδέει αυτό το πληρωμένο πρόσθετο License Server με την εγκατάσταση CMS. Ο master license server παραμένει η αρχή ενεργοποίησης.",
      notInstalledDescription:
        "Ενεργοποιήστε την άδεια, εγκαταστήστε το ιδιωτικό πακέτο πρόσθετου License Server και διαμορφώστε το LICENSE_SERVER_ADDON_MODULE πριν διατεθούν τα API αδειοδότησης.",
    },
    labels: {
      waitingForInstall: "Αναμονή εγκατάστασης πρόσθετου",
      title: "Τίτλος",
      slug: "Αναγνωριστικό URL",
      status: "Κατάσταση",
      category: "Κατηγορία",
      products: "Προϊόντα",
      categories: "Κατηγορίες",
      orders: "Παραγγελίες",
      payments: "Πληρωμές",
      storefront: "Storefront",
      coupons: "Κουπόνια",
      settings: "Ρυθμίσεις",
      apiClients: "Πελάτες API",
      productTypes: "Τύποι προϊόντων",
      skus: "SKU",
      licenses: "Άδειες",
      validationEvents: "Συμβάντα επικύρωσης",
    },
  }),
  da: buildAddonShellTranslations({
    common: {
      addOnRequired: "Add-on påkrævet",
      availableAfterActivation: "Tilgængelig efter aktivering af add-on.",
      activating: "Aktiverer...",
      disabled: "Deaktiveret",
      installDisabled: "Installation deaktiveret",
      installPending: "Installation afventer",
      installUnavailable: "Installation ikke tilgængelig",
      licenseInvalid: "Licens ugyldig",
      licenseKey: "Licensnøgle",
      licenseKeyRequired: "Licensnøgle er påkrævet.",
      licenseRequired: "Licens påkrævet",
      licenseNeedsAttention: "Licensen kræver opmærksomhed",
      invalidActivationInput: "Ugyldigt aktiveringsinput.",
      supportedInstallTargets: "Understøttede installationsmål: {providers}.",
    },
    product: {
      activate: "Aktivér {product}",
      activation: "{product}-aktivering",
      ready: "Licens accepteret. {product}-add-on er klar.",
      selfHostedSuccess:
        "Licens accepteret. Installer den private {product}-pakke, angiv {env}, og genstart CMS for at afslutte opsætningen.",
      pendingSuccess:
        "Licens accepteret. Installation af {product}-add-on afventer deployment-pipelinen.",
      backTo: "Tilbage til {product}",
      buyKey: "Køb {product}-licensnøgle",
      cannotInstall: "{product} kan ikke installeres",
      pendingInstallDescription:
        "Licensen blev accepteret. Installer den private {product}-pakke, angiv {env}, og byg eller genstart CMS for at afslutte opsætningen.",
      installLocked: "Installationsflow for {product} er låst",
      licenseRequiredDescription:
        "Køb eller indtast en gyldig {product}-licensnøgle for at aktivere denne betalte add-on til denne CMS-udrulning.",
      notInstalledTitle: "{product}-add-on er ikke installeret",
      disabledTitle: "{product} er deaktiveret",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Fundament for betalt commerce-add-on og CMS-shell.",
      activationDescription:
        "Aktivering binder licensen til denne CMS-installation. Pakkeinstallationstokens er kortlivede og gemmes ikke af CMS.",
      notInstalledDescription:
        "Den offentlige CMS-shell er klar. Aktivér licensen, installer den private Webshop-add-onpakke, og konfigurer WEBSHOP_ADDON_MODULE, før commerce-funktioner er tilgængelige.",
      editShell: "Rediger shell",
      viewStorefront: "Vis storefront",
      setUp: "Opsæt Webshop",
      noShellTitle: "Ingen Webshop-shell endnu",
      shellEntryDescription:
        "Opret CMS-posten, der ejer butiksslug, SEO, status, synlighed og routing.",
      createCmsShell: "Opret CMS-shell",
      publicPreview: "Offentlig forhåndsvisning",
      usesShellRenderer: "Bruger CMS-shell-rendereren.",
      categories: "Webshop-kategorier",
      dashboard: "Webshop-dashboard",
      categoryBridge: {
        readOnlyBadge: "Skrivebeskyttet bro",
        description:
          "Webshop-kategoristyring er tilgængelig via den betalte add-on. Denne CMS-sektion holder navigationsposten stabil, mens add-onen styrer commerce-data.",
        editExistingOnlyBadge: "Rediger kun eksisterende",
        unavailableBadge: "Bro ikke tilgængelig",
        unavailableDescription:
          "Add-onens kategoribro er ikke tilgængelig lige nu. Åbn Webshop-administration for at gennemgå den aktuelle add-onstatus.",
        openManagement: "Åbn administration",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Betalt digital licens-add-on til produkter, som dine kunder sælger.",
      activationDescription:
        "Aktivering binder denne betalte License Server-add-on til CMS-installationen. Din master license server forbliver aktiveringsautoriteten.",
      notInstalledDescription:
        "Aktivér licensen, installer den private License Server-add-onpakke, og konfigurer LICENSE_SERVER_ADDON_MODULE, før licens-API'er er tilgængelige.",
    },
    labels: {
      waitingForInstall: "Venter på add-on-installation",
      title: "Titel",
      slug: "URL-id",
      status: "Status",
      category: "Kategori",
      products: "Produkter",
      categories: "Kategorier",
      orders: "Ordrer",
      payments: "Betalinger",
      storefront: "Storefront",
      coupons: "Kuponer",
      settings: "Indstillinger",
      apiClients: "API-klienter",
      productTypes: "Produkttyper",
      skus: "SKU'er",
      licenses: "Licenser",
      validationEvents: "Valideringshændelser",
    },
  }),
  sv: buildAddonShellTranslations({
    common: {
      addOnRequired: "Tillägg krävs",
      availableAfterActivation: "Tillgängligt efter aktivering av tillägget.",
      activating: "Aktiverar...",
      disabled: "Inaktiverad",
      installDisabled: "Installation inaktiverad",
      installPending: "Installation väntar",
      installUnavailable: "Installation inte tillgänglig",
      licenseInvalid: "Licensen är ogiltig",
      licenseKey: "Licensnyckel",
      licenseKeyRequired: "Licensnyckel krävs.",
      licenseRequired: "Licens krävs",
      licenseNeedsAttention: "Licensen behöver uppmärksamhet",
      invalidActivationInput: "Ogiltig aktiveringsinmatning.",
      supportedInstallTargets: "Installationsmål som stöds: {providers}.",
    },
    product: {
      activate: "Aktivera {product}",
      activation: "{product}-aktivering",
      ready: "Licens accepterad. {product}-tillägget är redo.",
      selfHostedSuccess:
        "Licens accepterad. Installera det privata {product}-paketet, ange {env} och starta om CMS för att slutföra konfigurationen.",
      pendingSuccess:
        "Licens accepterad. Installationen av {product}-tillägget väntar på deployment-pipelinen.",
      backTo: "Tillbaka till {product}",
      buyKey: "Köp {product}-licensnyckel",
      cannotInstall: "{product} kan inte installeras",
      pendingInstallDescription:
        "Licensen accepterades. Installera det privata {product}-paketet, ange {env} och bygg om eller starta om CMS för att slutföra konfigurationen.",
      installLocked: "Installationsflödet för {product} är låst",
      licenseRequiredDescription:
        "Köp eller ange en giltig {product}-licensnyckel för att aktivera detta betalda tillägg för denna CMS-distribution.",
      notInstalledTitle: "{product}-tillägget är inte installerat",
      disabledTitle: "{product} är inaktiverad",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Grund för betalt commerce-tillägg och CMS-shell.",
      activationDescription:
        "Aktivering binder licensen till denna CMS-installation. Paketinstallationstokens är kortlivade och lagras inte av CMS.",
      notInstalledDescription:
        "Det offentliga CMS-skalet är redo. Aktivera licensen, installera det privata Webshop-tilläggspaketet och konfigurera WEBSHOP_ADDON_MODULE innan commerce-funktioner är tillgängliga.",
      editShell: "Redigera shell",
      viewStorefront: "Visa storefront",
      setUp: "Konfigurera Webshop",
      noShellTitle: "Inget Webshop-shell ännu",
      shellEntryDescription:
        "Skapa CMS-posten som äger butikens slug, SEO, status, synlighet och routing.",
      createCmsShell: "Skapa CMS-shell",
      publicPreview: "Offentlig förhandsvisning",
      usesShellRenderer: "Använder CMS-shell-renderaren.",
      categories: "Webshop-kategorier",
      dashboard: "Webshop-panel",
      categoryBridge: {
        readOnlyBadge: "Skrivskyddad brygga",
        description:
          "Webshop-kategorihantering är tillgänglig via det betalda tillägget. Denna CMS-sektion håller navigationsposten stabil medan tillägget styr commerce-data.",
        editExistingOnlyBadge: "Redigera endast befintliga",
        unavailableBadge: "Brygga ej tillgänglig",
        unavailableDescription:
          "Tilläggets kategoribrygga är inte tillgänglig just nu. Öppna Webshop-hantering för att granska aktuell tilläggsstatus.",
        openManagement: "Öppna hantering",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Betalt tillägg för digital licensiering av produkter som dina kunder säljer.",
      activationDescription:
        "Aktivering binder detta betalda License Server-tillägg till CMS-installationen. Din master license server förblir aktiveringsauktoriteten.",
      notInstalledDescription:
        "Aktivera licensen, installera det privata License Server-tilläggspaketet och konfigurera LICENSE_SERVER_ADDON_MODULE innan licensierings-API:er är tillgängliga.",
    },
    labels: {
      waitingForInstall: "Väntar på tilläggsinstallation",
      title: "Titel",
      slug: "URL-id",
      status: "Status",
      category: "Kategori",
      products: "Produkter",
      categories: "Kategorier",
      orders: "Beställningar",
      payments: "Betalningar",
      storefront: "Storefront",
      coupons: "Kuponger",
      settings: "Inställningar",
      apiClients: "API-klienter",
      productTypes: "Produkttyper",
      skus: "SKU:er",
      licenses: "Licenser",
      validationEvents: "Valideringshändelser",
    },
  }),
  nb: buildAddonShellTranslations({
    common: {
      addOnRequired: "Tillegg kreves",
      availableAfterActivation: "Tilgjengelig etter aktivering av tillegget.",
      activating: "Aktiverer...",
      disabled: "Deaktivert",
      installDisabled: "Installasjon deaktivert",
      installPending: "Installasjon venter",
      installUnavailable: "Installasjon ikke tilgjengelig",
      licenseInvalid: "Lisensen er ugyldig",
      licenseKey: "Lisensnøkkel",
      licenseKeyRequired: "Lisensnøkkel er påkrevd.",
      licenseRequired: "Lisens kreves",
      licenseNeedsAttention: "Lisensen krever oppmerksomhet",
      invalidActivationInput: "Ugyldig aktiveringsdata.",
      supportedInstallTargets: "Støttede installasjonsmål: {providers}.",
    },
    product: {
      activate: "Aktiver {product}",
      activation: "{product}-aktivering",
      ready: "Lisens godtatt. {product}-tillegget er klart.",
      selfHostedSuccess:
        "Lisens godtatt. Installer den private {product}-pakken, sett {env}, og start CMS på nytt for å fullføre oppsettet.",
      pendingSuccess:
        "Lisens godtatt. Installasjonen av {product}-tillegget venter på deployment-pipelinen.",
      backTo: "Tilbake til {product}",
      buyKey: "Kjøp {product}-lisensnøkkel",
      cannotInstall: "{product} kan ikke installeres",
      pendingInstallDescription:
        "Lisensen ble godtatt. Installer den private {product}-pakken, sett {env}, og bygg eller start CMS på nytt for å fullføre oppsettet.",
      installLocked: "Installasjonsflyten for {product} er låst",
      licenseRequiredDescription:
        "Kjøp eller skriv inn en gyldig {product}-lisensnøkkel for å aktivere dette betalte tillegget for denne CMS-distribusjonen.",
      notInstalledTitle: "{product}-tillegget er ikke installert",
      disabledTitle: "{product} er deaktivert",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Grunnlag for betalt commerce-tillegg og CMS-shell.",
      activationDescription:
        "Aktivering binder lisensen til denne CMS-installasjonen. Pakkeinstallasjonstokener er kortvarige og lagres ikke av CMS.",
      notInstalledDescription:
        "Det offentlige CMS-shellet er klart. Aktiver lisensen, installer den private Webshop-tilleggspakken og konfigurer WEBSHOP_ADDON_MODULE før commerce-funksjoner er tilgjengelige.",
      editShell: "Rediger shell",
      viewStorefront: "Vis storefront",
      setUp: "Sett opp Webshop",
      noShellTitle: "Ingen Webshop-shell ennå",
      shellEntryDescription:
        "Opprett CMS-oppføringen som eier butikk-slug, SEO, status, synlighet og ruting.",
      createCmsShell: "Opprett CMS-shell",
      publicPreview: "Offentlig forhåndsvisning",
      usesShellRenderer: "Bruker CMS-shell-rendereren.",
      categories: "Webshop-kategorier",
      dashboard: "Webshop-kontrollpanel",
      categoryBridge: {
        readOnlyBadge: "Skrivebeskyttet bro",
        description:
          "Webshop-kategoristyring er tilgjengelig via det betalte tillegget. Denne CMS-seksjonen holder navigasjonsoppføringen stabil mens tillegget kontrollerer commerce-data.",
        editExistingOnlyBadge: "Rediger kun eksisterende",
        unavailableBadge: "Bro ikke tilgjengelig",
        unavailableDescription:
          "Tilleggets kategoribro er ikke tilgjengelig akkurat nå. Åpne Webshop-administrasjon for å se gjeldende tilleggsstatus.",
        openManagement: "Åpne administrasjon",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Betalt digitalt lisensieringstillegg for produkter kundene dine selger.",
      activationDescription:
        "Aktivering binder dette betalte License Server-tillegget til CMS-installasjonen. Din master license server forblir aktiveringsautoriteten.",
      notInstalledDescription:
        "Aktiver lisensen, installer den private License Server-tilleggspakken og konfigurer LICENSE_SERVER_ADDON_MODULE før lisensierings-API-er er tilgjengelige.",
    },
    labels: {
      waitingForInstall: "Venter på tilleggsinstallasjon",
      title: "Tittel",
      slug: "URL-id",
      status: "Status",
      category: "Kategori",
      products: "Produkter",
      categories: "Kategorier",
      orders: "Ordre",
      payments: "Betalinger",
      storefront: "Storefront",
      coupons: "Kuponger",
      settings: "Innstillinger",
      apiClients: "API-klienter",
      productTypes: "Produkttyper",
      skus: "SKU-er",
      licenses: "Lisenser",
      validationEvents: "Valideringshendelser",
    },
  }),
  nn: buildAddonShellTranslations({
    common: {
      addOnRequired: "Tillegg krevst",
      availableAfterActivation: "Tilgjengeleg etter aktivering av tillegget.",
      activating: "Aktiverer...",
      disabled: "Deaktivert",
      installDisabled: "Installasjon deaktivert",
      installPending: "Installasjon ventar",
      installUnavailable: "Installasjon ikkje tilgjengeleg",
      licenseInvalid: "Lisensen er ugyldig",
      licenseKey: "Lisensnøkkel",
      licenseKeyRequired: "Lisensnøkkel er påkravd.",
      licenseRequired: "Lisens krevst",
      licenseNeedsAttention: "Lisensen krev merksemd",
      invalidActivationInput: "Ugyldig aktiveringsdata.",
      supportedInstallTargets: "Støtta installasjonsmål: {providers}.",
    },
    product: {
      activate: "Aktiver {product}",
      activation: "{product}-aktivering",
      ready: "Lisens godteken. {product}-tillegget er klart.",
      selfHostedSuccess:
        "Lisens godteken. Installer den private {product}-pakka, set {env}, og start CMS på nytt for å fullføre oppsettet.",
      pendingSuccess:
        "Lisens godteken. Installasjonen av {product}-tillegget ventar på deployment-pipelinen.",
      backTo: "Tilbake til {product}",
      buyKey: "Kjøp {product}-lisensnøkkel",
      cannotInstall: "{product} kan ikkje installerast",
      pendingInstallDescription:
        "Lisensen vart godteken. Installer den private {product}-pakka, set {env}, og bygg eller start CMS på nytt for å fullføre oppsettet.",
      installLocked: "Installasjonsflyten for {product} er låst",
      licenseRequiredDescription:
        "Kjøp eller skriv inn ein gyldig {product}-lisensnøkkel for å aktivere dette betalte tillegget for denne CMS-distribusjonen.",
      notInstalledTitle: "{product}-tillegget er ikkje installert",
      disabledTitle: "{product} er deaktivert",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Grunnlag for betalt commerce-tillegg og CMS-shell.",
      activationDescription:
        "Aktivering bind lisensen til denne CMS-installasjonen. Pakkeinstallasjonstoken er kortvarige og blir ikkje lagra av CMS.",
      notInstalledDescription:
        "Det offentlege CMS-shellet er klart. Aktiver lisensen, installer den private Webshop-tilleggspakka og konfigurer WEBSHOP_ADDON_MODULE før commerce-funksjonar er tilgjengelege.",
      editShell: "Rediger shell",
      viewStorefront: "Vis storefront",
      setUp: "Set opp Webshop",
      noShellTitle: "Ingen Webshop-shell enno",
      shellEntryDescription:
        "Opprett CMS-oppføringa som eig butikk-slug, SEO, status, synlegheit og ruting.",
      createCmsShell: "Opprett CMS-shell",
      publicPreview: "Offentleg førehandsvising",
      usesShellRenderer: "Brukar CMS-shell-renderaren.",
      categories: "Webshop-kategoriar",
      dashboard: "Webshop-kontrollpanel",
      categoryBridge: {
        readOnlyBadge: "Skriveverna bru",
        description:
          "Webshop-kategoristyring er tilgjengeleg via det betalte tillegget. Denne CMS-seksjonen held navigasjonsoppføringa stabil medan tillegget kontrollerer commerce-data.",
        editExistingOnlyBadge: "Rediger berre eksisterande",
        unavailableBadge: "Bru ikkje tilgjengeleg",
        unavailableDescription:
          "Kategoribrui til tillegget er ikkje tilgjengeleg no. Opne Webshop-administrasjon for å sjå gjeldande tilleggsstatus.",
        openManagement: "Opne administrasjon",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Betalt digitalt lisensieringstillegg for produkt kundane dine sel.",
      activationDescription:
        "Aktivering bind dette betalte License Server-tillegget til CMS-installasjonen. Din master license server er framleis aktiveringsautoriteten.",
      notInstalledDescription:
        "Aktiver lisensen, installer den private License Server-tilleggspakka og konfigurer LICENSE_SERVER_ADDON_MODULE før lisensierings-API-ar er tilgjengelege.",
    },
    labels: {
      waitingForInstall: "Ventar på tilleggsinstallasjon",
      title: "Tittel",
      slug: "URL-id",
      status: "Status",
      category: "Kategori",
      products: "Produkt",
      categories: "Kategoriar",
      orders: "Ordre",
      payments: "Betalingar",
      storefront: "Storefront",
      coupons: "Kupongar",
      settings: "Innstillingar",
      apiClients: "API-klientar",
      productTypes: "Produkttypar",
      skus: "SKU-ar",
      licenses: "Lisensar",
      validationEvents: "Valideringshendingar",
    },
  }),
  fi: buildAddonShellTranslations({
    common: {
      addOnRequired: "Lisäosa vaaditaan",
      availableAfterActivation: "Saatavilla lisäosan aktivoinnin jälkeen.",
      activating: "Aktivoidaan...",
      disabled: "Poistettu käytöstä",
      installDisabled: "Asennus poistettu käytöstä",
      installPending: "Asennus odottaa",
      installUnavailable: "Asennus ei ole saatavilla",
      licenseInvalid: "Lisenssi ei kelpaa",
      licenseKey: "Lisenssiavain",
      licenseKeyRequired: "Lisenssiavain on pakollinen.",
      licenseRequired: "Lisenssi vaaditaan",
      licenseNeedsAttention: "Lisenssi vaatii huomiota",
      invalidActivationInput: "Virheellinen aktivointisyöte.",
      supportedInstallTargets: "Tuetut asennuskohteet: {providers}.",
    },
    product: {
      activate: "Aktivoi {product}",
      activation: "{product}-aktivointi",
      ready: "Lisenssi hyväksytty. {product}-lisäosa on valmis.",
      selfHostedSuccess:
        "Lisenssi hyväksytty. Asenna yksityinen {product}-paketti, aseta {env} ja käynnistä CMS uudelleen viimeistelläksesi määrityksen.",
      pendingSuccess:
        "Lisenssi hyväksytty. {product}-lisäosan asennus odottaa deployment pipelinea.",
      backTo: "Takaisin: {product}",
      buyKey: "Osta {product}-lisenssiavain",
      cannotInstall: "{product} ei ole asennettavissa",
      pendingInstallDescription:
        "Lisenssi hyväksyttiin. Asenna yksityinen {product}-paketti, aseta {env} ja rakenna tai käynnistä CMS uudelleen viimeistelläksesi määrityksen.",
      installLocked: "{product}-asennusvirta on lukittu",
      licenseRequiredDescription:
        "Osta tai syötä kelvollinen {product}-lisenssiavain aktivoidaksesi tämän maksullisen lisäosan tähän CMS-jakeluun.",
      notInstalledTitle: "{product}-lisäosaa ei ole asennettu",
      disabledTitle: "{product} on poistettu käytöstä",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Maksullisen commerce-lisäosan perusta ja CMS shell.",
      activationDescription:
        "Aktivointi sitoo lisenssin tähän CMS-asennukseen. Pakettien asennustunnukset ovat lyhytikäisiä eikä CMS tallenna niitä.",
      notInstalledDescription:
        "Julkinen CMS shell on valmis. Aktivoi lisenssi, asenna yksityinen Webshop-lisäosapaketti ja määritä WEBSHOP_ADDON_MODULE ennen kuin commerce-ominaisuudet ovat käytettävissä.",
      editShell: "Muokkaa shelliä",
      viewStorefront: "Näytä storefront",
      setUp: "Määritä Webshop",
      noShellTitle: "Webshop shell puuttuu vielä",
      shellEntryDescription:
        "Luo CMS-merkintä, joka omistaa kaupan slugin, SEO:n, tilan, näkyvyyden ja reitityksen.",
      createCmsShell: "Luo CMS shell",
      publicPreview: "Julkinen esikatselu",
      usesShellRenderer: "Käyttää CMS shell -renderöijää.",
      categories: "Webshop-kategoriat",
      dashboard: "Webshop-hallintapaneeli",
      categoryBridge: {
        readOnlyBadge: "Vain luku -silta",
        description:
          "Webshop-kategorioiden hallinta on saatavilla maksullisen lisäosan kautta. Tämä CMS-osio pitää navigointimerkinnän vakaana, kun lisäosa hallitsee commerce-dataa.",
        editExistingOnlyBadge: "Muokkaa vain olemassa olevia",
        unavailableBadge: "Silta ei ole saatavilla",
        unavailableDescription:
          "Lisäosan kategoriasilta ei ole tällä hetkellä saatavilla. Avaa Webshop-hallinta tarkistaaksesi lisäosan nykyisen tilan.",
        openManagement: "Avaa hallinta",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Maksullinen digitaalisen lisensoinnin lisäosa asiakkaidesi myymille tuotteille.",
      activationDescription:
        "Aktivointi sitoo tämän maksullisen License Server -lisäosan CMS-asennukseen. Master license server säilyy aktivointiviranomaisena.",
      notInstalledDescription:
        "Aktivoi lisenssi, asenna yksityinen License Server -lisäosapaketti ja määritä LICENSE_SERVER_ADDON_MODULE ennen kuin lisensointi-API:t ovat käytettävissä.",
    },
    labels: {
      waitingForInstall: "Odotetaan lisäosan asennusta",
      title: "Otsikko",
      slug: "URL-tunniste",
      status: "Tila",
      category: "Kategoria",
      products: "Tuotteet",
      categories: "Kategoriat",
      orders: "Tilaukset",
      payments: "Maksut",
      storefront: "Storefront",
      coupons: "Kupongit",
      settings: "Asetukset",
      apiClients: "API-asiakkaat",
      productTypes: "Tuotetyypit",
      skus: "SKU:t",
      licenses: "Lisenssit",
      validationEvents: "Validointitapahtumat",
    },
  }),
  is: buildAddonShellTranslations({
    common: {
      addOnRequired: "Viðbót er nauðsynleg",
      availableAfterActivation: "Tiltækt eftir virkjun viðbótar.",
      activating: "Virkja...",
      disabled: "Óvirkt",
      installDisabled: "Uppsetning óvirk",
      installPending: "Uppsetning bíður",
      installUnavailable: "Uppsetning ekki tiltæk",
      licenseInvalid: "Leyfi er ógilt",
      licenseKey: "Leyfislykill",
      licenseKeyRequired: "Leyfislykill er nauðsynlegur.",
      licenseRequired: "Leyfi er nauðsynlegt",
      licenseNeedsAttention: "Leyfið þarfnast athygli",
      invalidActivationInput: "Ógilt virkjunarinnsláttur.",
      supportedInstallTargets: "Studd uppsetningarmarkmið: {providers}.",
    },
    product: {
      activate: "Virkja {product}",
      activation: "Virkjun {product}",
      ready: "Leyfi samþykkt. {product}-viðbót er tilbúin.",
      selfHostedSuccess:
        "Leyfi samþykkt. Settu upp einkapakkann {product}, stilltu {env} og endurræstu CMS til að ljúka uppsetningu.",
      pendingSuccess:
        "Leyfi samþykkt. Uppsetning {product}-viðbótar bíður eftir deployment pipeline.",
      backTo: "Til baka í {product}",
      buyKey: "Kaupa {product}-leyfislykil",
      cannotInstall: "Ekki er hægt að setja upp {product}",
      pendingInstallDescription:
        "Leyfið var samþykkt. Settu upp einkapakkann {product}, stilltu {env} og byggðu aftur eða endurræstu CMS til að ljúka uppsetningu.",
      installLocked: "Uppsetningarflæði {product} er læst",
      licenseRequiredDescription:
        "Kauptu eða sláðu inn gildan {product}-leyfislykil til að virkja þessa greiddu viðbót fyrir þessa CMS-uppsetningu.",
      notInstalledTitle: "{product}-viðbót er ekki uppsett",
      disabledTitle: "{product} er óvirkt",
    },
    webshop: {
      name: baseTerms.webshopName,
      description: "Grunnur greiddrar commerce-viðbótar og CMS shell.",
      activationDescription:
        "Virkjun tengir leyfið við þessa CMS-uppsetningu. Uppsetningartókar pakka eru skammlífir og CMS geymir þá ekki.",
      notInstalledDescription:
        "Opinberi CMS shell er tilbúinn. Virkjaðu leyfið, settu upp einkapakka Webshop-viðbótarinnar og stilltu WEBSHOP_ADDON_MODULE áður en commerce-eiginleikar verða tiltækir.",
      editShell: "Breyta shell",
      viewStorefront: "Skoða storefront",
      setUp: "Setja upp Webshop",
      noShellTitle: "Enginn Webshop shell enn",
      shellEntryDescription:
        "Búðu til CMS-færsluna sem á slug verslunar, SEO, stöðu, sýnileika og leiðir.",
      createCmsShell: "Búa til CMS shell",
      publicPreview: "Opinber forskoðun",
      usesShellRenderer: "Notar CMS shell renderer.",
      categories: "Webshop-flokkar",
      dashboard: "Webshop-stjórnborð",
      categoryBridge: {
        readOnlyBadge: "Brú aðeins til lestrar",
        description:
          "Stjórnun Webshop-flokka er tiltæk í gegnum greiddu viðbótina. Þessi CMS-hluti heldur leiðsagnarfærslunni stöðugri á meðan viðbótin stýrir commerce-gögnum.",
        editExistingOnlyBadge: "Breyta aðeins núverandi",
        unavailableBadge: "Brú ekki tiltæk",
        unavailableDescription:
          "Flokkabrú viðbótarinnar er ekki tiltæk núna. Opnaðu Webshop-stjórnun til að skoða núverandi stöðu viðbótarinnar.",
        openManagement: "Opna stjórnun",
      },
    },
    licenseServer: {
      name: baseTerms.licenseServerName,
      description:
        "Greidd stafræn leyfisviðbót fyrir vörur sem viðskiptavinir þínir selja.",
      activationDescription:
        "Virkjun tengir þessa greiddu License Server-viðbót við CMS-uppsetninguna. Master license server heldur áfram að vera virkjunarvaldið.",
      notInstalledDescription:
        "Virkjaðu leyfið, settu upp einkapakka License Server-viðbótarinnar og stilltu LICENSE_SERVER_ADDON_MODULE áður en leyfis-API verða tiltæk.",
    },
    labels: {
      waitingForInstall: "Bíður eftir uppsetningu viðbótar",
      title: "Titill",
      slug: "URL-auðkenni",
      status: "Staða",
      category: "Flokkur",
      products: "Vörur",
      categories: "Flokkar",
      orders: "Pantanir",
      payments: "Greiðslur",
      storefront: "Storefront",
      coupons: "Afsláttarkóðar",
      settings: "Stillingar",
      apiClients: "API-biðlarar",
      productTypes: "Vörutegundir",
      skus: "SKU",
      licenses: "Leyfi",
      validationEvents: "Staðfestingaratburðir",
    },
  }),
} satisfies Record<LocalizedLanguage, AddonShellSourceMap>;
