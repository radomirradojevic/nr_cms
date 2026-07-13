import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export const LOCK_UI_SOURCE_STRINGS = [
  "Editing — your changes are protected by an edit lock.",
  "Acquiring edit lock...",
  "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.",
] as const;

type LockUiSourceString = (typeof LOCK_UI_SOURCE_STRINGS)[number];

export const LOCK_UI_SOURCE_TRANSLATIONS = {
  "sr-Latn": {
    "Editing — your changes are protected by an edit lock.":
      "Uređivanje — tvoje izmene su zaštićene zaključavanjem za uređivanje.",
    "Acquiring edit lock...": "Preuzimanje zaključavanja za uređivanje...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "{name} ({role}) trenutno uređuje. Poslednja aktivnost {time}. Možeš da pregledaš, ali ne i da sačuvaš izmene. Drugi administrator uređuje - kontaktiraj ga da oslobodi zaključavanje ili sačekaj da zatvori stranicu.",
  },
  "sr-Cyrl": {
    "Editing — your changes are protected by an edit lock.":
      "Уређивање — твоје измене су заштићене закључавањем за уређивање.",
    "Acquiring edit lock...": "Преузимање закључавања за уређивање...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "{name} ({role}) тренутно уређује. Последња активност {time}. Можеш да прегледаш, али не и да сачуваш измене. Други администратор уређује - контактирај га да ослободи закључавање или сачекај да затвори страницу.",
  },
  hr: {
    "Editing — your changes are protected by an edit lock.":
      "Uređivanje — vaše promjene zaštićene su zaključavanjem uređivanja.",
    "Acquiring edit lock...": "Preuzimanje zaključavanja uređivanja...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "{name} ({role}) trenutačno uređuje. Zadnja aktivnost {time}. Možete pregledavati, ali ne i spremati promjene. Drugi administrator uređuje - kontaktirajte ga da oslobodi zaključavanje ili pričekajte da zatvori stranicu.",
  },
  de: {
    "Editing — your changes are protected by an edit lock.":
      "Bearbeitung — deine Änderungen sind durch eine Bearbeitungssperre geschützt.",
    "Acquiring edit lock...": "Bearbeitungssperre wird angefordert...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Wird derzeit von {name} ({role}) bearbeitet. Letzte Aktivität {time}. Du kannst die Änderungen ansehen, aber nicht speichern. Ein anderer Admin bearbeitet gerade - kontaktiere ihn, damit er die Sperre freigibt, oder warte, bis er die Seite schließt.",
  },
  fr: {
    "Editing — your changes are protected by an edit lock.":
      "Modification — vos changements sont protégés par un verrou d'édition.",
    "Acquiring edit lock...": "Acquisition du verrou d'édition...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Actuellement modifié par {name} ({role}). Dernière activité {time}. Vous pouvez consulter les changements, mais pas les enregistrer. Un autre administrateur modifie cette page - contactez-le pour libérer le verrou ou attendez qu'il ferme la page.",
  },
  es: {
    "Editing — your changes are protected by an edit lock.":
      "Editando — tus cambios están protegidos por un bloqueo de edición.",
    "Acquiring edit lock...": "Obteniendo bloqueo de edición...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Actualmente lo está editando {name} ({role}). Última actividad {time}. Puedes ver los cambios, pero no guardarlos. Otro administrador está editando - contáctalo para liberar el bloqueo o espera a que cierre la página.",
  },
  it: {
    "Editing — your changes are protected by an edit lock.":
      "Modifica — le tue modifiche sono protette da un blocco di modifica.",
    "Acquiring edit lock...": "Acquisizione del blocco di modifica...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Attualmente in modifica da {name} ({role}). Ultima attività {time}. Puoi visualizzare le modifiche, ma non salvarle. Un altro amministratore sta modificando - contattalo per liberare il blocco o attendi che chiuda la pagina.",
  },
  pt: {
    "Editing — your changes are protected by an edit lock.":
      "Edição — as suas alterações estão protegidas por um bloqueio de edição.",
    "Acquiring edit lock...": "A obter bloqueio de edição...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Atualmente em edição por {name} ({role}). Última atividade {time}. Pode ver, mas não guardar alterações. Outro administrador está a editar - contacte-o para libertar o bloqueio ou aguarde até fechar a página.",
  },
  "pt-BR": {
    "Editing — your changes are protected by an edit lock.":
      "Editando — suas alterações estão protegidas por um bloqueio de edição.",
    "Acquiring edit lock...": "Obtendo bloqueio de edição...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Atualmente editado por {name} ({role}). Última atividade {time}. Você pode visualizar, mas não salvar alterações. Outro administrador está editando - contate-o para liberar o bloqueio ou aguarde até ele fechar a página.",
  },
  nl: {
    "Editing — your changes are protected by an edit lock.":
      "Bewerken — je wijzigingen worden beschermd door een bewerkingsvergrendeling.",
    "Acquiring edit lock...": "Bewerkingsvergrendeling ophalen...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Wordt momenteel bewerkt door {name} ({role}). Laatste activiteit {time}. Je kunt wijzigingen bekijken, maar niet opslaan. Een andere beheerder is aan het bewerken - neem contact op om de vergrendeling vrij te geven of wacht tot diegene de pagina sluit.",
  },
  pl: {
    "Editing — your changes are protected by an edit lock.":
      "Edycja — Twoje zmiany są chronione blokadą edycji.",
    "Acquiring edit lock...": "Uzyskiwanie blokady edycji...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Obecnie edytuje {name} ({role}). Ostatnia aktywność {time}. Możesz przeglądać, ale nie możesz zapisywać zmian. Inny administrator edytuje - skontaktuj się z nim, aby zwolnił blokadę, albo poczekaj, aż zamknie stronę.",
  },
  tr: {
    "Editing — your changes are protected by an edit lock.":
      "Düzenleme — değişiklikleriniz bir düzenleme kilidiyle korunuyor.",
    "Acquiring edit lock...": "Düzenleme kilidi alınıyor...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Şu anda {name} ({role}) tarafından düzenleniyor. Son etkinlik {time}. Görüntüleyebilirsiniz ancak değişiklikleri kaydedemezsiniz. Başka bir yönetici düzenliyor - kilidi kaldırması için onunla iletişime geçin veya sayfayı kapatmasını bekleyin.",
  },
  mk: {
    "Editing — your changes are protected by an edit lock.":
      "Уредување — твоите промени се заштитени со заклучување за уредување.",
    "Acquiring edit lock...": "Се презема заклучување за уредување...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Моментално уредува {name} ({role}). Последна активност {time}. Можеш да гледаш, но не и да зачувуваш промени. Друг администратор уредува - контактирај го за да го ослободи заклучувањето или почекај да ја затвори страницата.",
  },
  bs: {
    "Editing — your changes are protected by an edit lock.":
      "Uređivanje — tvoje izmjene su zaštićene zaključavanjem uređivanja.",
    "Acquiring edit lock...": "Preuzimanje zaključavanja uređivanja...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "{name} ({role}) trenutno uređuje. Posljednja aktivnost {time}. Možeš pregledati, ali ne i sačuvati izmjene. Drugi administrator uređuje - kontaktiraj ga da oslobodi zaključavanje ili sačekaj da zatvori stranicu.",
  },
  sl: {
    "Editing — your changes are protected by an edit lock.":
      "Urejanje — vaše spremembe so zaščitene z zaklepom urejanja.",
    "Acquiring edit lock...": "Pridobivanje zaklepa urejanja...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Trenutno ureja {name} ({role}). Zadnja aktivnost {time}. Spremembe lahko vidite, ne morete pa jih shraniti. Drug skrbnik ureja - kontaktirajte ga, da sprosti zaklep, ali počakajte, da zapre stran.",
  },
  ru: {
    "Editing — your changes are protected by an edit lock.":
      "Редактирование — ваши изменения защищены блокировкой редактирования.",
    "Acquiring edit lock...": "Получение блокировки редактирования...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Сейчас редактирует {name} ({role}). Последняя активность {time}. Вы можете просматривать, но не сохранять изменения. Другой администратор редактирует - свяжитесь с ним, чтобы снять блокировку, или дождитесь, пока он закроет страницу.",
  },
  hu: {
    "Editing — your changes are protected by an edit lock.":
      "Szerkesztés — a módosításait szerkesztési zárolás védi.",
    "Acquiring edit lock...": "Szerkesztési zárolás megszerzése...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Jelenleg {name} ({role}) szerkeszti. Utolsó aktivitás: {time}. Megtekintheti, de nem mentheti a módosításokat. Egy másik adminisztrátor szerkeszt - kérje meg a zárolás feloldására, vagy várja meg, amíg bezárja az oldalt.",
  },
  bg: {
    "Editing — your changes are protected by an edit lock.":
      "Редактиране — промените ви са защитени със заключване за редактиране.",
    "Acquiring edit lock...": "Получаване на заключване за редактиране...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "В момента се редактира от {name} ({role}). Последна активност {time}. Можете да преглеждате, но не и да запазвате промени. Друг администратор редактира - свържете се с него, за да освободи заключването, или изчакайте да затвори страницата.",
  },
  ja: {
    "Editing — your changes are protected by an edit lock.":
      "編集中 — 変更は編集ロックで保護されています。",
    "Acquiring edit lock...": "編集ロックを取得しています...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "現在 {name} ({role}) が編集中です。最終アクティビティ {time}。閲覧はできますが変更は保存できません。別の管理者が編集中です - ロックを解除してもらうか、ページを閉じるまでお待ちください。",
  },
  "zh-Hans": {
    "Editing — your changes are protected by an edit lock.":
      "正在编辑 — 您的更改受编辑锁保护。",
    "Acquiring edit lock...": "正在获取编辑锁...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "当前由 {name}（{role}）编辑。上次活动时间 {time}。您可以查看但不能保存更改。另一位管理员正在编辑 - 请联系对方释放锁，或等待其关闭页面。",
  },
  "zh-Hant": {
    "Editing — your changes are protected by an edit lock.":
      "正在編輯 — 您的變更受編輯鎖保護。",
    "Acquiring edit lock...": "正在取得編輯鎖...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "目前由 {name}（{role}）編輯。上次活動時間 {time}。您可以檢視但不能儲存變更。另一位管理員正在編輯 - 請聯絡對方釋放鎖定，或等待其關閉頁面。",
  },
  ar: {
    "Editing — your changes are protected by an edit lock.":
      "جار التحرير — تغييراتك محمية بقفل تحرير.",
    "Acquiring edit lock...": "جار الحصول على قفل التحرير...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "يحرره حاليًا {name} ({role}). آخر نشاط {time}. يمكنك العرض فقط ولا يمكنك حفظ التغييرات. هناك مسؤول آخر يحرر - تواصل معه لتحرير القفل أو انتظر حتى يغلق الصفحة.",
  },
  id: {
    "Editing — your changes are protected by an edit lock.":
      "Mengedit — perubahan Anda dilindungi oleh kunci edit.",
    "Acquiring edit lock...": "Mengambil kunci edit...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Saat ini sedang diedit oleh {name} ({role}). Aktivitas terakhir {time}. Anda dapat melihat tetapi tidak dapat menyimpan perubahan. Admin lain sedang mengedit - hubungi mereka untuk melepas kunci, atau tunggu sampai mereka menutup halaman.",
  },
  cs: {
    "Editing — your changes are protected by an edit lock.":
      "Úpravy — vaše změny jsou chráněny zámkem úprav.",
    "Acquiring edit lock...": "Získávání zámku úprav...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Aktuálně upravuje {name} ({role}). Poslední aktivita {time}. Změny můžete zobrazit, ale ne uložit. Jiný administrátor upravuje - kontaktujte ho, aby zámek uvolnil, nebo počkejte, až stránku zavře.",
  },
  ro: {
    "Editing — your changes are protected by an edit lock.":
      "Editare — modificările dvs. sunt protejate de o blocare de editare.",
    "Acquiring edit lock...": "Se obține blocarea de editare...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Editat în prezent de {name} ({role}). Ultima activitate {time}. Puteți vizualiza, dar nu puteți salva modificări. Un alt administrator editează - contactați-l pentru a elibera blocarea sau așteptați să închidă pagina.",
  },
  el: {
    "Editing — your changes are protected by an edit lock.":
      "Επεξεργασία — οι αλλαγές σας προστατεύονται από κλείδωμα επεξεργασίας.",
    "Acquiring edit lock...": "Λήψη κλειδώματος επεξεργασίας...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Αυτή τη στιγμή επεξεργάζεται από {name} ({role}). Τελευταία δραστηριότητα {time}. Μπορείτε να δείτε αλλά όχι να αποθηκεύσετε αλλαγές. Ένας άλλος διαχειριστής επεξεργάζεται - επικοινωνήστε μαζί του για να απελευθερώσει το κλείδωμα ή περιμένετε να κλείσει τη σελίδα.",
  },
  da: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — dine ændringer er beskyttet af en redigeringslås.",
    "Acquiring edit lock...": "Henter redigeringslås...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Redigeres i øjeblikket af {name} ({role}). Seneste aktivitet {time}. Du kan se, men ikke gemme ændringer. En anden administrator redigerer - kontakt vedkommende for at frigive låsen, eller vent til siden lukkes.",
  },
  sv: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — dina ändringar skyddas av ett redigeringslås.",
    "Acquiring edit lock...": "Hämtar redigeringslås...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Redigeras för närvarande av {name} ({role}). Senaste aktivitet {time}. Du kan visa men inte spara ändringar. En annan administratör redigerar - kontakta dem för att frigöra låset, eller vänta tills de stänger sidan.",
  },
  nb: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — endringene dine er beskyttet av en redigeringslås.",
    "Acquiring edit lock...": "Henter redigeringslås...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Redigeres for øyeblikket av {name} ({role}). Siste aktivitet {time}. Du kan se, men ikke lagre endringer. En annen administrator redigerer - kontakt vedkommende for å frigjøre låsen, eller vent til siden lukkes.",
  },
  nn: {
    "Editing — your changes are protected by an edit lock.":
      "Redigering — endringane dine er verna av ein redigeringslås.",
    "Acquiring edit lock...": "Hentar redigeringslås...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Blir redigert av {name} ({role}). Siste aktivitet {time}. Du kan sjå, men ikkje lagre endringar. Ein annan administrator redigerer - kontakt vedkomande for å frigjere låsen, eller vent til sida blir lukka.",
  },
  fi: {
    "Editing — your changes are protected by an edit lock.":
      "Muokkaus — muutoksesi on suojattu muokkauslukolla.",
    "Acquiring edit lock...": "Haetaan muokkauslukkoa...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Tällä hetkellä muokkaa {name} ({role}). Viimeisin toiminta {time}. Voit tarkastella, mutta et tallentaa muutoksia. Toinen ylläpitäjä muokkaa - ota häneen yhteyttä lukon vapauttamiseksi tai odota, kunnes hän sulkee sivun.",
  },
  is: {
    "Editing — your changes are protected by an edit lock.":
      "Breyting — breytingarnar þínar eru varðar með breytingarlás.",
    "Acquiring edit lock...": "Sæki breytingarlás...",
    "Currently being edited by {name} ({role}). Last activity {time}. You can view but not save changes. Another admin is editing - contact them to release the lock, or wait until they close the page.":
      "Núna er {name} ({role}) að breyta. Síðasta virkni {time}. Þú getur skoðað en ekki vistað breytingar. Annar stjórnandi er að breyta - hafðu samband til að losa lásinn eða bíddu þar til síðunni er lokað.",
  },
} satisfies Record<LocalizedLanguage, Record<LockUiSourceString, string>>;
