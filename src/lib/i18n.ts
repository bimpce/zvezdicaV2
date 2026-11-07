import { useEffect, useSyncExternalStore } from "react";

export type Lang = "sl" | "en" | "de";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "sl", label: "Slovenščina" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
];
const KEY = "zv_lang";
const listeners = new Set<() => void>();
let current: Lang | null = null;

export function getLang(): Lang {
  if (typeof window === "undefined") return "sl";
  if (!current) {
    const v = localStorage.getItem(KEY);
    current = v === "en" || v === "de" ? v : "sl";
  }
  return current;
}
export function setLang(l: Lang) {
  current = l;
  localStorage.setItem(KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}
function subscribe(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "sl");
}

export const locales: Record<Lang, string> = { sl: "sl-SI", en: "en-GB", de: "de-DE" };

/** Translate a Slovenian source string; {name} placeholders are filled from vars. */
export function translate(lang: Lang, s: string, vars?: Record<string, string | number | undefined>) {
  const out = lang === "sl" ? s : (dict[s]?.[lang] ?? s);
  return vars ? out.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : out;
}

export function useT() {
  const lang = useLang();
  const t = (s: string, vars?: Record<string, string | number | undefined>) => translate(lang, s, vars);
  t.lang = lang;
  t.locale = locales[lang];
  return t;
}

