import type { CmsLanguage } from "@/lib/i18n/languages";

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

export const USER_MANAGEMENT_SOURCE_STRINGS = [
  "User Management",
  "Manage users and their roles. Admin access only.",
  "User Details",
  "Back to Users",
  "No users found.",
  "Search by username or email...",
  "Active",
  "Locked",
  "Online",
  "Offline",
  "Viewer",
  "Author",
  "Publisher",
  "Admin",
  "Frontend read-only access (always assigned)",
  "Create and manage own content",
  "Manage and publish content",
  "Full backend access",
  "Edit Roles",
  "Edit User Roles",
  "Select the roles to assign to this user.",
  "Force Logout",
  "Force sign out this user?",
  "This will immediately revoke all active sessions for the user. They will be signed out on every device and will have to sign in again to continue. This does not lock the account.",
  "Lock User",
  "Unlock User",
  "Lock this user?",
  "Unlock this user?",
  "This will prevent the user from signing in until the lock expires (1 hour by default, configurable in Clerk Attack Protection settings). You can unlock them at any time.",
  "This will remove the sign-in lock and restore the user's access immediately.",
  "Lock",
  "Unlock",
  "Delete User",
  "Delete this user?",
  "This action is permanent and cannot be undone. The user's account will be permanently removed from the system.",
  "Username",
  "Email",
  "Member since",
  "Status",
  "Presence",
  "Roles",
  "Invalid user ID.",
  "You cannot lock your own account.",
  "You cannot force sign out your own account.",
  "Failed to revoke active sessions.",
  "You cannot delete your own account.",
  "Failed to load users.",
  "Select a user...",
  "Search users...",
  "Loading users...",
  "No backend users found.",
  "current",
] as const;

type UserManagementSource = (typeof USER_MANAGEMENT_SOURCE_STRINGS)[number];

