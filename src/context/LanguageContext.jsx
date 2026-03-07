import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'maaxbete_lang';

const translations = {
  fr: {
    dashboard: 'Tableau de bord',
    newUser: 'New User',
    allUsers: 'All Users',
    tree: 'Tree',
    transfers: 'Transfers',
    history: 'History',
    changePassword: 'Change Password',
    usersProfit: 'Users Profit',
    transactionsProfit: 'Transactions Profit',
    gameSettings: 'Paramètres jeux',
    logOut: 'Déconnexion',
    play: 'Jouer',
    balance: 'Solde',
    username: 'Username',
    id: 'ID',
    role: 'Role',
    level: 'Level',
    status: 'Status',
    createdAt: 'Created at',
    parentId: 'Parent ID',
    subUsers: 'Sous-comptes',
    parents: 'Parents',
    transfer: 'Transfer',
    actions: 'Actions',
    edit: 'Edit',
    resetFilters: 'Reset filters',
    showFilters: 'Afficher les filtres',
    hideFilters: 'Masquer les filtres',
    search: 'Search',
    all: 'Tous',
    amount: 'Amount',
    currency: 'Currency',
    loading: 'Chargement...',
    EUR: 'EUR',
    TND: 'TND',
    USD: 'USD',
    // Public header & nav
    navSports: 'PARIS SPORTIFS',
    navLive: 'PARIS EN DIRECT',
    navCasino: 'CASINO',
    navLiveCasino: 'LIVECASINO',
    navVirtuels: 'VIRTUELS',
    signIn: 'Connexion',
    yourBalance: 'Votre solde',
    // Login modal
    loginTitle: 'Connexion',
    loginUsername: "Nom d'utilisateur",
    loginPassword: 'Mot de passe',
    // Home
    heroTitle: 'SPORT',
    heroSubtitle: 'PARIER POUR GAGNER',
    homeCasino: 'Casino',
    dropsWins: 'Drops & Wins',
    bestGames: 'Meilleurs Jeux',
    slots: 'Slots',
    tableGames: 'Jeux De Table',
    videoPoker: 'Vidéo Poker',
    sortBy: 'COMMANDER PAR:',
    popularity: 'Popularité',
    filterBy: 'FILTRER PAR:',
    searchPlaceholder: 'RECHERCHE',
    allCategories: 'TOUTE',
    // Casino
    casinoTitle: 'CASINO',
    casinoSubtitle: 'TOURNEZ POUR GAGNER',
    casinoEmptyMessage: 'Aucun jeu à afficher pour le moment.',
    loadingGames: 'Chargement des jeux…',
    playWithBalance: 'Jouer avec votre solde',
    freeGame: 'Jeu gratuit',
    gameApi: 'Jeu',
    labelJouer: 'JOUER',
    labelGratuit: 'GRATUIT',
    labelNew: 'NOUVEAU',
    gameFound: 'jeu trouvé',
    gamesFound: 'jeux trouvés',
    noGamesFound: 'Aucun jeu ne correspond à la recherche.',
    comingSoon: 'Bientôt disponible',
    signInToPlay: 'Connectez-vous pour jouer',
    // Tree details
    treeDetails: 'Détails',
    createdUnder: 'Créé sous',
    accountsCreated: 'Comptes créés',
    credit: 'Créditer',
    withdraw: 'Retirer',
    note: 'Note',
    ban: 'Bannir',
    unban: 'Débannir',
    banned: 'Banni',
    creditDone: 'Crédit effectué.',
    withdrawDone: 'Retrait effectué.',
    accountBanned: 'Compte banni.',
    accountUnbanned: 'Compte débloqué.',
    addUser: 'Ajouter',
  },
  en: {
    dashboard: 'Dashboard',
    newUser: 'New User',
    allUsers: 'All Users',
    tree: 'Tree',
    transfers: 'Transfers',
    history: 'History',
    changePassword: 'Change Password',
    usersProfit: 'Users Profit',
    transactionsProfit: 'Transactions Profit',
    gameSettings: 'Game Settings',
    logOut: 'Log out',
    play: 'Play',
    balance: 'Balance',
    username: 'Username',
    id: 'ID',
    role: 'Role',
    level: 'Level',
    status: 'Status',
    createdAt: 'Created at',
    parentId: 'Parent ID',
    subUsers: 'Sub users',
    parents: 'Parents',
    transfer: 'Transfer',
    actions: 'Actions',
    edit: 'Edit',
    resetFilters: 'Reset filters',
    showFilters: 'Show filters',
    hideFilters: 'Hide filters',
    search: 'Search',
    all: 'All',
    amount: 'Amount',
    currency: 'Currency',
    loading: 'Loading...',
    EUR: 'EUR',
    TND: 'TND',
    USD: 'USD',
    navSports: 'SPORTS BETTING',
    navLive: 'LIVE BETTING',
    navCasino: 'CASINO',
    navLiveCasino: 'LIVE CASINO',
    navVirtuels: 'VIRTUALS',
    signIn: 'Sign in',
    yourBalance: 'Your balance',
    loginTitle: 'Sign in',
    loginUsername: 'Username',
    loginPassword: 'Password',
    heroTitle: 'SPORT',
    heroSubtitle: 'BET TO WIN',
    homeCasino: 'Casino',
    dropsWins: 'Drops & Wins',
    bestGames: 'Best Games',
    slots: 'Slots',
    tableGames: 'Table Games',
    videoPoker: 'Video Poker',
    sortBy: 'SORT BY:',
    popularity: 'Popularity',
    filterBy: 'FILTER BY:',
    searchPlaceholder: 'SEARCH',
    allCategories: 'ALL',
    casinoTitle: 'CASINO',
    casinoSubtitle: 'SPIN TO WIN',
    casinoEmptyMessage: 'No games to display at the moment.',
    loadingGames: 'Loading games…',
    playWithBalance: 'Play with your balance',
    freeGame: 'Free game',
    gameApi: 'Game',
    labelJouer: 'PLAY',
    labelGratuit: 'FREE',
    labelNew: 'NEW',
    gameFound: 'game found',
    gamesFound: 'games found',
    noGamesFound: 'No games match your search.',
    comingSoon: 'Coming soon',
    signInToPlay: 'Sign in to play',
    // Tree details
    treeDetails: 'Details',
    createdUnder: 'Created under',
    accountsCreated: 'Accounts created',
    credit: 'Credit',
    withdraw: 'Withdraw',
    note: 'Note',
    ban: 'Ban',
    unban: 'Unban',
    banned: 'Banned',
    creditDone: 'Credit applied.',
    withdrawDone: 'Withdrawal applied.',
    accountBanned: 'Account banned.',
    accountUnbanned: 'Account unbanned.',
    addUser: 'Add',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    newUser: 'مستخدم جديد',
    allUsers: 'جميع المستخدمين',
    tree: 'الشجرة',
    transfers: 'التحويلات',
    history: 'السجل',
    changePassword: 'تغيير كلمة المرور',
    usersProfit: 'أرباح المستخدمين',
    transactionsProfit: 'أرباح المعاملات',
    gameSettings: 'إعدادات الألعاب',
    logOut: 'تسجيل الخروج',
    play: 'لعب',
    balance: 'الرصيد',
    username: 'اسم المستخدم',
    id: 'المعرف',
    role: 'الدور',
    level: 'المستوى',
    status: 'الحالة',
    createdAt: 'تاريخ الإنشاء',
    parentId: 'المستخدم الأب',
    subUsers: 'المستخدمون الفرعيون',
    parents: 'الأصل',
    transfer: 'تحويل',
    actions: 'إجراءات',
    edit: 'تعديل',
    resetFilters: 'إعادة تعيين الفلاتر',
    showFilters: 'إظهار الفلاتر',
    hideFilters: 'إخفاء الفلاتر',
    search: 'بحث',
    all: 'الكل',
    amount: 'المبلغ',
    currency: 'العملة',
    loading: 'جاري التحميل...',
    EUR: 'يورو',
    TND: 'د.ت',
    USD: 'دولار',
    navSports: 'الرهانات الرياضية',
    navLive: 'الرهان المباشر',
    navCasino: 'كازينو',
    navLiveCasino: 'كازينو مباشر',
    navVirtuels: 'افتراضي',
    signIn: 'تسجيل الدخول',
    yourBalance: 'رصيدك',
    loginTitle: 'تسجيل الدخول',
    loginUsername: 'اسم المستخدم',
    loginPassword: 'كلمة المرور',
    heroTitle: 'الرياضة',
    heroSubtitle: 'اراهن لفوز',
    homeCasino: 'كازينو',
    dropsWins: 'Drops & Wins',
    bestGames: 'أفضل الألعاب',
    slots: 'سلوتس',
    tableGames: 'ألعاب الطاولة',
    videoPoker: 'فيديو بوكر',
    sortBy: 'ترتيب حسب:',
    popularity: 'الشعبية',
    filterBy: 'تصفية حسب:',
    searchPlaceholder: 'بحث',
    allCategories: 'الكل',
    casinoTitle: 'كازينو',
    casinoSubtitle: 'ادِر للفوز',
    casinoEmptyMessage: 'لا توجد ألعاب لعرضها حالياً.',
    loadingGames: 'جاري تحميل الألعاب…',
    playWithBalance: 'العب برصيدك',
    freeGame: 'لعبة مجانية',
    gameApi: 'لعبة',
    labelJouer: 'لعب',
    labelGratuit: 'مجاني',
    labelNew: 'جديد',
    gameFound: 'لعبة موجودة',
    gamesFound: 'ألعاب موجودة',
    noGamesFound: 'لا توجد ألعاب تطابق البحث.',
    comingSoon: 'قريباً',
    signInToPlay: 'سجّل الدخول للعب',
    // Tree details
    treeDetails: 'التفاصيل',
    createdUnder: 'أنشئ تحت',
    accountsCreated: 'الحسابات المنشأة',
    credit: 'إيداع',
    withdraw: 'سحب',
    note: 'ملاحظة',
    ban: 'حظر',
    unban: 'إلغاء الحظر',
    banned: 'محظور',
    creditDone: 'تم الإيداع.',
    withdrawDone: 'تم السحب.',
    accountBanned: 'تم حظر الحساب.',
    accountUnbanned: 'تم إلغاء حظر الحساب.',
    addUser: 'إضافة',
  },
};