/** Sets the browser tab title from a Slovenian source string; re-runs on language change. */
export function useTitle(sl: string, vars?: Record<string, string | number | undefined>) {
  const lang = useLang();
  useEffect(() => {
    document.title = translate(lang, sl, vars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, sl, JSON.stringify(vars ?? {})]);
}

type D = Record<string, { en: string; de: string }>;
const dict: D = {
  // common
  "Nazaj": { en: "Back", de: "Zurück" },
  "Shrani": { en: "Save", de: "Speichern" },
  "Shranjeno": { en: "Saved", de: "Gespeichert" },
  "Prijava": { en: "Log in", de: "Anmelden" },
  "Odjava": { en: "Log out", de: "Abmelden" },
  "Uredi": { en: "Edit", de: "Bearbeiten" },
  "Izbriši": { en: "Delete", de: "Löschen" },
  "Naziv": { en: "Title", de: "Titel" },
  "Ime": { en: "Name", de: "Name" },
  "točk": { en: "points", de: "Punkte" },
  "Prišlo je do napake": { en: "Something went wrong", de: "Etwas ist schiefgelaufen" },
  "Jezik": { en: "Language", de: "Sprache" },
  // status / frequency
  "Čaka na izvedbo": { en: "To do", de: "Zu erledigen" },
  "V pregledu": { en: "In review", de: "In Prüfung" },
  "Potrjeno": { en: "Approved", de: "Bestätigt" },
  "Zavrnjeno": { en: "Rejected", de: "Abgelehnt" },
  "Enkratno": { en: "One-time", de: "Einmalig" },
  "Dnevno": { en: "Daily", de: "Täglich" },
  "Tedensko": { en: "Weekly", de: "Wöchentlich" },
  "Mesečno": { en: "Monthly", de: "Monatlich" },
  "Letno": { en: "Yearly", de: "Jährlich" },
  // landing
  "Opravila, ki prinašajo zvezdice ⭐": { en: "Chores that earn stars ⭐", de: "Aufgaben, die Sterne bringen ⭐" },
  "Starši dodelijo opravila, otroci jih opravijo in zbirajo točke. Vse na enem mestu.": { en: "Parents assign chores, kids do them and collect points. All in one place.", de: "Eltern verteilen Aufgaben, Kinder erledigen sie und sammeln Punkte. Alles an einem Ort." },
  "Ustvari družino": { en: "Create family", de: "Familie erstellen" },
  "Prijava v družino": { en: "Family login", de: "Familien-Anmeldung" },
  "Družina skupaj opravlja hišna opravila": { en: "A family doing household chores together", de: "Eine Familie erledigt gemeinsam Hausarbeiten" },
  // auth
  "Vnesi ime družine in svoje ime.": { en: "Enter the family name and your name.", de: "Gib den Familiennamen und deinen Namen ein." },
  "Geslo mora imeti vsaj 6 znakov.": { en: "Password must have at least 6 characters.", de: "Das Passwort muss mindestens 6 Zeichen haben." },
  "Napačen e-poštni naslov ali geslo.": { en: "Wrong email or password.", de: "Falsche E-Mail oder falsches Passwort." },
  "Preveri e-pošto 📬": { en: "Check your email 📬", de: "Prüfe deine E-Mails 📬" },
  "Poslali smo ti povezavo za potrditev na {email}. Po potrditvi se prijavi in dodaj otroke.": { en: "We sent a confirmation link to {email}. After confirming, log in and add your kids.", de: "Wir haben einen Bestätigungslink an {email} gesendet. Melde dich danach an und füge Kinder hinzu." },
  "Na prijavo": { en: "To login", de: "Zur Anmeldung" },
  "Ime družine": { en: "Family name", de: "Familienname" },
  "Tvoje ime": { en: "Your name", de: "Dein Name" },
  "E-poštni naslov": { en: "Email address", de: "E-Mail-Adresse" },
  "Geslo": { en: "Password", de: "Passwort" },
  "Trenutek ...": { en: "One moment ...", de: "Einen Moment ..." },
  "Že imaš družino? ": { en: "Already have a family? ", de: "Schon eine Familie? " },
  "Nimaš še družine? ": { en: "No family yet? ", de: "Noch keine Familie? " },
  // profiles
  "PIN mora imeti točno 6 številk.": { en: "PIN must have exactly 6 digits.", de: "Die PIN muss genau 6 Ziffern haben." },
  "Napačen PIN. Poskusi znova.": { en: "Wrong PIN. Try again.", de: "Falsche PIN. Versuch es nochmal." },
  "Napačno geslo.": { en: "Wrong password.", de: "Falsches Passwort." },
  "Kdo si? 👋": { en: "Who are you? 👋", de: "Wer bist du? 👋" },
  "Starš": { en: "Parent", de: "Elternteil" },
  "Ni še otrok. Prijavi se kot starš in jih dodaj.": { en: "No kids yet. Log in as a parent and add them.", de: "Noch keine Kinder. Melde dich als Elternteil an und füge sie hinzu." },
  "Odjava naprave": { en: "Log out device", de: "Gerät abmelden" },
  "Živjo, {name}!": { en: "Hi, {name}!", de: "Hallo, {name}!" },
  "Vnesi svoj 6-mestni PIN": { en: "Enter your 6-digit PIN", de: "Gib deine 6-stellige PIN ein" },
  "Starševski dostop": { en: "Parent access", de: "Elternzugang" },
  // parent layout
  "Družina": { en: "Family", de: "Familie" },
  "Domov": { en: "Home", de: "Start" },
  "Opravila": { en: "Chores", de: "Aufgaben" },
  "Otroci": { en: "Kids", de: "Kinder" },
  "Nagrade": { en: "Rewards", de: "Belohnungen" },
  "Potrditve": { en: "Approvals", de: "Bestätigungen" },
  "Nastavitve": { en: "Settings", de: "Einstellungen" },
  "Zamenjaj profil": { en: "Switch profile", de: "Profil wechseln" },
  // parent home
  "Živjo, {name} 👋": { en: "Hi, {name} 👋", de: "Hallo, {name} 👋" },
  "starš": { en: "parent", de: "Elternteil" },
  "Pregled družine": { en: "Family overview", de: "Familienübersicht" },
  "Dodaj opravilo": { en: "Add chore", de: "Aufgabe hinzufügen" },
  "Dodaj prvega otroka, da začneš.": { en: "Add your first child to get started.", de: "Füge dein erstes Kind hinzu, um zu starten." },
  "Dodaj otroka": { en: "Add child", de: "Kind hinzufügen" },
  "{n} za opraviti": { en: "{n} to do", de: "{n} offen" },
  "Čaka na potrditev": { en: "Waiting for approval", de: "Wartet auf Bestätigung" },
  "Vse": { en: "All", de: "Alle" },
  // approvals
  "Ni opravil, ki čakajo na potrditev. 🎉": { en: "No chores waiting for approval. 🎉", de: "Keine Aufgaben warten auf Bestätigung. 🎉" },
  "Potrjeno! +{n} točk": { en: "Approved! +{n} points", de: "Bestätigt! +{n} Punkte" },
  "Opravilo zavrnjeno": { en: "Chore rejected", de: "Aufgabe abgelehnt" },
  "Opravilo": { en: "Chore", de: "Aufgabe" },
  "Potrdi": { en: "Approve", de: "Bestätigen" },
  "Zavrni": { en: "Reject", de: "Ablehnen" },
  "Zavrni opravilo": { en: "Reject chore", de: "Aufgabe ablehnen" },
  "Razlaga za otroka (npr. »Postelja še ni pospravljena.«)": { en: "Explanation for the child (e.g. “The bed isn't made yet.”)", de: "Erklärung für das Kind (z. B. „Das Bett ist noch nicht gemacht.“)" },
  "Dodaj kratko razlago.": { en: "Add a short explanation.", de: "Füge eine kurze Erklärung hinzu." },
  "Nagrade v pregledu": { en: "Rewards in review", de: "Belohnungen in Prüfung" },
  "Zgodovina aktivnosti": { en: "Activity history", de: "Aktivitätsverlauf" },
  "Še ni zgodovine.": { en: "No history yet.", de: "Noch kein Verlauf." },
  "Ni nagrad, ki čakajo na izročitev.": { en: "No rewards waiting to be handed over.", de: "Keine Belohnungen warten auf Übergabe." },
  "Nagrada izročena! −{n} točk": { en: "Reward handed over! −{n} points", de: "Belohnung übergeben! −{n} Punkte" },
  "Zahtevek zavrnjen, točke vrnjene": { en: "Request rejected, points returned", de: "Anfrage abgelehnt, Punkte zurückgegeben" },
  "Nagrada": { en: "Reward", de: "Belohnung" },
  "Potrdi in izroči": { en: "Approve and hand over", de: "Bestätigen und übergeben" },
  // notifications
  "Obvestila": { en: "Notifications", de: "Benachrichtigungen" },
  "Ni novih oddanih opravil.": { en: "No new submitted chores.", de: "Keine neu eingereichten Aufgaben." },
  "želi unovčiti nagrado": { en: "wants to redeem the reward", de: "möchte die Belohnung einlösen" },
  "je označil/a opravilo": { en: "marked the chore", de: "hat die Aufgabe" },
  "kot opravljeno.": { en: "as done.", de: "als erledigt markiert." },
  // children
  "Vnesi ime otroka.": { en: "Enter the child's name.", de: "Gib den Namen des Kindes ein." },
  "{name} dodan/a! 🎉": { en: "{name} added! 🎉", de: "{name} hinzugefügt! 🎉" },
  "Profil posodobljen": { en: "Profile updated", de: "Profil aktualisiert" },
  "PIN ponastavljen": { en: "PIN reset", de: "PIN zurückgesetzt" },
  "Izbrišem profil {name}? Izgubljene bodo vse točke.": { en: "Delete {name}'s profile? All points will be lost.", de: "Profil von {name} löschen? Alle Punkte gehen verloren." },
  "Profil izbrisan": { en: "Profile deleted", de: "Profil gelöscht" },
  "Dobrodošli!": { en: "Welcome!", de: "Willkommen!" },
  "Dodajte otroke, nato jim dodelite opravila.": { en: "Add your kids, then assign them chores.", de: "Füge Kinder hinzu und weise ihnen dann Aufgaben zu." },
  "Naprej na opravila →": { en: "On to chores →", de: "Weiter zu den Aufgaben →" },
  "{n} točk": { en: "{n} points", de: "{n} Punkte" },
  "Ponastavi PIN": { en: "Reset PIN", de: "PIN zurücksetzen" },
  "Nov otrok": { en: "New child", de: "Neues Kind" },
  "Uredi profil": { en: "Edit profile", de: "Profil bearbeiten" },
  "Nov PIN za {name}": { en: "New PIN for {name}", de: "Neue PIN für {name}" },
  "6-mestni PIN": { en: "6-digit PIN", de: "6-stellige PIN" },
  // chores
  "Izbrišem opravilo »{title}«?": { en: "Delete chore “{title}”?", de: "Aufgabe „{title}“ löschen?" },
  "Opravilo izbrisano": { en: "Chore deleted", de: "Aufgabe gelöscht" },
  "Še ni opravil.": { en: "No chores yet.", de: "Noch keine Aufgaben." },
  "{n} t": { en: "{n} pts", de: "{n} Pkt." },
  "Neaktivno": { en: "Inactive", de: "Inaktiv" },
  "Vnesi naziv opravila.": { en: "Enter the chore title.", de: "Gib den Titel der Aufgabe ein." },
  "Točke morajo biti celo število, večje od 0.": { en: "Points must be a whole number greater than 0.", de: "Punkte müssen eine ganze Zahl größer als 0 sein." },
  "Datum zaključka ne sme biti pred začetkom.": { en: "End date can't be before the start date.", de: "Das Enddatum darf nicht vor dem Start liegen." },
  "Izberi vsaj enega otroka.": { en: "Pick at least one child.", de: "Wähle mindestens ein Kind." },
  "Opravilo posodobljeno": { en: "Chore updated", de: "Aufgabe aktualisiert" },
  "Opravilo dodano": { en: "Chore added", de: "Aufgabe hinzugefügt" },
  "Uredi opravilo": { en: "Edit chore", de: "Aufgabe bearbeiten" },
  "Novo opravilo": { en: "New chore", de: "Neue Aufgabe" },
  "Pospravi sobo": { en: "Tidy your room", de: "Zimmer aufräumen" },
  "Opis (neobvezno)": { en: "Description (optional)", de: "Beschreibung (optional)" },
  "Točke": { en: "Points", de: "Punkte" },
  "Pogostost": { en: "Frequency", de: "Häufigkeit" },
  "Začetek": { en: "Start", de: "Beginn" },
  "Zaključek (neobvezno)": { en: "End (optional)", de: "Ende (optional)" },
  "Dodeli otrokom": { en: "Assign to kids", de: "Kindern zuweisen" },
  "Najprej dodaj otroka.": { en: "Add a child first.", de: "Füge zuerst ein Kind hinzu." },
  // rewards (parent)
  "30 min videoiger": { en: "30 min of video games", de: "30 Min. Videospiele" },
  "Pica večer": { en: "Pizza night", de: "Pizzaabend" },
  "Obisk kina": { en: "Trip to the cinema", de: "Kinobesuch" },
  "Izlet po izbiri": { en: "Outing of your choice", de: "Ausflug nach Wahl" },
  "Vpiši naziv in točke.": { en: "Enter a title and points.", de: "Gib Titel und Punkte ein." },
  "Nagrada shranjena": { en: "Reward saved", de: "Belohnung gespeichert" },
  "Izbrišem nagrado „{title}\"?": { en: "Delete reward “{title}”?", de: "Belohnung „{title}“ löschen?" },
  "Nova nagrada": { en: "New reward", de: "Neue Belohnung" },
  "Še ni nagrad. Dodaj svojo ali izberi idejo:": { en: "No rewards yet. Add your own or pick an idea:", de: "Noch keine Belohnungen. Füge eigene hinzu oder wähle eine Idee:" },
  "Samo za: {name}": { en: "Only for: {name}", de: "Nur für: {name}" },
  "Za vse otroke": { en: "For all kids", de: "Für alle Kinder" },
  " · skrita": { en: " · hidden", de: " · versteckt" },
  "Uredi nagrado": { en: "Edit reward", de: "Belohnung bearbeiten" },
  "npr. Pica večer": { en: "e.g. Pizza night", de: "z. B. Pizzaabend" },
  "Sličica": { en: "Icon", de: "Symbol" },
  "Cena v točkah": { en: "Price in points", de: "Preis in Punkten" },
  "Za koga": { en: "For whom", de: "Für wen" },
  "Vsi otroci": { en: "All kids", de: "Alle Kinder" },
  "Vidna otrokom": { en: "Visible to kids", de: "Für Kinder sichtbar" },
  // settings
  "Ime družine je obvezno.": { en: "Family name is required.", de: "Familienname ist erforderlich." },
  "Jezik aplikacije na tej napravi.": { en: "App language on this device.", de: "App-Sprache auf diesem Gerät." },
  // child
  "Bravo!": { en: "Bravo!", de: "Bravo!" },
  "Super!": { en: "Great!", de: "Super!" },
  "Odlično!": { en: "Excellent!", de: "Ausgezeichnet!" },
  "Tako se dela!": { en: "That's how it's done!", de: "So macht man das!" },
  "Zvezda si!": { en: "You're a star!", de: "Du bist ein Star!" },
  "Poslano staršem v pregled! 🚀": { en: "Sent to your parents for review! 🚀", de: "An die Eltern zur Prüfung gesendet! 🚀" },
  "Zahtevek poslan staršem! 🎁": { en: "Request sent to your parents! 🎁", de: "Anfrage an die Eltern gesendet! 🎁" },
  "Moja opravila": { en: "My chores", de: "Meine Aufgaben" },
  "Moje točke": { en: "My points", de: "Meine Punkte" },
  "Zgodovina": { en: "History", de: "Verlauf" },
  "Hej, imaš novo opravilo! 🌟": { en: "Hey, you have a new chore! 🌟", de: "Hey, du hast eine neue Aufgabe! 🌟" },
  "Hej, imaš nova opravila! 🌟": { en: "Hey, you have new chores! 🌟", de: "Hey, du hast neue Aufgaben! 🌟" },
  "Gremo! 💪": { en: "Let's go! 💪", de: "Los geht's! 💪" },
  "Točke na voljo": { en: "Points available", de: "Verfügbare Punkte" },
  "🎯 Moj cilj:": { en: "🎯 My goal:", de: "🎯 Mein Ziel:" },
  "Imaš dovolj točk — lahko unovčiš! 🎉": { en: "You have enough points — you can redeem! 🎉", de: "Du hast genug Punkte — du kannst einlösen! 🎉" },
  "Še {n} točk!": { en: "{n} more points!", de: "Noch {n} Punkte!" },
  "Še {n} točk": { en: "{n} more points", de: "Noch {n} Punkte" },
  "Trenutno nimaš opravil. 😎": { en: "You have no chores right now. 😎", de: "Du hast gerade keine Aufgaben. 😎" },
  "Novo": { en: "New", de: "Neu" },
  "Poskusi znova": { en: "Try again", de: "Nochmal versuchen" },
  "Opravljeno": { en: "Done", de: "Erledigt" },
  "Vse zvezdice skupaj": { en: "All stars in total", de: "Alle Sterne insgesamt" },
  "Potrjenih opravil": { en: "Approved chores", de: "Bestätigte Aufgaben" },
  "Starši še niso dodali nagrad. 🎁": { en: "Your parents haven't added rewards yet. 🎁", de: "Deine Eltern haben noch keine Belohnungen hinzugefügt. 🎁" },
  "Unovči": { en: "Redeem", de: "Einlösen" },
  "Moj cilj": { en: "My goal", de: "Mein Ziel" },
  "Nastavi kot cilj": { en: "Set as goal", de: "Als Ziel setzen" },
  "Moje unovčitve": { en: "My redemptions", de: "Meine Einlösungen" },
  "Res želiš porabiti {n} točk za {reward}?": { en: "Do you really want to spend {n} points on {reward}?", de: "Willst du wirklich {n} Punkte für {reward} ausgeben?" },
  "Starši bodo potrdili, ko ti nagrado izročijo.": { en: "Your parents will confirm when they hand you the reward.", de: "Deine Eltern bestätigen, wenn sie dir die Belohnung geben." },
  "Da, unovči! 🎁": { en: "Yes, redeem! 🎁", de: "Ja, einlösen! 🎁" },
  "Ne še": { en: "Not yet", de: "Noch nicht" },
  "Tu se bodo pokazale tvoje zvezdice.": { en: "Your stars will show up here.", de: "Hier erscheinen deine Sterne." },
  "Še 1 točka!": { en: "1 more point!", de: "Noch 1 Punkt!" },
  "Še 1 točka": { en: "1 more point", de: "Noch 1 Punkt" },
  "„{title}“": { en: "“{title}”", de: "„{title}“" },
  "{cheer} +{n} točk": { en: "{cheer} +{n} points", de: "{cheer} +{n} Punkte" },
  // browser tab titles
  "Zvezdica — družinska opravila in točke": { en: "Zvezdica — family chores and points", de: "Zvezdica — Familienaufgaben und Punkte" },
  "Prijava | Zvezdica": { en: "Log in | Zvezdica", de: "Anmelden | Zvezdica" },
  "Kdo si? | Zvezdica": { en: "Who are you? | Zvezdica", de: "Wer bist du? | Zvezdica" },
  "Domov | Zvezdica": { en: "Home | Zvezdica", de: "Start | Zvezdica" },
  "Opravila | Zvezdica": { en: "Chores | Zvezdica", de: "Aufgaben | Zvezdica" },
  "Otroci | Zvezdica": { en: "Kids | Zvezdica", de: "Kinder | Zvezdica" },
  "Nagrade | Zvezdica": { en: "Rewards | Zvezdica", de: "Belohnungen | Zvezdica" },
  "Potrditve | Zvezdica": { en: "Approvals | Zvezdica", de: "Bestätigungen | Zvezdica" },
  "Nastavitve | Zvezdica": { en: "Settings | Zvezdica", de: "Einstellungen | Zvezdica" },
  "{name} | Zvezdica": { en: "{name} | Zvezdica", de: "{name} | Zvezdica" },
};