const ROWS = {
  "sr-Latn": `Upravljanje korisnicima|Upravljaj korisnicima i njihovim ulogama. Samo za admine.|Detalji korisnika|Nazad na korisnike|Nema pronađenih korisnika.|Pretraži po korisničkom imenu ili emailu...|Aktivan|Zaključan|Online|Offline|Pregledač|Autor|Izdavač|Admin|Pristup samo za čitanje na frontendu (uvek dodeljeno)|Može da kreira i upravlja sopstvenim sadržajem|Može da upravlja sadržajem i objavljuje ga|Potpun pristup backendu|Izmeni uloge|Izmeni uloge korisnika|Izaberi uloge koje se dodeljuju ovom korisniku.|Prinudna odjava|Prinudno odjaviti ovog korisnika?|Ovo će odmah opozvati sve aktivne sesije korisnika. Biće odjavljen na svim uređajima i moraće ponovo da se prijavi da bi nastavio. Ovo ne zaključava nalog.|Zaključaj korisnika|Otključaj korisnika|Zaključati ovog korisnika?|Otključati ovog korisnika?|Ovo će sprečiti korisnika da se prijavi dok zaključavanje ne istekne (podrazumevano 1 sat, podesivo u Clerk Attack Protection podešavanjima). Možeš ga otključati u bilo kom trenutku.|Ovo će ukloniti zaključavanje prijave i odmah vratiti pristup korisniku.|Zaključaj|Otključaj|Obriši korisnika|Obrisati ovog korisnika?|Ova radnja je trajna i ne može se opozvati. Korisnički nalog će biti trajno uklonjen iz sistema.|Korisničko ime|Email|Član od|Status|Prisustvo|Uloge|Neispravan ID korisnika.|Ne možeš zaključati sopstveni nalog.|Ne možeš prinudno odjaviti sopstveni nalog.|Nije uspelo opozivanje aktivnih sesija.|Ne možeš obrisati sopstveni nalog.|Učitavanje korisnika nije uspelo.|Izaberi korisnika...|Pretraži korisnike...|Učitavanje korisnika...|Nema pronađenih backend korisnika.|trenutni`,
  "sr-Cyrl": `Управљање корисницима|Управљај корисницима и њиховим улогама. Само за администраторе.|Детаљи корисника|Назад на кориснике|Нема пронађених корисника.|Претражи по корисничком имену или email-у...|Активан|Закључан|Онлајн|Офлајн|Прегледач|Аутор|Издавач|Админ|Приступ само за читање на фронтенду (увек додељено)|Може да креира и управља сопственим садржајем|Може да управља садржајем и објављује га|Потпун приступ бекенду|Измени улоге|Измени улоге корисника|Изабери улоге које се додељују овом кориснику.|Принудна одјава|Принудно одјавити овог корисника?|Ово ће одмах опозвати све активне сесије корисника. Биће одјављен на свим уређајима и мораће поново да се пријави да би наставио. Ово не закључава налог.|Закључај корисника|Откључај корисника|Закључати овог корисника?|Откључати овог корисника?|Ово ће спречити корисника да се пријави док закључавање не истекне (подразумевано 1 сат, подесиво у Clerk Attack Protection подешавањима). Можеш га откључати у било ком тренутку.|Ово ће уклонити закључавање пријаве и одмах вратити приступ кориснику.|Закључај|Откључај|Обриши корисника|Обрисати овог корисника?|Ова радња је трајна и не може се опозвати. Кориснички налог ће бити трајно уклоњен из система.|Корисничко име|Email|Члан од|Статус|Присуство|Улоге|Неисправан ID корисника.|Не можеш закључати сопствени налог.|Не можеш принудно одјавити сопствени налог.|Није успело опозивање активних сесија.|Не можеш обрисати сопствени налог.|Учитавање корисника није успело.|Изабери корисника...|Претражи кориснике...|Учитавање корисника...|Нема пронађених backend корисника.|тренутни`,
  hr: `Upravljanje korisnicima|Upravljajte korisnicima i njihovim ulogama. Samo za administratore.|Detalji korisnika|Natrag na korisnike|Nema pronađenih korisnika.|Pretraži po korisničkom imenu ili emailu...|Aktivan|Zaključan|Online|Offline|Preglednik|Autor|Izdavač|Admin|Pristup samo za čitanje na frontendu (uvijek dodijeljeno)|Može stvarati i upravljati vlastitim sadržajem|Može upravljati sadržajem i objavljivati ga|Potpun pristup backendu|Uredi uloge|Uredi uloge korisnika|Odaberite uloge koje želite dodijeliti ovom korisniku.|Prisilna odjava|Prisilno odjaviti ovog korisnika?|Ovo će odmah opozvati sve aktivne sesije korisnika. Bit će odjavljen na svim uređajima i morat će se ponovno prijaviti za nastavak. Ovo ne zaključava račun.|Zaključaj korisnika|Otključaj korisnika|Zaključati ovog korisnika?|Otključati ovog korisnika?|Ovo će spriječiti korisnika da se prijavi dok zaključavanje ne istekne (zadano 1 sat, podesivo u Clerk Attack Protection postavkama). Možete ga otključati u bilo kojem trenutku.|Ovo će ukloniti zaključavanje prijave i odmah vratiti korisnikov pristup.|Zaključaj|Otključaj|Izbriši korisnika|Izbrisati ovog korisnika?|Ova je radnja trajna i ne može se poništiti. Korisnički račun bit će trajno uklonjen iz sustava.|Korisničko ime|Email|Član od|Status|Prisutnost|Uloge|Neispravan ID korisnika.|Ne možete zaključati vlastiti račun.|Ne možete prisilno odjaviti vlastiti račun.|Opoziv aktivnih sesija nije uspio.|Ne možete izbrisati vlastiti račun.|Učitavanje korisnika nije uspjelo.|Odaberite korisnika...|Pretraži korisnike...|Učitavanje korisnika...|Nema pronađenih backend korisnika.|trenutni`,
  de: `Benutzerverwaltung|Verwalte Benutzer und ihre Rollen. Nur Adminzugriff.|Benutzerdetails|Zurück zu Benutzern|Keine Benutzer gefunden.|Nach Benutzername oder E-Mail suchen...|Aktiv|Gesperrt|Online|Offline|Betrachter|Autor|Veröffentlicher|Admin|Nur Lesezugriff im Frontend (immer zugewiesen)|Kann eigene Inhalte erstellen und verwalten|Kann Inhalte verwalten und veröffentlichen|Voller Backendzugriff|Rollen bearbeiten|Benutzerrollen bearbeiten|Wähle die Rollen aus, die diesem Benutzer zugewiesen werden sollen.|Abmeldung erzwingen|Diesen Benutzer zwangsweise abmelden?|Dadurch werden alle aktiven Sitzungen des Benutzers sofort widerrufen. Er wird auf allen Geräten abgemeldet und muss sich erneut anmelden, um fortzufahren. Das Konto wird dadurch nicht gesperrt.|Benutzer sperren|Benutzer entsperren|Diesen Benutzer sperren?|Diesen Benutzer entsperren?|Dies verhindert, dass sich der Benutzer anmeldet, bis die Sperre abläuft (standardmäßig 1 Stunde, konfigurierbar in den Clerk Attack Protection-Einstellungen). Du kannst ihn jederzeit entsperren.|Dies entfernt die Anmeldesperre und stellt den Zugriff des Benutzers sofort wieder her.|Sperren|Entsperren|Benutzer löschen|Diesen Benutzer löschen?|Diese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden. Das Benutzerkonto wird dauerhaft aus dem System entfernt.|Benutzername|E-Mail|Mitglied seit|Status|Präsenz|Rollen|Ungültige Benutzer-ID.|Du kannst dein eigenes Konto nicht sperren.|Du kannst dein eigenes Konto nicht zwangsweise abmelden.|Aktive Sitzungen konnten nicht widerrufen werden.|Du kannst dein eigenes Konto nicht löschen.|Benutzer konnten nicht geladen werden.|Benutzer auswählen...|Benutzer suchen...|Benutzer werden geladen...|Keine Backend-Benutzer gefunden.|aktuell`,
  fr: `Gestion des utilisateurs|Gérez les utilisateurs et leurs rôles. Accès administrateur uniquement.|Détails de l'utilisateur|Retour aux utilisateurs|Aucun utilisateur trouvé.|Rechercher par nom d'utilisateur ou email...|Actif|Verrouillé|En ligne|Hors ligne|Lecteur|Auteur|Éditeur|Admin|Accès frontend en lecture seule (toujours attribué)|Peut créer et gérer son propre contenu|Peut gérer et publier du contenu|Accès backend complet|Modifier les rôles|Modifier les rôles utilisateur|Sélectionnez les rôles à attribuer à cet utilisateur.|Forcer la déconnexion|Forcer la déconnexion de cet utilisateur ?|Cela révoquera immédiatement toutes les sessions actives de l'utilisateur. Il sera déconnecté sur tous les appareils et devra se reconnecter pour continuer. Cela ne verrouille pas le compte.|Verrouiller l'utilisateur|Déverrouiller l'utilisateur|Verrouiller cet utilisateur ?|Déverrouiller cet utilisateur ?|Cela empêchera l'utilisateur de se connecter jusqu'à l'expiration du verrouillage (1 heure par défaut, configurable dans les paramètres Clerk Attack Protection). Vous pouvez le déverrouiller à tout moment.|Cela supprimera le verrouillage de connexion et restaurera immédiatement l'accès de l'utilisateur.|Verrouiller|Déverrouiller|Supprimer l'utilisateur|Supprimer cet utilisateur ?|Cette action est permanente et irréversible. Le compte de l'utilisateur sera définitivement supprimé du système.|Nom d'utilisateur|Email|Membre depuis|Statut|Présence|Rôles|ID utilisateur invalide.|Vous ne pouvez pas verrouiller votre propre compte.|Vous ne pouvez pas forcer la déconnexion de votre propre compte.|Échec de la révocation des sessions actives.|Vous ne pouvez pas supprimer votre propre compte.|Impossible de charger les utilisateurs.|Sélectionner un utilisateur...|Rechercher des utilisateurs...|Chargement des utilisateurs...|Aucun utilisateur backend trouvé.|actuel`,
  es: `Gestión de usuarios|Administra usuarios y sus roles. Solo acceso de administradores.|Detalles del usuario|Volver a usuarios|No se encontraron usuarios.|Buscar por nombre de usuario o email...|Activo|Bloqueado|En línea|Sin conexión|Visor|Autor|Publicador|Admin|Acceso de solo lectura al frontend (siempre asignado)|Puede crear y administrar su propio contenido|Puede administrar y publicar contenido|Acceso completo al backend|Editar roles|Editar roles de usuario|Selecciona los roles para asignar a este usuario.|Forzar cierre de sesión|¿Forzar el cierre de sesión de este usuario?|Esto revocará inmediatamente todas las sesiones activas del usuario. Se cerrará su sesión en todos los dispositivos y tendrá que iniciar sesión de nuevo para continuar. Esto no bloquea la cuenta.|Bloquear usuario|Desbloquear usuario|¿Bloquear este usuario?|¿Desbloquear este usuario?|Esto impedirá que el usuario inicie sesión hasta que el bloqueo expire (1 hora por defecto, configurable en la configuración de Clerk Attack Protection). Puedes desbloquearlo en cualquier momento.|Esto eliminará el bloqueo de inicio de sesión y restaurará inmediatamente el acceso del usuario.|Bloquear|Desbloquear|Eliminar usuario|¿Eliminar este usuario?|Esta acción es permanente y no se puede deshacer. La cuenta del usuario se eliminará permanentemente del sistema.|Nombre de usuario|Email|Miembro desde|Estado|Presencia|Roles|ID de usuario no válido.|No puedes bloquear tu propia cuenta.|No puedes forzar el cierre de sesión de tu propia cuenta.|No se pudieron revocar las sesiones activas.|No puedes eliminar tu propia cuenta.|No se pudieron cargar los usuarios.|Selecciona un usuario...|Buscar usuarios...|Cargando usuarios...|No se encontraron usuarios backend.|actual`,
  it: `Gestione utenti|Gestisci utenti e ruoli. Accesso solo amministratori.|Dettagli utente|Torna agli utenti|Nessun utente trovato.|Cerca per nome utente o email...|Attivo|Bloccato|Online|Offline|Visualizzatore|Autore|Editore|Admin|Accesso frontend in sola lettura (sempre assegnato)|Può creare e gestire i propri contenuti|Può gestire e pubblicare contenuti|Accesso backend completo|Modifica ruoli|Modifica ruoli utente|Seleziona i ruoli da assegnare a questo utente.|Forza logout|Forzare il logout di questo utente?|Questo revocherà immediatamente tutte le sessioni attive dell'utente. Verrà disconnesso da ogni dispositivo e dovrà accedere di nuovo per continuare. Questo non blocca l'account.|Blocca utente|Sblocca utente|Bloccare questo utente?|Sbloccare questo utente?|Questo impedirà all'utente di accedere finché il blocco non scade (1 ora per impostazione predefinita, configurabile nelle impostazioni Clerk Attack Protection). Puoi sbloccarlo in qualsiasi momento.|Questo rimuoverà il blocco di accesso e ripristinerà immediatamente l'accesso dell'utente.|Blocca|Sblocca|Elimina utente|Eliminare questo utente?|Questa azione è permanente e non può essere annullata. L'account dell'utente verrà rimosso definitivamente dal sistema.|Nome utente|Email|Membro dal|Stato|Presenza|Ruoli|ID utente non valido.|Non puoi bloccare il tuo account.|Non puoi forzare il logout del tuo account.|Impossibile revocare le sessioni attive.|Non puoi eliminare il tuo account.|Impossibile caricare gli utenti.|Seleziona un utente...|Cerca utenti...|Caricamento utenti...|Nessun utente backend trovato.|corrente`,
  pt: `Gestão de utilizadores|Gira utilizadores e respetivas funções. Acesso apenas para administradores.|Detalhes do utilizador|Voltar aos utilizadores|Nenhum utilizador encontrado.|Pesquisar por nome de utilizador ou email...|Ativo|Bloqueado|Online|Offline|Visualizador|Autor|Publicador|Admin|Acesso frontend só de leitura (sempre atribuído)|Pode criar e gerir o próprio conteúdo|Pode gerir e publicar conteúdo|Acesso backend completo|Editar funções|Editar funções do utilizador|Selecione as funções a atribuir a este utilizador.|Forçar fim de sessão|Forçar fim de sessão deste utilizador?|Isto revogará imediatamente todas as sessões ativas do utilizador. A sessão será terminada em todos os dispositivos e terá de iniciar sessão novamente para continuar. Isto não bloqueia a conta.|Bloquear utilizador|Desbloquear utilizador|Bloquear este utilizador?|Desbloquear este utilizador?|Isto impedirá o utilizador de iniciar sessão até o bloqueio expirar (1 hora por predefinição, configurável nas definições Clerk Attack Protection). Pode desbloqueá-lo a qualquer momento.|Isto removerá o bloqueio de início de sessão e restaurará imediatamente o acesso do utilizador.|Bloquear|Desbloquear|Eliminar utilizador|Eliminar este utilizador?|Esta ação é permanente e não pode ser anulada. A conta do utilizador será removida permanentemente do sistema.|Nome de utilizador|Email|Membro desde|Estado|Presença|Funções|ID de utilizador inválido.|Não pode bloquear a sua própria conta.|Não pode forçar o fim de sessão da sua própria conta.|Falha ao revogar sessões ativas.|Não pode eliminar a sua própria conta.|Falha ao carregar utilizadores.|Selecione um utilizador...|Pesquisar utilizadores...|A carregar utilizadores...|Nenhum utilizador backend encontrado.|atual`,
  "pt-BR": `Gerenciamento de usuários|Gerencie usuários e suas funções. Acesso apenas para administradores.|Detalhes do usuário|Voltar para usuários|Nenhum usuário encontrado.|Pesquisar por nome de usuário ou email...|Ativo|Bloqueado|Online|Offline|Visualizador|Autor|Publicador|Admin|Acesso somente leitura ao frontend (sempre atribuído)|Pode criar e gerenciar o próprio conteúdo|Pode gerenciar e publicar conteúdo|Acesso completo ao backend|Editar funções|Editar funções do usuário|Selecione as funções a atribuir a este usuário.|Forçar logout|Forçar logout deste usuário?|Isso revogará imediatamente todas as sessões ativas do usuário. Ele será desconectado em todos os dispositivos e terá que entrar novamente para continuar. Isso não bloqueia a conta.|Bloquear usuário|Desbloquear usuário|Bloquear este usuário?|Desbloquear este usuário?|Isso impedirá o usuário de entrar até que o bloqueio expire (1 hora por padrão, configurável nas configurações do Clerk Attack Protection). Você pode desbloqueá-lo a qualquer momento.|Isso removerá o bloqueio de entrada e restaurará imediatamente o acesso do usuário.|Bloquear|Desbloquear|Excluir usuário|Excluir este usuário?|Esta ação é permanente e não pode ser desfeita. A conta do usuário será removida permanentemente do sistema.|Nome de usuário|Email|Membro desde|Status|Presença|Funções|ID de usuário inválido.|Você não pode bloquear sua própria conta.|Você não pode forçar logout da sua própria conta.|Falha ao revogar sessões ativas.|Você não pode excluir sua própria conta.|Falha ao carregar usuários.|Selecione um usuário...|Pesquisar usuários...|Carregando usuários...|Nenhum usuário backend encontrado.|atual`,
  nl: `Gebruikersbeheer|Beheer gebruikers en hun rollen. Alleen voor beheerders.|Gebruikersdetails|Terug naar gebruikers|Geen gebruikers gevonden.|Zoeken op gebruikersnaam of e-mail...|Actief|Vergrendeld|Online|Offline|Kijker|Auteur|Uitgever|Admin|Alleen-lezen toegang tot frontend (altijd toegewezen)|Kan eigen inhoud maken en beheren|Kan inhoud beheren en publiceren|Volledige backendtoegang|Rollen bewerken|Gebruikersrollen bewerken|Selecteer de rollen die aan deze gebruiker worden toegewezen.|Afmelden afdwingen|Deze gebruiker geforceerd afmelden?|Dit trekt onmiddellijk alle actieve sessies van de gebruiker in. De gebruiker wordt op elk apparaat afgemeld en moet opnieuw inloggen om verder te gaan. Dit vergrendelt het account niet.|Gebruiker vergrendelen|Gebruiker ontgrendelen|Deze gebruiker vergrendelen?|Deze gebruiker ontgrendelen?|Dit voorkomt dat de gebruiker inlogt totdat de vergrendeling verloopt (standaard 1 uur, configureerbaar in Clerk Attack Protection-instellingen). Je kunt de gebruiker op elk moment ontgrendelen.|Dit verwijdert de aanmeldvergrendeling en herstelt direct de toegang van de gebruiker.|Vergrendelen|Ontgrendelen|Gebruiker verwijderen|Deze gebruiker verwijderen?|Deze actie is permanent en kan niet ongedaan worden gemaakt. Het gebruikersaccount wordt permanent uit het systeem verwijderd.|Gebruikersnaam|E-mail|Lid sinds|Status|Aanwezigheid|Rollen|Ongeldige gebruikers-ID.|Je kunt je eigen account niet vergrendelen.|Je kunt je eigen account niet geforceerd afmelden.|Actieve sessies konden niet worden ingetrokken.|Je kunt je eigen account niet verwijderen.|Gebruikers konden niet worden geladen.|Selecteer een gebruiker...|Gebruikers zoeken...|Gebruikers laden...|Geen backend-gebruikers gevonden.|huidig`,
  pl: `Zarządzanie użytkownikami|Zarządzaj użytkownikami i ich rolami. Tylko administratorzy.|Szczegóły użytkownika|Wróć do użytkowników|Nie znaleziono użytkowników.|Szukaj według nazwy użytkownika lub emaila...|Aktywny|Zablokowany|Online|Offline|Przeglądający|Autor|Wydawca|Admin|Dostęp tylko do odczytu w frontendzie (zawsze przypisany)|Może tworzyć i zarządzać własną treścią|Może zarządzać treścią i publikować ją|Pełny dostęp do backendu|Edytuj role|Edytuj role użytkownika|Wybierz role do przypisania temu użytkownikowi.|Wymuś wylogowanie|Wymusić wylogowanie tego użytkownika?|To natychmiast unieważni wszystkie aktywne sesje użytkownika. Zostanie wylogowany na każdym urządzeniu i będzie musiał zalogować się ponownie, aby kontynuować. Nie blokuje to konta.|Zablokuj użytkownika|Odblokuj użytkownika|Zablokować tego użytkownika?|Odblokować tego użytkownika?|To uniemożliwi użytkownikowi logowanie do czasu wygaśnięcia blokady (domyślnie 1 godzina, konfigurowane w ustawieniach Clerk Attack Protection). Możesz odblokować go w każdej chwili.|To usunie blokadę logowania i natychmiast przywróci dostęp użytkownika.|Zablokuj|Odblokuj|Usuń użytkownika|Usunąć tego użytkownika?|Ta akcja jest trwała i nie można jej cofnąć. Konto użytkownika zostanie trwale usunięte z systemu.|Nazwa użytkownika|Email|Członek od|Status|Obecność|Role|Nieprawidłowy ID użytkownika.|Nie możesz zablokować własnego konta.|Nie możesz wymusić wylogowania własnego konta.|Nie udało się unieważnić aktywnych sesji.|Nie możesz usunąć własnego konta.|Nie udało się załadować użytkowników.|Wybierz użytkownika...|Szukaj użytkowników...|Ładowanie użytkowników...|Nie znaleziono użytkowników backendu.|bieżący`,
  tr: `Kullanıcı yönetimi|Kullanıcıları ve rollerini yönetin. Yalnızca admin erişimi.|Kullanıcı ayrıntıları|Kullanıcılara dön|Kullanıcı bulunamadı.|Kullanıcı adı veya email ile ara...|Aktif|Kilitli|Çevrimiçi|Çevrimdışı|Görüntüleyici|Yazar|Yayıncı|Admin|Frontend salt okunur erişim (her zaman atanır)|Kendi içeriğini oluşturabilir ve yönetebilir|İçeriği yönetebilir ve yayımlayabilir|Tam backend erişimi|Rolleri düzenle|Kullanıcı rollerini düzenle|Bu kullanıcıya atanacak rolleri seçin.|Zorla çıkış|Bu kullanıcının oturumu zorla kapatılsın mı?|Bu, kullanıcının tüm aktif oturumlarını hemen iptal eder. Kullanıcı her cihazda oturumdan çıkarılır ve devam etmek için tekrar oturum açması gerekir. Bu hesabı kilitlemez.|Kullanıcıyı kilitle|Kullanıcının kilidini aç|Bu kullanıcı kilitlensin mi?|Bu kullanıcının kilidi açılsın mı?|Bu, kilit süresi dolana kadar kullanıcının oturum açmasını engeller (varsayılan 1 saat, Clerk Attack Protection ayarlarında yapılandırılabilir). İstediğiniz zaman kilidi açabilirsiniz.|Bu, oturum açma kilidini kaldırır ve kullanıcının erişimini hemen geri yükler.|Kilitle|Kilidi aç|Kullanıcıyı sil|Bu kullanıcı silinsin mi?|Bu işlem kalıcıdır ve geri alınamaz. Kullanıcının hesabı sistemden kalıcı olarak kaldırılır.|Kullanıcı adı|Email|Üyelik başlangıcı|Durum|Varlık|Roller|Geçersiz kullanıcı ID'si.|Kendi hesabınızı kilitleyemezsiniz.|Kendi hesabınızdan zorla çıkış yaptıramazsınız.|Aktif oturumlar iptal edilemedi.|Kendi hesabınızı silemezsiniz.|Kullanıcılar yüklenemedi.|Bir kullanıcı seçin...|Kullanıcı ara...|Kullanıcılar yükleniyor...|Backend kullanıcısı bulunamadı.|geçerli`,
  mk: `Управување со корисници|Управувајте со корисници и нивните улоги. Само за администратори.|Детали за корисник|Назад кон корисници|Не се пронајдени корисници.|Пребарај по корисничко име или email...|Активен|Заклучен|Онлајн|Офлајн|Прегледувач|Автор|Издавач|Админ|Frontend пристап само за читање (секогаш доделен)|Може да креира и управува со сопствена содржина|Може да управува и објавува содржина|Целосен backend пристап|Уреди улоги|Уреди кориснички улоги|Изберете улоги за доделување на овој корисник.|Присилна одјава|Присилно да се одјави овој корисник?|Ова веднаш ќе ги поништи сите активни сесии на корисникот. Ќе биде одјавен на сите уреди и ќе мора повторно да се најави за да продолжи. Ова не ја заклучува сметката.|Заклучи корисник|Отклучи корисник|Да се заклучи овој корисник?|Да се отклучи овој корисник?|Ова ќе го спречи корисникот да се најави додека заклучувањето не истече (стандардно 1 час, конфигурирано во Clerk Attack Protection поставките). Можете да го отклучите во секое време.|Ова ќе го отстрани заклучувањето за најавување и веднаш ќе го врати пристапот на корисникот.|Заклучи|Отклучи|Избриши корисник|Да се избрише овој корисник?|Ова дејство е трајно и не може да се врати. Корисничката сметка ќе биде трајно отстранета од системот.|Корисничко име|Email|Член од|Статус|Присуство|Улоги|Невалиден ID на корисник.|Не можете да ја заклучите сопствената сметка.|Не можете присилно да ја одјавите сопствената сметка.|Не успеа поништувањето на активните сесии.|Не можете да ја избришете сопствената сметка.|Не успеа вчитувањето на корисници.|Изберете корисник...|Пребарај корисници...|Вчитување корисници...|Не се пронајдени backend корисници.|тековен`,
  bs: `Upravljanje korisnicima|Upravljajte korisnicima i njihovim ulogama. Samo za admine.|Detalji korisnika|Nazad na korisnike|Nema pronađenih korisnika.|Pretraži po korisničkom imenu ili emailu...|Aktivan|Zaključan|Online|Offline|Pregledač|Autor|Izdavač|Admin|Frontend pristup samo za čitanje (uvijek dodijeljen)|Može kreirati i upravljati vlastitim sadržajem|Može upravljati sadržajem i objavljivati ga|Potpun backend pristup|Uredi uloge|Uredi uloge korisnika|Odaberite uloge koje se dodjeljuju ovom korisniku.|Prinudna odjava|Prinudno odjaviti ovog korisnika?|Ovo će odmah opozvati sve aktivne sesije korisnika. Bit će odjavljen na svim uređajima i morat će se ponovo prijaviti da nastavi. Ovo ne zaključava nalog.|Zaključaj korisnika|Otključaj korisnika|Zaključati ovog korisnika?|Otključati ovog korisnika?|Ovo će spriječiti korisnika da se prijavi dok zaključavanje ne istekne (zadano 1 sat, podesivo u Clerk Attack Protection postavkama). Možete ga otključati u bilo kojem trenutku.|Ovo će ukloniti zaključavanje prijave i odmah vratiti pristup korisniku.|Zaključaj|Otključaj|Obriši korisnika|Obrisati ovog korisnika?|Ova radnja je trajna i ne može se poništiti. Korisnički nalog će biti trajno uklonjen iz sistema.|Korisničko ime|Email|Član od|Status|Prisustvo|Uloge|Neispravan ID korisnika.|Ne možete zaključati vlastiti nalog.|Ne možete prinudno odjaviti vlastiti nalog.|Opoziv aktivnih sesija nije uspio.|Ne možete obrisati vlastiti nalog.|Učitavanje korisnika nije uspjelo.|Odaberite korisnika...|Pretraži korisnike...|Učitavanje korisnika...|Nema pronađenih backend korisnika.|trenutni`,
  sl: `Upravljanje uporabnikov|Upravljajte uporabnike in njihove vloge. Samo za administratorje.|Podrobnosti uporabnika|Nazaj na uporabnike|Ni najdenih uporabnikov.|Išči po uporabniškem imenu ali emailu...|Aktiven|Zaklenjen|Online|Offline|Pregledovalec|Avtor|Izdajatelj|Admin|Frontend dostop samo za branje (vedno dodeljen)|Lahko ustvarja in upravlja lastno vsebino|Lahko upravlja in objavlja vsebino|Poln backend dostop|Uredi vloge|Uredi uporabniške vloge|Izberite vloge za dodelitev temu uporabniku.|Prisilna odjava|Prisilno odjaviti tega uporabnika?|To bo takoj preklicalo vse aktivne seje uporabnika. Odjavljen bo na vseh napravah in se bo moral za nadaljevanje znova prijaviti. To ne zaklene računa.|Zakleni uporabnika|Odkleni uporabnika|Zakleniti tega uporabnika?|Odkleniti tega uporabnika?|To bo uporabniku preprečilo prijavo, dokler zaklep ne poteče (privzeto 1 ura, nastavljivo v Clerk Attack Protection nastavitvah). Odklenete ga lahko kadar koli.|To bo odstranilo zaklep prijave in takoj obnovilo dostop uporabnika.|Zakleni|Odkleni|Izbriši uporabnika|Izbrisati tega uporabnika?|To dejanje je trajno in ga ni mogoče razveljaviti. Uporabniški račun bo trajno odstranjen iz sistema.|Uporabniško ime|Email|Član od|Stanje|Prisotnost|Vloge|Neveljaven ID uporabnika.|Ne morete zakleniti svojega računa.|Ne morete prisilno odjaviti svojega računa.|Preklic aktivnih sej ni uspel.|Ne morete izbrisati svojega računa.|Nalaganje uporabnikov ni uspelo.|Izberite uporabnika...|Išči uporabnike...|Nalaganje uporabnikov...|Ni najdenih backend uporabnikov.|trenutni`,
  ru: `Управление пользователями|Управляйте пользователями и их ролями. Только для администраторов.|Сведения о пользователе|Назад к пользователям|Пользователи не найдены.|Искать по имени пользователя или email...|Активен|Заблокирован|Онлайн|Офлайн|Просмотрщик|Автор|Издатель|Админ|Доступ к фронтенду только для чтения (назначается всегда)|Может создавать и управлять собственным контентом|Может управлять контентом и публиковать его|Полный доступ к backend|Редактировать роли|Редактировать роли пользователя|Выберите роли, которые нужно назначить этому пользователю.|Принудительный выход|Принудительно выйти этому пользователю?|Это немедленно отзовет все активные сессии пользователя. Он будет выведен из системы на всех устройствах и должен будет снова войти, чтобы продолжить. Это не блокирует учетную запись.|Заблокировать пользователя|Разблокировать пользователя|Заблокировать этого пользователя?|Разблокировать этого пользователя?|Это запретит пользователю входить, пока блокировка не истечет (по умолчанию 1 час, настраивается в параметрах Clerk Attack Protection). Вы можете разблокировать его в любое время.|Это снимет блокировку входа и немедленно восстановит доступ пользователя.|Заблокировать|Разблокировать|Удалить пользователя|Удалить этого пользователя?|Это действие является постоянным и не может быть отменено. Учетная запись пользователя будет навсегда удалена из системы.|Имя пользователя|Email|Участник с|Статус|Присутствие|Роли|Недействительный ID пользователя.|Вы не можете заблокировать свою учетную запись.|Вы не можете принудительно выйти из своей учетной записи.|Не удалось отозвать активные сессии.|Вы не можете удалить свою учетную запись.|Не удалось загрузить пользователей.|Выберите пользователя...|Искать пользователей...|Загрузка пользователей...|Backend-пользователи не найдены.|текущий`,
  hu: `Felhasználókezelés|Felhasználók és szerepköreik kezelése. Csak adminisztrátoroknak.|Felhasználó adatai|Vissza a felhasználókhoz|Nem találhatók felhasználók.|Keresés felhasználónév vagy email alapján...|Aktív|Zárolt|Online|Offline|Megtekintő|Szerző|Kiadó|Admin|Csak olvasási frontend hozzáférés (mindig hozzárendelve)|Saját tartalmat hozhat létre és kezelhet|Tartalmat kezelhet és publikálhat|Teljes backend hozzáférés|Szerepkörök szerkesztése|Felhasználói szerepkörök szerkesztése|Válassza ki a felhasználóhoz rendelendő szerepköröket.|Kijelentkeztetés kényszerítése|Kényszerítve kijelentkezteti ezt a felhasználót?|Ez azonnal visszavonja a felhasználó összes aktív munkamenetét. Minden eszközön kijelentkezik, és a folytatáshoz újra be kell jelentkeznie. Ez nem zárolja a fiókot.|Felhasználó zárolása|Felhasználó feloldása|Zárolja ezt a felhasználót?|Feloldja ezt a felhasználót?|Ez megakadályozza, hogy a felhasználó bejelentkezzen a zárolás lejártáig (alapértelmezés szerint 1 óra, a Clerk Attack Protection beállításaiban módosítható). Bármikor feloldhatja.|Ez eltávolítja a bejelentkezési zárolást és azonnal visszaállítja a felhasználó hozzáférését.|Zárolás|Feloldás|Felhasználó törlése|Törli ezt a felhasználót?|Ez a művelet végleges és nem vonható vissza. A felhasználói fiók véglegesen eltávolításra kerül a rendszerből.|Felhasználónév|Email|Tagság kezdete|Állapot|Jelenlét|Szerepkörök|Érvénytelen felhasználói ID.|Nem zárolhatja a saját fiókját.|Nem kényszerítheti a saját fiókja kijelentkeztetését.|Az aktív munkamenetek visszavonása sikertelen.|Nem törölheti a saját fiókját.|A felhasználók betöltése sikertelen.|Válasszon felhasználót...|Felhasználók keresése...|Felhasználók betöltése...|Nem találhatók backend-felhasználók.|aktuális`,
  bg: `Управление на потребители|Управлявайте потребителите и техните роли. Само за администратори.|Детайли за потребителя|Назад към потребителите|Няма намерени потребители.|Търсене по потребителско име или email...|Активен|Заключен|Онлайн|Офлайн|Преглеждащ|Автор|Издател|Админ|Frontend достъп само за четене (винаги назначен)|Може да създава и управлява собствено съдържание|Може да управлява и публикува съдържание|Пълен backend достъп|Редактиране на роли|Редактиране на роли на потребител|Изберете ролите за този потребител.|Принудително излизане|Принудително излизане на този потребител?|Това веднага ще отмени всички активни сесии на потребителя. Той ще бъде изведен от всички устройства и ще трябва да влезе отново, за да продължи. Това не заключва акаунта.|Заключи потребител|Отключи потребител|Да се заключи ли този потребител?|Да се отключи ли този потребител?|Това ще попречи на потребителя да влиза, докато заключването не изтече (1 час по подразбиране, конфигурируемо в настройките Clerk Attack Protection). Можете да го отключите по всяко време.|Това ще премахне заключването за вход и веднага ще възстанови достъпа на потребителя.|Заключи|Отключи|Изтрий потребител|Да се изтрие ли този потребител?|Това действие е постоянно и не може да бъде отменено. Потребителският акаунт ще бъде окончателно премахнат от системата.|Потребителско име|Email|Член от|Статус|Присъствие|Роли|Невалиден ID на потребител.|Не можете да заключите собствения си акаунт.|Не можете принудително да излезете от собствения си акаунт.|Неуспешно отмяна на активните сесии.|Не можете да изтриете собствения си акаунт.|Неуспешно зареждане на потребители.|Изберете потребител...|Търсене на потребители...|Зареждане на потребители...|Няма намерени backend потребители.|текущ`,
  ja: `ユーザー管理|ユーザーとロールを管理します。管理者のみ。|ユーザー詳細|ユーザーに戻る|ユーザーが見つかりません。|ユーザー名またはメールで検索...|有効|ロック済み|オンライン|オフライン|閲覧者|作成者|公開者|管理者|フロントエンドの読み取り専用アクセス（常に割り当て）|自分のコンテンツを作成および管理できます|コンテンツを管理して公開できます|完全なバックエンドアクセス|ロールを編集|ユーザーロールを編集|このユーザーに割り当てるロールを選択します。|強制ログアウト|このユーザーを強制ログアウトしますか？|ユーザーのすべてのアクティブセッションを直ちに取り消します。すべてのデバイスでサインアウトされ、続行するには再度サインインが必要です。アカウントはロックされません。|ユーザーをロック|ユーザーのロックを解除|このユーザーをロックしますか？|このユーザーのロックを解除しますか？|ロックが期限切れになるまでユーザーはサインインできません（既定は1時間、Clerk Attack Protection設定で変更可能）。いつでもロックを解除できます。|サインインロックを解除し、ユーザーのアクセスを直ちに復元します。|ロック|ロック解除|ユーザーを削除|このユーザーを削除しますか？|この操作は永続的で元に戻せません。ユーザーアカウントはシステムから完全に削除されます。|ユーザー名|メール|メンバー登録日|ステータス|プレゼンス|ロール|無効なユーザーIDです。|自分のアカウントはロックできません。|自分のアカウントを強制ログアウトできません。|アクティブセッションの取り消しに失敗しました。|自分のアカウントは削除できません。|ユーザーの読み込みに失敗しました。|ユーザーを選択...|ユーザーを検索...|ユーザーを読み込み中...|バックエンドユーザーが見つかりません。|現在`,
  "zh-Hans": `用户管理|管理用户及其角色。仅管理员可访问。|用户详情|返回用户|未找到用户。|按用户名或邮箱搜索...|活跃|已锁定|在线|离线|查看者|作者|发布者|管理员|前端只读访问权限（始终分配）|可以创建和管理自己的内容|可以管理并发布内容|完整后端访问权限|编辑角色|编辑用户角色|选择要分配给此用户的角色。|强制登出|强制登出此用户？|这将立即撤销该用户的所有活动会话。用户会在所有设备上登出，并且必须重新登录才能继续。这不会锁定账户。|锁定用户|解锁用户|锁定此用户？|解锁此用户？|这会阻止用户登录，直到锁定过期（默认 1 小时，可在 Clerk Attack Protection 设置中配置）。你可以随时解锁。|这会移除登录锁定并立即恢复用户访问。|锁定|解锁|删除用户|删除此用户？|此操作是永久性的，无法撤销。用户账户将从系统中永久移除。|用户名|邮箱|成员起始日期|状态|在线状态|角色|无效的用户 ID。|你不能锁定自己的账户。|你不能强制登出自己的账户。|无法撤销活动会话。|你不能删除自己的账户。|加载用户失败。|选择用户...|搜索用户...|正在加载用户...|未找到后端用户。|当前`,
  "zh-Hant": `使用者管理|管理使用者及其角色。僅限管理員存取。|使用者詳細資料|返回使用者|找不到使用者。|依使用者名稱或 email 搜尋...|啟用|已鎖定|線上|離線|檢視者|作者|發佈者|管理員|前端唯讀存取權（永遠指派）|可以建立並管理自己的內容|可以管理並發佈內容|完整後端存取權|編輯角色|編輯使用者角色|選擇要指派給此使用者的角色。|強制登出|強制登出此使用者？|這會立即撤銷該使用者所有作用中的工作階段。使用者會在所有裝置上登出，且必須重新登入才能繼續。這不會鎖定帳號。|鎖定使用者|解除鎖定使用者|鎖定此使用者？|解除鎖定此使用者？|這會阻止使用者登入，直到鎖定過期（預設 1 小時，可在 Clerk Attack Protection 設定中調整）。你可以隨時解除鎖定。|這會移除登入鎖定並立即恢復使用者存取。|鎖定|解除鎖定|刪除使用者|刪除此使用者？|此動作是永久性的，無法復原。使用者帳號將從系統永久移除。|使用者名稱|Email|成員起始日期|狀態|上線狀態|角色|無效的使用者 ID。|你不能鎖定自己的帳號。|你不能強制登出自己的帳號。|無法撤銷作用中的工作階段。|你不能刪除自己的帳號。|載入使用者失敗。|選擇使用者...|搜尋使用者...|正在載入使用者...|找不到後端使用者。|目前`,
  ar: `إدارة المستخدمين|إدارة المستخدمين وأدوارهم. وصول المسؤولين فقط.|تفاصيل المستخدم|العودة إلى المستخدمين|لم يتم العثور على مستخدمين.|البحث باسم المستخدم أو البريد الإلكتروني...|نشط|مقفل|متصل|غير متصل|مشاهد|مؤلف|ناشر|مسؤول|وصول قراءة فقط للواجهة الأمامية (مخصص دائما)|يمكنه إنشاء وإدارة محتواه الخاص|يمكنه إدارة المحتوى ونشره|وصول كامل للواجهة الخلفية|تحرير الأدوار|تحرير أدوار المستخدم|حدد الأدوار المراد تعيينها لهذا المستخدم.|فرض تسجيل الخروج|فرض تسجيل خروج هذا المستخدم؟|سيؤدي هذا إلى إلغاء كل الجلسات النشطة للمستخدم فورا. سيتم تسجيل خروجه من كل الأجهزة وسيحتاج إلى تسجيل الدخول مرة أخرى للمتابعة. هذا لا يقفل الحساب.|قفل المستخدم|إلغاء قفل المستخدم|قفل هذا المستخدم؟|إلغاء قفل هذا المستخدم؟|سيمنع هذا المستخدم من تسجيل الدخول حتى تنتهي مدة القفل (ساعة واحدة افتراضيا، قابلة للضبط في إعدادات Clerk Attack Protection). يمكنك إلغاء القفل في أي وقت.|سيؤدي هذا إلى إزالة قفل تسجيل الدخول واستعادة وصول المستخدم فورا.|قفل|إلغاء القفل|حذف المستخدم|حذف هذا المستخدم؟|هذا الإجراء دائم ولا يمكن التراجع عنه. ستتم إزالة حساب المستخدم نهائيا من النظام.|اسم المستخدم|البريد الإلكتروني|عضو منذ|الحالة|التواجد|الأدوار|معرّف المستخدم غير صالح.|لا يمكنك قفل حسابك الخاص.|لا يمكنك فرض تسجيل خروج حسابك الخاص.|فشل إلغاء الجلسات النشطة.|لا يمكنك حذف حسابك الخاص.|فشل تحميل المستخدمين.|اختر مستخدما...|البحث عن مستخدمين...|تحميل المستخدمين...|لم يتم العثور على مستخدمي backend.|الحالي`,
  id: `Manajemen pengguna|Kelola pengguna dan perannya. Hanya akses admin.|Detail pengguna|Kembali ke pengguna|Tidak ada pengguna ditemukan.|Cari berdasarkan nama pengguna atau email...|Aktif|Terkunci|Online|Offline|Penampil|Penulis|Penerbit|Admin|Akses frontend hanya baca (selalu ditetapkan)|Dapat membuat dan mengelola konten sendiri|Dapat mengelola dan menerbitkan konten|Akses backend penuh|Edit peran|Edit peran pengguna|Pilih peran yang akan ditetapkan ke pengguna ini.|Paksa logout|Paksa logout pengguna ini?|Ini akan segera mencabut semua sesi aktif pengguna. Pengguna akan keluar dari semua perangkat dan harus masuk lagi untuk melanjutkan. Ini tidak mengunci akun.|Kunci pengguna|Buka kunci pengguna|Kunci pengguna ini?|Buka kunci pengguna ini?|Ini akan mencegah pengguna masuk sampai kunci kedaluwarsa (default 1 jam, dapat dikonfigurasi di pengaturan Clerk Attack Protection). Anda dapat membuka kuncinya kapan saja.|Ini akan menghapus kunci masuk dan segera memulihkan akses pengguna.|Kunci|Buka kunci|Hapus pengguna|Hapus pengguna ini?|Tindakan ini permanen dan tidak dapat dibatalkan. Akun pengguna akan dihapus permanen dari sistem.|Nama pengguna|Email|Anggota sejak|Status|Kehadiran|Peran|ID pengguna tidak valid.|Anda tidak dapat mengunci akun sendiri.|Anda tidak dapat memaksa logout akun sendiri.|Gagal mencabut sesi aktif.|Anda tidak dapat menghapus akun sendiri.|Gagal memuat pengguna.|Pilih pengguna...|Cari pengguna...|Memuat pengguna...|Tidak ada pengguna backend ditemukan.|saat ini`,
  cs: `Správa uživatelů|Spravujte uživatele a jejich role. Přístup pouze pro administrátory.|Podrobnosti uživatele|Zpět na uživatele|Nebyli nalezeni žádní uživatelé.|Hledat podle uživatelského jména nebo emailu...|Aktivní|Uzamčený|Online|Offline|Prohlížeč|Autor|Vydavatel|Admin|Pouze čtení frontendu (vždy přiřazeno)|Může vytvářet a spravovat vlastní obsah|Může spravovat a publikovat obsah|Plný přístup k backendu|Upravit role|Upravit role uživatele|Vyberte role, které se mají tomuto uživateli přiřadit.|Vynutit odhlášení|Vynutit odhlášení tohoto uživatele?|Tím okamžitě zrušíte všechny aktivní relace uživatele. Bude odhlášen na všech zařízeních a pro pokračování se bude muset znovu přihlásit. Účet se tím neuzamkne.|Uzamknout uživatele|Odemknout uživatele|Uzamknout tohoto uživatele?|Odemknout tohoto uživatele?|To uživateli zabrání v přihlášení, dokud zámek nevyprší (výchozí hodnota je 1 hodina, konfigurovatelné v nastavení Clerk Attack Protection). Odemknout ho můžete kdykoli.|Tím odstraníte zámek přihlášení a okamžitě obnovíte přístup uživatele.|Uzamknout|Odemknout|Smazat uživatele|Smazat tohoto uživatele?|Tato akce je trvalá a nelze ji vrátit zpět. Uživatelský účet bude trvale odstraněn ze systému.|Uživatelské jméno|Email|Členem od|Stav|Přítomnost|Role|Neplatné ID uživatele.|Nemůžete uzamknout vlastní účet.|Nemůžete vynutit odhlášení vlastního účtu.|Aktivní relace se nepodařilo zrušit.|Nemůžete smazat vlastní účet.|Uživatele se nepodařilo načíst.|Vyberte uživatele...|Hledat uživatele...|Načítání uživatelů...|Nebyli nalezeni žádní backend uživatelé.|aktuální`,
  ro: `Gestionarea utilizatorilor|Gestionează utilizatorii și rolurile lor. Acces doar pentru administratori.|Detalii utilizator|Înapoi la utilizatori|Nu s-au găsit utilizatori.|Caută după nume de utilizator sau email...|Activ|Blocat|Online|Offline|Vizualizator|Autor|Editor|Admin|Acces frontend doar citire (atribuit întotdeauna)|Poate crea și gestiona propriul conținut|Poate gestiona și publica conținut|Acces backend complet|Editează rolurile|Editează rolurile utilizatorului|Selectează rolurile de atribuit acestui utilizator.|Forțează delogarea|Forțezi delogarea acestui utilizator?|Aceasta va revoca imediat toate sesiunile active ale utilizatorului. Va fi delogat de pe toate dispozitivele și va trebui să se autentifice din nou pentru a continua. Aceasta nu blochează contul.|Blochează utilizatorul|Deblochează utilizatorul|Blochezi acest utilizator?|Deblochezi acest utilizator?|Aceasta va împiedica utilizatorul să se autentifice până când blocarea expiră (implicit 1 oră, configurabil în setările Clerk Attack Protection). Îl poți debloca oricând.|Aceasta va elimina blocarea autentificării și va restaura imediat accesul utilizatorului.|Blochează|Deblochează|Șterge utilizatorul|Ștergi acest utilizator?|Această acțiune este permanentă și nu poate fi anulată. Contul utilizatorului va fi eliminat definitiv din sistem.|Nume utilizator|Email|Membru din|Stare|Prezență|Roluri|ID utilizator nevalid.|Nu îți poți bloca propriul cont.|Nu îți poți forța delogarea propriului cont.|Revocarea sesiunilor active a eșuat.|Nu îți poți șterge propriul cont.|Încărcarea utilizatorilor a eșuat.|Selectează un utilizator...|Caută utilizatori...|Se încarcă utilizatorii...|Nu s-au găsit utilizatori backend.|curent`,
  el: `Διαχείριση χρηστών|Διαχειριστείτε χρήστες και ρόλους. Πρόσβαση μόνο για διαχειριστές.|Λεπτομέρειες χρήστη|Πίσω στους χρήστες|Δεν βρέθηκαν χρήστες.|Αναζήτηση με όνομα χρήστη ή email...|Ενεργός|Κλειδωμένος|Online|Offline|Προβολέας|Συντάκτης|Εκδότης|Admin|Πρόσβαση μόνο ανάγνωσης στο frontend (πάντα εκχωρημένη)|Μπορεί να δημιουργεί και να διαχειρίζεται δικό του περιεχόμενο|Μπορεί να διαχειρίζεται και να δημοσιεύει περιεχόμενο|Πλήρης πρόσβαση backend|Επεξεργασία ρόλων|Επεξεργασία ρόλων χρήστη|Επιλέξτε τους ρόλους που θα ανατεθούν σε αυτόν τον χρήστη.|Αναγκαστική αποσύνδεση|Να αποσυνδεθεί αναγκαστικά αυτός ο χρήστης;|Αυτό θα ανακαλέσει αμέσως όλες τις ενεργές συνεδρίες του χρήστη. Θα αποσυνδεθεί από κάθε συσκευή και θα πρέπει να συνδεθεί ξανά για να συνεχίσει. Αυτό δεν κλειδώνει τον λογαριασμό.|Κλείδωμα χρήστη|Ξεκλείδωμα χρήστη|Να κλειδωθεί αυτός ο χρήστης;|Να ξεκλειδωθεί αυτός ο χρήστης;|Αυτό θα εμποδίσει τον χρήστη να συνδεθεί μέχρι να λήξει το κλείδωμα (1 ώρα από προεπιλογή, ρυθμιζόμενο στις ρυθμίσεις Clerk Attack Protection). Μπορείτε να τον ξεκλειδώσετε ανά πάσα στιγμή.|Αυτό θα αφαιρέσει το κλείδωμα σύνδεσης και θα επαναφέρει αμέσως την πρόσβαση του χρήστη.|Κλείδωμα|Ξεκλείδωμα|Διαγραφή χρήστη|Να διαγραφεί αυτός ο χρήστης;|Αυτή η ενέργεια είναι μόνιμη και δεν μπορεί να αναιρεθεί. Ο λογαριασμός χρήστη θα αφαιρεθεί οριστικά από το σύστημα.|Όνομα χρήστη|Email|Μέλος από|Κατάσταση|Παρουσία|Ρόλοι|Μη έγκυρο ID χρήστη.|Δεν μπορείτε να κλειδώσετε τον δικό σας λογαριασμό.|Δεν μπορείτε να αποσυνδέσετε αναγκαστικά τον δικό σας λογαριασμό.|Αποτυχία ανάκλησης ενεργών συνεδριών.|Δεν μπορείτε να διαγράψετε τον δικό σας λογαριασμό.|Αποτυχία φόρτωσης χρηστών.|Επιλέξτε χρήστη...|Αναζήτηση χρηστών...|Φόρτωση χρηστών...|Δεν βρέθηκαν backend χρήστες.|τρέχων`,
  da: `Brugeradministration|Administrer brugere og deres roller. Kun administratoradgang.|Brugerdetaljer|Tilbage til brugere|Ingen brugere fundet.|Søg efter brugernavn eller email...|Aktiv|Låst|Online|Offline|Seer|Forfatter|Udgiver|Admin|Skrivebeskyttet frontend-adgang (altid tildelt)|Kan oprette og administrere eget indhold|Kan administrere og udgive indhold|Fuld backend-adgang|Rediger roller|Rediger brugerroller|Vælg de roller, der skal tildeles denne bruger.|Tving log ud|Tving denne bruger til at logge ud?|Dette tilbagekalder straks alle aktive sessioner for brugeren. Brugeren logges ud på alle enheder og skal logge ind igen for at fortsætte. Dette låser ikke kontoen.|Lås bruger|Lås bruger op|Lås denne bruger?|Lås denne bruger op?|Dette forhindrer brugeren i at logge ind, indtil låsen udløber (1 time som standard, konfigurerbart i Clerk Attack Protection-indstillinger). Du kan låse op når som helst.|Dette fjerner login-låsen og gendanner straks brugerens adgang.|Lås|Lås op|Slet bruger|Slet denne bruger?|Denne handling er permanent og kan ikke fortrydes. Brugerens konto fjernes permanent fra systemet.|Brugernavn|Email|Medlem siden|Status|Tilstedeværelse|Roller|Ugyldigt bruger-ID.|Du kan ikke låse din egen konto.|Du kan ikke tvinge din egen konto til at logge ud.|Aktive sessioner kunne ikke tilbagekaldes.|Du kan ikke slette din egen konto.|Kunne ikke indlæse brugere.|Vælg en bruger...|Søg brugere...|Indlæser brugere...|Ingen backend-brugere fundet.|nuværende`,
  sv: `Användarhantering|Hantera användare och deras roller. Endast administratörer.|Användaruppgifter|Tillbaka till användare|Inga användare hittades.|Sök efter användarnamn eller email...|Aktiv|Låst|Online|Offline|Visare|Författare|Publicerare|Admin|Skrivskyddad frontend-åtkomst (alltid tilldelad)|Kan skapa och hantera eget innehåll|Kan hantera och publicera innehåll|Full backend-åtkomst|Redigera roller|Redigera användarroller|Välj rollerna som ska tilldelas den här användaren.|Tvinga utloggning|Tvinga utloggning av denna användare?|Detta återkallar omedelbart alla aktiva sessioner för användaren. Användaren loggas ut på alla enheter och måste logga in igen för att fortsätta. Detta låser inte kontot.|Lås användare|Lås upp användare|Låsa denna användare?|Låsa upp denna användare?|Detta hindrar användaren från att logga in tills låset löper ut (1 timme som standard, konfigurerbart i Clerk Attack Protection-inställningar). Du kan låsa upp när som helst.|Detta tar bort inloggningslåset och återställer användarens åtkomst omedelbart.|Lås|Lås upp|Ta bort användare|Ta bort denna användare?|Denna åtgärd är permanent och kan inte ångras. Användarkontot tas bort permanent från systemet.|Användarnamn|Email|Medlem sedan|Status|Närvaro|Roller|Ogiltigt användar-ID.|Du kan inte låsa ditt eget konto.|Du kan inte tvinga utloggning av ditt eget konto.|Det gick inte att återkalla aktiva sessioner.|Du kan inte ta bort ditt eget konto.|Kunde inte läsa in användare.|Välj en användare...|Sök användare...|Läser in användare...|Inga backend-användare hittades.|aktuell`,
  nb: `Brukeradministrasjon|Administrer brukere og rollene deres. Kun administratorer.|Brukerdetaljer|Tilbake til brukere|Ingen brukere funnet.|Søk etter brukernavn eller email...|Aktiv|Låst|Online|Offline|Seer|Forfatter|Utgiver|Admin|Skrivebeskyttet frontend-tilgang (alltid tildelt)|Kan opprette og administrere eget innhold|Kan administrere og publisere innhold|Full backend-tilgang|Rediger roller|Rediger brukerroller|Velg rollene som skal tildeles denne brukeren.|Tving utlogging|Tving denne brukeren til å logge ut?|Dette tilbakekaller umiddelbart alle aktive økter for brukeren. Brukeren logges ut på alle enheter og må logge inn igjen for å fortsette. Dette låser ikke kontoen.|Lås bruker|Lås opp bruker|Låse denne brukeren?|Låse opp denne brukeren?|Dette hindrer brukeren i å logge inn til låsen utløper (1 time som standard, konfigurerbart i Clerk Attack Protection-innstillingene). Du kan låse opp når som helst.|Dette fjerner innloggingslåsen og gjenoppretter brukerens tilgang umiddelbart.|Lås|Lås opp|Slett bruker|Slette denne brukeren?|Denne handlingen er permanent og kan ikke angres. Brukerkontoen fjernes permanent fra systemet.|Brukernavn|Email|Medlem siden|Status|Tilstedeværelse|Roller|Ugyldig bruker-ID.|Du kan ikke låse din egen konto.|Du kan ikke tvinge din egen konto til å logge ut.|Kunne ikke tilbakekalle aktive økter.|Du kan ikke slette din egen konto.|Kunne ikke laste brukere.|Velg en bruker...|Søk brukere...|Laster brukere...|Ingen backend-brukere funnet.|nåværende`,
  nn: `Brukaradministrasjon|Administrer brukarar og rollene deira. Berre administratorar.|Brukardetaljar|Tilbake til brukarar|Ingen brukarar funne.|Søk etter brukarnamn eller email...|Aktiv|Låst|Online|Offline|Sjåar|Forfattar|Utgjevar|Admin|Skriveverna frontend-tilgang (alltid tildelt)|Kan opprette og administrere eige innhald|Kan administrere og publisere innhald|Full backend-tilgang|Rediger roller|Rediger brukarroller|Vel rollene som skal tildelast denne brukaren.|Tving utlogging|Tving denne brukaren til å logge ut?|Dette tilbakekallar straks alle aktive økter for brukaren. Brukaren blir logga ut på alle einingar og må logge inn på nytt for å halde fram. Dette låser ikkje kontoen.|Lås brukar|Lås opp brukar|Låse denne brukaren?|Låse opp denne brukaren?|Dette hindrar brukaren i å logge inn til låsen går ut (1 time som standard, konfigurerbart i Clerk Attack Protection-innstillingane). Du kan låse opp når som helst.|Dette fjernar innloggingslåsen og gjenopprettar tilgangen til brukaren straks.|Lås|Lås opp|Slett brukar|Slette denne brukaren?|Denne handlinga er permanent og kan ikkje angrast. Brukarkontoen blir fjerna permanent frå systemet.|Brukarnamn|Email|Medlem sidan|Status|Tilstadevering|Roller|Ugyldig brukar-ID.|Du kan ikkje låse din eigen konto.|Du kan ikkje tvinge din eigen konto til å logge ut.|Kunne ikkje tilbakekalle aktive økter.|Du kan ikkje slette din eigen konto.|Kunne ikkje laste brukarar.|Vel ein brukar...|Søk brukarar...|Lastar brukarar...|Ingen backend-brukarar funne.|noverande`,
  fi: `Käyttäjien hallinta|Hallitse käyttäjiä ja heidän roolejaan. Vain ylläpitäjille.|Käyttäjän tiedot|Takaisin käyttäjiin|Käyttäjiä ei löytynyt.|Hae käyttäjänimellä tai emaililla...|Aktiivinen|Lukittu|Online|Offline|Katsoja|Tekijä|Julkaisija|Admin|Vain luku -pääsy frontendiin (aina määritetty)|Voi luoda ja hallita omaa sisältöä|Voi hallita ja julkaista sisältöä|Täysi backend-käyttöoikeus|Muokkaa rooleja|Muokkaa käyttäjärooleja|Valitse tälle käyttäjälle määritettävät roolit.|Pakota uloskirjautuminen|Pakotetaanko tämä käyttäjä kirjautumaan ulos?|Tämä peruuttaa välittömästi kaikki käyttäjän aktiiviset istunnot. Käyttäjä kirjataan ulos kaikilta laitteilta ja hänen on kirjauduttava uudelleen jatkaakseen. Tämä ei lukitse tiliä.|Lukitse käyttäjä|Avaa käyttäjän lukitus|Lukitaanko tämä käyttäjä?|Avataanko tämän käyttäjän lukitus?|Tämä estää käyttäjää kirjautumasta sisään, kunnes lukitus vanhenee (oletuksena 1 tunti, määritettävissä Clerk Attack Protection -asetuksissa). Voit avata lukituksen milloin tahansa.|Tämä poistaa kirjautumislukituksen ja palauttaa käyttäjän pääsyn välittömästi.|Lukitse|Avaa lukitus|Poista käyttäjä|Poistetaanko tämä käyttäjä?|Tämä toiminto on pysyvä eikä sitä voi kumota. Käyttäjätili poistetaan järjestelmästä pysyvästi.|Käyttäjänimi|Email|Jäsen alkaen|Tila|Läsnäolo|Roolit|Virheellinen käyttäjä-ID.|Et voi lukita omaa tiliäsi.|Et voi pakottaa omaa tiliäsi uloskirjautumaan.|Aktiivisten istuntojen peruuttaminen epäonnistui.|Et voi poistaa omaa tiliäsi.|Käyttäjien lataus epäonnistui.|Valitse käyttäjä...|Hae käyttäjiä...|Ladataan käyttäjiä...|Backend-käyttäjiä ei löytynyt.|nykyinen`,
  is: `Notendastjórnun|Stjórnaðu notendum og hlutverkum þeirra. Aðeins stjórnendur.|Notandaupplýsingar|Til baka í notendur|Engir notendur fundust.|Leita eftir notandanafni eða emaili...|Virkur|Læstur|Online|Offline|Skoðandi|Höfundur|Útgefandi|Admin|Lesaðgangur að frontend (alltaf úthlutaður)|Getur búið til og stjórnað eigin efni|Getur stjórnað og birt efni|Fullur backend-aðgangur|Breyta hlutverkum|Breyta hlutverkum notanda|Veldu hlutverkin sem á að úthluta þessum notanda.|Þvinga útskráningu|Þvinga þennan notanda til að skrá sig út?|Þetta afturkallar strax allar virkar setur notandans. Notandinn verður skráður út á öllum tækjum og þarf að skrá sig inn aftur til að halda áfram. Þetta læsir ekki reikningnum.|Læsa notanda|Aflæsa notanda|Læsa þessum notanda?|Aflæsa þessum notanda?|Þetta kemur í veg fyrir að notandinn skrái sig inn þar til læsingin rennur út (sjálfgefið 1 klst., stillanlegt í Clerk Attack Protection stillingum). Þú getur aflæst hvenær sem er.|Þetta fjarlægir innskráningarlæsinguna og endurheimtir aðgang notandans strax.|Læsa|Aflæsa|Eyða notanda|Eyða þessum notanda?|Þessi aðgerð er varanleg og ekki er hægt að afturkalla hana. Notandareikningurinn verður fjarlægður varanlega úr kerfinu.|Notandanafn|Email|Meðlimur síðan|Staða|Viðvera|Hlutverk|Ógilt notanda-ID.|Þú getur ekki læst eigin reikningi.|Þú getur ekki þvingað eigin reikning til útskráningar.|Ekki tókst að afturkalla virkar setur.|Þú getur ekki eytt eigin reikningi.|Ekki tókst að hlaða notendum.|Veldu notanda...|Leita í notendum...|Hleð notendum...|Engir backend-notendur fundust.|núverandi`,
} satisfies Record<LocalizedLanguage, string>;

