/**
 * QCStats i18n – Simple translation system
 * Uses React context + JSON dictionaries (no route restructuring needed)
 */

export type Locale = "pl" | "en";

export const translations = {
  en: {
    // Nav
    "nav.dashboard": "Dashboard",
    "nav.upload": "Upload",
    "nav.history": "History",
    "nav.compare": "Compare",
    "nav.settings": "Settings",
    "nav.logout": "Logout",

    // Dashboard
    "dashboard.welcome": "Welcome",
    "dashboard.uploadBtn": "Upload Screenshot",
    "dashboard.matchesPlayed": "Matches Played",
    "dashboard.winRate": "Win Rate",
    "dashboard.avgLgAcc": "Avg LG Accuracy",
    "dashboard.avgRailAcc": "Avg Rail Accuracy",
    "dashboard.avgAccuracy": "Avg Accuracy",
    "dashboard.totalDamage": "Total Damage",
    "dashboard.recentMatches": "Recent Matches",
    "dashboard.viewAll": "View All →",
    "dashboard.noMatches": "No matches yet",
    "dashboard.noMatchesDesc": "Upload your first QC ranking screenshot to start tracking your stats.",
    "dashboard.uploadFirst": "Upload First Screenshot",

    // Upload
    "upload.title": "Upload Screenshot",
    "upload.paste": "Paste screenshot (Ctrl+V)",
    "upload.dragDrop": "or drag & drop an image here",
    "upload.processing": "Processing...",
    "upload.results": "Results",
    "upload.save": "Save Match",
    "upload.saving": "Saving...",
    "upload.saved": "Match saved!",

    // History
    "history.title": "Match History",
    "history.uploadNew": "Upload New",
    "history.exportCsv": "Export CSV",
    "history.noMatches": "No matches recorded yet",
    "history.noMatchesDesc": "Upload your first QC ranking screenshot to begin tracking.",
    "history.date": "Date",
    "history.player1": "Player 1",
    "history.score": "Score",
    "history.player2": "Player 2",
    "history.map": "Map",
    "history.acc": "Acc%",
    "history.dmg": "Dmg",

    // Compare
    "compare.title": "Head-to-Head Compare",
    "compare.noOpponents": "No opponents yet",
    "compare.noOpponentsDesc": "Upload match screenshots to build your rivalry database.",
    "compare.opponent": "Opponent",
    "compare.matches": "Matches",
    "compare.record": "Record",
    "compare.winPct": "Win %",
    "compare.avgAcc": "Avg Acc",
    "compare.avgDmg": "Avg Dmg",

    // Match Detail
    "match.statsComparison": "Stats Comparison",
    "match.weaponBreakdown": "Weapon Breakdown",
    "match.damage": "Damage",
    "match.accuracy": "Accuracy",
    "match.healing": "Healing",
    "match.megaHp": "Mega HP",
    "match.heavyArmor": "Heavy Armor",
    "match.lightArmor": "Light Armor",
    "match.ping": "Ping",

    // Settings
    "settings.title": "Profile Settings",
    "settings.account": "Account",
    "settings.email": "Email",
    "settings.emailHint": "Email cannot be changed.",
    "settings.username": "Username",
    "settings.usernameHint": "Used in your public profile URL. Must be unique.",
    "settings.displayName": "Display Name",
    "settings.publicProfile": "Public Profile",
    "settings.publicHint": "Allow others to view your stats and match history.",
    "settings.role": "Role",
    "settings.save": "Save Changes",
    "settings.saving": "Saving...",
    "settings.saved": "Profile saved successfully!",
    "settings.dangerZone": "Danger Zone",
    "settings.language": "Language",

    // Friends
    "friends.title": "Friends",
    "friends.addFriend": "Add Friend",
    "friends.pending": "Pending",
    "friends.accepted": "Friends",
    "friends.noFriends": "No friends yet",
    "friends.sendRequest": "Send Request",
    "friends.accept": "Accept",
    "friends.decline": "Decline",
    "friends.remove": "Remove",

    // Common
    "common.loading": "Loading Arena...",
    "common.error": "Something went wrong",
    "common.back": "Back",
    "common.win": "WIN",
    "common.loss": "LOSS",
    "common.vs": "vs",
  },

  pl: {
    // Nav
    "nav.dashboard": "Panel",
    "nav.upload": "Upload",
    "nav.history": "Historia",
    "nav.compare": "Porównaj",
    "nav.settings": "Ustawienia",
    "nav.logout": "Wyloguj",

    // Dashboard
    "dashboard.welcome": "Witaj",
    "dashboard.uploadBtn": "Wgraj Screenshot",
    "dashboard.matchesPlayed": "Rozegrane Mecze",
    "dashboard.winRate": "Wygrane",
    "dashboard.avgLgAcc": "Śr. Celność LG",
    "dashboard.avgRailAcc": "Śr. Celność Rail",
    "dashboard.avgAccuracy": "Śr. Celność",
    "dashboard.totalDamage": "Łączne Obrażenia",
    "dashboard.recentMatches": "Ostatnie Mecze",
    "dashboard.viewAll": "Pokaż Wszystkie →",
    "dashboard.noMatches": "Brak meczów",
    "dashboard.noMatchesDesc": "Wgraj swój pierwszy screenshot z QC aby rozpocząć śledzenie statystyk.",
    "dashboard.uploadFirst": "Wgraj Pierwszy Screenshot",

    // Upload
    "upload.title": "Wgraj Screenshot",
    "upload.paste": "Wklej screenshot (Ctrl+V)",
    "upload.dragDrop": "lub przeciągnij i upuść obrazek tutaj",
    "upload.processing": "Przetwarzanie...",
    "upload.results": "Wyniki",
    "upload.save": "Zapisz Mecz",
    "upload.saving": "Zapisywanie...",
    "upload.saved": "Mecz zapisany!",

    // History
    "history.title": "Historia Meczów",
    "history.uploadNew": "Nowy Upload",
    "history.exportCsv": "Eksportuj CSV",
    "history.noMatches": "Brak zapisanych meczów",
    "history.noMatchesDesc": "Wgraj swój pierwszy screenshot z QC aby rozpocząć śledzenie.",
    "history.date": "Data",
    "history.player1": "Gracz 1",
    "history.score": "Wynik",
    "history.player2": "Gracz 2",
    "history.map": "Mapa",
    "history.acc": "Cel%",
    "history.dmg": "Dmg",

    // Compare
    "compare.title": "Porównanie Head-to-Head",
    "compare.noOpponents": "Brak przeciwników",
    "compare.noOpponentsDesc": "Wgraj screenshoty z meczów aby zbudować bazę rywalizacji.",
    "compare.opponent": "Przeciwnik",
    "compare.matches": "Mecze",
    "compare.record": "Bilans",
    "compare.winPct": "Win %",
    "compare.avgAcc": "Śr. Cel",
    "compare.avgDmg": "Śr. Dmg",

    // Match Detail
    "match.statsComparison": "Porównanie Statystyk",
    "match.weaponBreakdown": "Rozkład Broni",
    "match.damage": "Obrażenia",
    "match.accuracy": "Celność",
    "match.healing": "Leczenie",
    "match.megaHp": "Mega HP",
    "match.heavyArmor": "Ciężki Pancerz",
    "match.lightArmor": "Lekki Pancerz",
    "match.ping": "Ping",

    // Settings
    "settings.title": "Ustawienia Profilu",
    "settings.account": "Konto",
    "settings.email": "Email",
    "settings.emailHint": "Email nie może być zmieniony.",
    "settings.username": "Nazwa użytkownika",
    "settings.usernameHint": "Używana w URL publicznego profilu. Musi być unikalna.",
    "settings.displayName": "Nazwa wyświetlana",
    "settings.publicProfile": "Profil Publiczny",
    "settings.publicHint": "Pozwól innym zobaczyć Twoje statystyki i historię meczów.",
    "settings.role": "Rola",
    "settings.save": "Zapisz Zmiany",
    "settings.saving": "Zapisywanie...",
    "settings.saved": "Profil zapisany pomyślnie!",
    "settings.dangerZone": "Strefa Zagrożenia",
    "settings.language": "Język",

    // Friends
    "friends.title": "Znajomi",
    "friends.addFriend": "Dodaj Znajomego",
    "friends.pending": "Oczekujące",
    "friends.accepted": "Znajomi",
    "friends.noFriends": "Brak znajomych",
    "friends.sendRequest": "Wyślij Zaproszenie",
    "friends.accept": "Akceptuj",
    "friends.decline": "Odrzuć",
    "friends.remove": "Usuń",

    // Common
    "common.loading": "Ładowanie Areny...",
    "common.error": "Coś poszło nie tak",
    "common.back": "Wróć",
    "common.win": "WYGRANA",
    "common.loss": "PRZEGRANA",
    "common.vs": "vs",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] || translations["en"][key] || key;
}

export function getDefaultLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("qcstats_locale") as Locale;
    if (saved && (saved === "pl" || saved === "en")) return saved;
    return navigator.language.startsWith("pl") ? "pl" : "en";
  }
  return "en";
}

export function setLocale(locale: Locale) {
  if (typeof window !== "undefined") {
    localStorage.setItem("qcstats_locale", locale);
  }
}