const LanguageContext = createContext(null);

const STORAGE_KEY_CURRENCY = 'maaxbete_display_currency';

// Taux par rapport à 1 EUR (approximatifs)
const RATES_FROM_EUR = { EUR: 1, USD: 1.08, TND: 3.35 };

export function convertBalance(amount, fromCurrency, toCurrency) {
  if (!amount || fromCurrency === toCurrency) return Number(amount) || 0;
  const fromRate = RATES_FROM_EUR[fromCurrency] ?? 1;
  const toRate = RATES_FROM_EUR[toCurrency] ?? 1;
  const amountInEur = Number(amount) / fromRate;
  return amountInEur * toRate;
}

// Ordre d'affichage : TND en premier
export const DISPLAY_CURRENCY_ORDER = ['TND', 'EUR', 'USD'];

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'fr';
    } catch (_) {
      return 'fr';
    }
  });

  const [displayCurrency, setDisplayCurrency] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CURRENCY) || 'TND';
    } catch (_) {
      return 'TND';
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENCY, displayCurrency);
  }, [displayCurrency]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
  }, [lang]);

  const t = (key) => translations[lang]?.[key] ?? translations.fr[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, displayCurrency, setDisplayCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'fr',
      setLang: () => {},
      t: (key) => key,
      displayCurrency: 'TND',
      setDisplayCurrency: () => {},
    };
  }
  return ctx;
}

export const LANG_LABELS = { fr: 'Français', en: 'English', ar: 'العربية' };

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'TND', symbol: 'DT', label: 'TND' },
  { code: 'USD', symbol: '$', label: 'USD' },
];

export const CURRENCIES_ORDER = [
  { code: 'TND', symbol: 'DT', label: 'TND' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'USD', symbol: '$', label: 'USD' },
];

export function formatBalance(amount, currencyCode = 'TND') {
  const c = CURRENCIES.find((x) => x.code === currencyCode) || CURRENCIES[0];
  return `${Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.symbol}`;
}