const USER_MANAGEMENT_TRANSLATION_OVERRIDES: Partial<
  Record<LocalizedLanguage, Partial<Record<UserManagementSource, string>>>
> = {
  "sr-Latn": {
    Online: "Na mreži",
    Offline: "Van mreže",
    Admin: "Administrator",
    Email: "E-pošta",
    Status: "Stanje",
  },
  "sr-Cyrl": {
    Email: "Е-пошта",
  },
  hr: {
    Online: "Na mreži",
    Offline: "Izvan mreže",
    Admin: "Administrator",
    Email: "E-pošta",
    Status: "Stanje",
  },
  de: {
    Online: "Im Netz",
    Offline: "Nicht im Netz",
    Admin: "Administrator",
    Status: "Zustand",
  },
  fr: {
    Admin: "Administrateur",
    Email: "E-mail",
  },
  es: {
    Admin: "Administrador",
    Email: "Correo",
    Roles: "Funciones",
  },
  it: {
    Online: "In linea",
    Offline: "Non in linea",
    Admin: "Amministratore",
    Email: "E-mail",
  },
  pt: {
    Online: "Em linha",
    Offline: "Sem ligação",
    Admin: "Administrador",
    Email: "E-mail",
  },
  "pt-BR": {
    Online: "Conectado",
    Offline: "Desconectado",
    Admin: "Administrador",
    Email: "E-mail",
    Status: "Situação",
  },
  nl: {
    Online: "Verbonden",
    Offline: "Niet verbonden",
    Admin: "Beheerder",
    Status: "Toestand",
  },
  pl: {
    Online: "Dostępny",
    Offline: "Niedostępny",
    Admin: "Administrator",
    Email: "E-mail",
    Status: "Stan",
  },
  tr: {
    Admin: "Yönetici",
    Email: "E-posta",
  },
  mk: {
    Email: "Е-пошта",
  },
  bs: {
    Online: "Na mreži",
    Offline: "Van mreže",
    Admin: "Administrator",
    Email: "E-pošta",
    Status: "Stanje",
  },
  sl: {
    Online: "Povezan",
    Offline: "Nepovezan",
    Admin: "Skrbnik",
    Email: "E-pošta",
  },
  ru: {
    Email: "Эл. почта",
  },
  hu: {
    Online: "Elérhető",
    Offline: "Nem elérhető",
    Admin: "Rendszergazda",
    Email: "E-mail",
  },
  bg: {
    Email: "Имейл",
  },
  "zh-Hant": {
    Email: "電子郵件",
  },
  id: {
    Online: "Daring",
    Offline: "Luring",
    Admin: "Administrator",
    Email: "Surel",
    Status: "Keadaan",
  },
  cs: {
    Online: "Připojen",
    Offline: "Odpojen",
    Admin: "Správce",
    Email: "E-mail",
  },
  ro: {
    Online: "Conectat",
    Offline: "Deconectat",
    Admin: "Administrator",
    Email: "E-mail",
  },
  el: {
    Online: "Σε σύνδεση",
    Offline: "Εκτός σύνδεσης",
    Admin: "Διαχειριστής",
    Email: "Ηλ. ταχυδρομείο",
  },
  da: {
    Online: "Forbundet",
    Offline: "Ikke forbundet",
    Admin: "Administrator",
    Email: "E-mail",
    Status: "Tilstand",
  },
  sv: {
    Online: "Ansluten",
    Offline: "Frånkopplad",
    Admin: "Administratör",
    Email: "E-post",
    Status: "Tillstånd",
  },
  nb: {
    Online: "Tilkoblet",
    Offline: "Frakoblet",
    Admin: "Administrator",
    Email: "E-post",
    Status: "Tilstand",
  },
  nn: {
    Online: "Tilkobla",
    Offline: "Fråkopla",
    Admin: "Administrator",
    Email: "E-post",
    Status: "Tilstand",
  },
  fi: {
    Online: "Verkossa",
    Offline: "Poissa verkosta",
    Admin: "Ylläpitäjä",
    Email: "Sähköposti",
  },
  is: {
    Online: "Tengdur",
    Offline: "Ótengdur",
    Admin: "Stjórnandi",
    Email: "Netfang",
  },
};

function createMap(
  language: string,
  row: string,
): Record<UserManagementSource, string> {
  const translations = row.split("|");
  if (translations.length !== USER_MANAGEMENT_SOURCE_STRINGS.length) {
    throw new Error(
      `${language} user management translations must have ${USER_MANAGEMENT_SOURCE_STRINGS.length} entries, received ${translations.length}.`,
    );
  }

  const translationsBySource = Object.fromEntries(
    USER_MANAGEMENT_SOURCE_STRINGS.map((source, index) => [
      source,
      translations[index] ?? source,
    ]),
  ) as Record<UserManagementSource, string>;

  return {
    ...translationsBySource,
    ...(USER_MANAGEMENT_TRANSLATION_OVERRIDES[language as LocalizedLanguage] ??
      {}),
  };
}

export const USER_MANAGEMENT_SOURCE_TRANSLATIONS = Object.fromEntries(
  Object.entries(ROWS).map(([language, row]) => [
    language,
    createMap(language, row),
  ]),
) as Record<LocalizedLanguage, Record<UserManagementSource, string>>;
