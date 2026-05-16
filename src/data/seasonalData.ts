export interface SeasonalItem {
  name: string;
  status: 'Peak Season' | 'Just In' | 'Available' | 'Limited Time';
  emoji: string;
  tip: string;
}

export interface PhSeason {
  id: string;
  name: string;
  label: string;
  months: string;
  monthRange: number[];
  icon: string;
  description: string;
  ingredients: SeasonalItem[];
}

export interface YearRoundItem {
  name: string;
  emoji: string;
  tip: string;
}

export interface SeasonalData {
  seasons: PhSeason[];
  yearRound: YearRoundItem[];
  byMonth: Record<string, SeasonalItem[]>;
}

export const STORAGE_KEY = 'cookmate:seasonal_data';

export const STATUS_OPTIONS: SeasonalItem['status'][] = [
  'Peak Season',
  'Just In',
  'Available',
  'Limited Time',
];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const defaultSeasonalData: SeasonalData = {
  seasons: [
    {
      id: 'tag-init',
      name: 'Tag-init',
      label: 'Hot Dry Season',
      months: 'March – May',
      monthRange: [2, 3, 4],
      icon: 'sun',
      description: 'The hottest months in the Philippines. Tropical fruits are at their sweetest and most abundant.',
      ingredients: [
        { name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭', tip: 'Best eaten ripe as dessert or green with bagoong.' },
        { name: 'Pakwan (Watermelon)', status: 'Peak Season', emoji: '🍉', tip: 'Refreshing and hydrating — perfect for the summer heat.' },
        { name: 'Melon (Cantaloupe)', status: 'Just In', emoji: '🍈', tip: 'Sweet and fragrant; great for shakes and fruit salad.' },
        { name: 'Kamias (Bilimbi)', status: 'Peak Season', emoji: '🌿', tip: 'Sour fruit used in sinigang and as souring agent.' },
        { name: 'Nangka (Jackfruit)', status: 'Peak Season', emoji: '🌿', tip: 'Ripe for desserts like halo-halo; unripe for kare-kare.' },
        { name: 'Durian', status: 'Just In', emoji: '🌿', tip: 'Abundant in Mindanao — a prized local delicacy.' },
        { name: 'Sibuyas Tagalog (Shallots)', status: 'Available', emoji: '🧅', tip: 'Harvested in Ilocos; essential for most Filipino dishes.' },
        { name: 'Ampalaya (Bitter Gourd)', status: 'Available', emoji: '🌿', tip: 'Best sautéed with eggs or in pinakbet.' },
      ],
    },
    {
      id: 'tag-ulan',
      name: 'Tag-ulan',
      label: 'Rainy Season',
      months: 'June – October',
      monthRange: [5, 6, 7, 8, 9],
      icon: 'cloud-rain',
      description: 'Monsoon rains bring cool weather and a fresh wave of leafy greens and root crops.',
      ingredients: [
        { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿', tip: 'Abundant and cheap; ideal for adobo or sautéed dishes.' },
        { name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬', tip: 'Tender and mild; staple in soups and stir-fries.' },
        { name: 'Sitaw (String Beans)', status: 'Peak Season', emoji: '🫛', tip: 'Long beans great in pinakbet and kare-kare.' },
        { name: 'Upo (Bottle Gourd)', status: 'Peak Season', emoji: '🌿', tip: 'Light and watery; best in ginisang upo with ground pork.' },
        { name: 'Kamote (Sweet Potato)', status: 'Available', emoji: '🍠', tip: 'Leaves used in sinigang; tubers boiled or fried.' },
        { name: 'Gabi (Taro)', status: 'Just In', emoji: '🌿', tip: 'Essential for laing and sinigang na gabi.' },
        { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽', tip: 'Sweet corn is best boiled or grilled on the cob.' },
        { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿', tip: 'Common in beef sinigang and pork nilaga.' },
      ],
    },
    {
      id: 'amihan',
      name: 'Amihan',
      label: 'Northeast Monsoon / Cool Season',
      months: 'November – February',
      monthRange: [10, 11, 0, 1],
      icon: 'snowflake',
      description: 'The coolest and driest months. Highland vegetables and root crops thrive in the Cordillera.',
      ingredients: [
        { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬', tip: 'Crisp Benguet cabbage is at its best this season.' },
        { name: 'Carrots', status: 'Peak Season', emoji: '🥕', tip: 'Sweet and firm; staple in mechado, afritada, and kaldereta.' },
        { name: 'Patatas (Potato)', status: 'Peak Season', emoji: '🥔', tip: 'Harvested from Benguet highlands; great for stews.' },
        { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿', tip: 'Mild-flavored; used in tinola and chopsuey.' },
        { name: 'Beans (Baguio Beans)', status: 'Peak Season', emoji: '🫘', tip: 'French beans from the Cordillera — tender and crisp.' },
        { name: 'Broccoli', status: 'Just In', emoji: '🥦', tip: 'Grown in Benguet; available in abundance from November.' },
        { name: 'Cauliflower', status: 'Just In', emoji: '🌿', tip: 'Cool-weather crop from the highlands; great in soups.' },
        { name: 'Pineapple', status: 'Peak Season', emoji: '🍍', tip: 'Philippine pineapples peak around Christmas season.' },
      ],
    },
  ],
  yearRound: [
    { name: 'Sibuyas (Onion)', emoji: '🧅', tip: 'Red and white onions from Ilocos and Nueva Ecija.' },
    { name: 'Bawang (Garlic)', emoji: '🧄', tip: 'World-class Ilocos garlic used in virtually every dish.' },
    { name: 'Luya (Ginger)', emoji: '🫚', tip: 'Aromatic rhizome essential in tinola, soups, and teas.' },
    { name: 'Sili (Chili)', emoji: '🌶️', tip: 'Siling labuyo and long chili available all year.' },
    { name: 'Kamatis (Tomato)', emoji: '🍅', tip: 'Key in ginisa, sinigang base, and fresh salads.' },
    { name: 'Talong (Eggplant)', emoji: '🍆', tip: 'Used in tortang talong, pinakbet, and ensalada.' },
    { name: 'Kalabasa (Squash)', emoji: '🎃', tip: 'Yellow-orange squash for ginataang kalabasa and pinakbet.' },
    { name: 'Pandan Leaves', emoji: '🌿', tip: 'Fragrant leaves for rice, desserts, and natural flavoring.' },
  ],
  byMonth: {
    '0':  [
      { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬', tip: 'Crisp Benguet cabbage at its best during Amihan.' },
      { name: 'Carrots', status: 'Peak Season', emoji: '🥕', tip: 'Sweet highland carrots for stews and afritada.' },
      { name: 'Patatas (Potato)', status: 'Peak Season', emoji: '🥔', tip: 'Cordillera potatoes; perfect for caldereta and nilaga.' },
      { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿', tip: 'Mild and tender; great in tinola and chopsuey.' },
      { name: 'Baguio Beans', status: 'Just In', emoji: '🫘', tip: 'Crisp French beans from the highlands.' },
      { name: 'Pineapple', status: 'Available', emoji: '🍍', tip: 'Philippine pineapples remain available after Christmas.' },
    ],
    '1':  [
      { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬', tip: 'Still at peak; a cool-weather highland staple.' },
      { name: 'Carrots', status: 'Peak Season', emoji: '🥕', tip: 'Firm and sweet; widely used in Filipino stews.' },
      { name: 'Broccoli', status: 'Peak Season', emoji: '🥦', tip: 'Abundant in Benguet; best steamed or in soups.' },
      { name: 'Cauliflower', status: 'Peak Season', emoji: '🌿', tip: 'Highland crop; excellent in cream soups and stir-fries.' },
      { name: 'Sayote (Chayote)', status: 'Available', emoji: '🌿', tip: 'Mild-flavored; used in tinola and chopsuey.' },
      { name: 'Pineapple', status: 'Available', emoji: '🍍', tip: 'Available from Cagayan de Oro and Bukidnon farms.' },
    ],
    '2':  [
      { name: 'Mangga (Mango)', status: 'Just In', emoji: '🥭', tip: 'Philippine mangoes start appearing — eat green with bagoong.' },
      { name: 'Pakwan (Watermelon)', status: 'Just In', emoji: '🍉', tip: 'Hydrating summer fruit just hitting the market.' },
      { name: 'Melon (Cantaloupe)', status: 'Just In', emoji: '🍈', tip: 'Sweet and fragrant; great for shakes and fruit salad.' },
      { name: 'Ampalaya (Bitter Gourd)', status: 'Available', emoji: '🌿', tip: 'Best sautéed with eggs or in pinakbet.' },
      { name: 'Kamias (Bilimbi)', status: 'Just In', emoji: '🌿', tip: 'Sour fruit used in sinigang and as souring agent.' },
      { name: 'Sibuyas (Shallots)', status: 'Peak Season', emoji: '🧅', tip: 'Harvested in Ilocos; essential for Filipino cooking.' },
    ],
    '3':  [
      { name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭', tip: 'Peak season — Philippine mangoes are at their sweetest.' },
      { name: 'Pakwan (Watermelon)', status: 'Peak Season', emoji: '🍉', tip: 'Abundant and perfect for the scorching summer heat.' },
      { name: 'Nangka (Jackfruit)', status: 'Just In', emoji: '🌿', tip: 'Ripe for desserts; unripe for kare-kare and ginata.' },
      { name: 'Melon (Cantaloupe)', status: 'Peak Season', emoji: '🍈', tip: 'Sweet and abundant; used in fruit salad and shakes.' },
      { name: 'Durian', status: 'Just In', emoji: '🌿', tip: 'Start of durian season in Mindanao.' },
      { name: 'Kamias (Bilimbi)', status: 'Peak Season', emoji: '🌿', tip: 'Great souring agent for sinigang and paksiw.' },
    ],
    '4':  [
      { name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭', tip: 'Still at absolute peak — stock up for sweets and sauces.' },
      { name: 'Nangka (Jackfruit)', status: 'Peak Season', emoji: '🌿', tip: 'At its best; sweet pulp for halo-halo and kakanin.' },
      { name: 'Durian', status: 'Peak Season', emoji: '🌿', tip: 'Peak season in Davao and other Mindanao provinces.' },
      { name: 'Pakwan (Watermelon)', status: 'Available', emoji: '🍉', tip: 'Still plentiful; great chilled or in juice.' },
      { name: 'Ampalaya (Bitter Gourd)', status: 'Peak Season', emoji: '🌿', tip: 'Abundant summer vegetable — great with egg and pork.' },
      { name: 'Sibuyas (Shallots)', status: 'Available', emoji: '🧅', tip: 'Still available from Ilocos harvest.' },
    ],
    '5':  [
      { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿', tip: 'Thrives in rainy season — cheap and nutritious.' },
      { name: 'Sitaw (String Beans)', status: 'Peak Season', emoji: '🫛', tip: 'Long beans in abundance for pinakbet and kare-kare.' },
      { name: 'Upo (Bottle Gourd)', status: 'Peak Season', emoji: '🌿', tip: 'Watery and mild; great in ginisang upo.' },
      { name: 'Pechay (Bok Choy)', status: 'Just In', emoji: '🥬', tip: 'Rainy season brings tender pechay to market.' },
      { name: 'Mais (Corn)', status: 'Just In', emoji: '🌽', tip: 'First corn of the rainy season — best boiled or grilled.' },
      { name: 'Gabi (Taro)', status: 'Just In', emoji: '🌿', tip: 'Starting to appear; essential for laing.' },
    ],
    '6':  [
      { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿', tip: 'Peak rainy season produce — very affordable.' },
      { name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬', tip: 'Tender and mild; staple in soups and stir-fries.' },
      { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽', tip: 'Sweet corn at its best — boil, grill, or make maja.' },
      { name: 'Sitaw (String Beans)', status: 'Peak Season', emoji: '🫛', tip: 'Great for pinakbet, kare-kare, and chopsuey.' },
      { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿', tip: 'Common in beef sinigang and pork nilaga.' },
      { name: 'Kamote (Sweet Potato)', status: 'Available', emoji: '🍠', tip: 'Leaves and tubers both useful in Filipino cooking.' },
    ],
    '7':  [
      { name: 'Kangkong (Water Spinach)', status: 'Peak Season', emoji: '🌿', tip: 'Still peaking — perfect for ginisang kangkong.' },
      { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽', tip: 'Plentiful; also used in corn soup and kakanin.' },
      { name: 'Upo (Bottle Gourd)', status: 'Peak Season', emoji: '🌿', tip: 'Light vegetable ideal for ginisa and tinola.' },
      { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿', tip: 'Fully in season; perfect for laing and sinigang.' },
      { name: 'Kamote (Sweet Potato)', status: 'Just In', emoji: '🍠', tip: 'Available boiled or as camote tops in sinigang.' },
      { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿', tip: 'Crisp radish for beef sinigang and nilaga.' },
    ],
    '8':  [
      { name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬', tip: 'Tender bok choy at peak in wet season.' },
      { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿', tip: 'Fully mature; best for laing and ginataang gabi.' },
      { name: 'Kamote (Sweet Potato)', status: 'Peak Season', emoji: '🍠', tip: 'Root and leaves both in season for sinigang.' },
      { name: 'Sitaw (String Beans)', status: 'Available', emoji: '🫛', tip: 'Still available as rainy season winds down.' },
      { name: 'Labanos (Radish)', status: 'Available', emoji: '🌿', tip: 'Mild and crisp; essential for beef sinigang.' },
      { name: 'Mais (Corn)', status: 'Available', emoji: '🌽', tip: 'Still available; great for soups and kakanin.' },
    ],
    '9':  [
      { name: 'Kamote (Sweet Potato)', status: 'Peak Season', emoji: '🍠', tip: 'Peak harvest season; sweet and filling.' },
      { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿', tip: 'Last peak before cool season; stock up for laing.' },
      { name: 'Pechay (Bok Choy)', status: 'Available', emoji: '🥬', tip: 'Still available as weather starts to cool.' },
      { name: 'Carrots', status: 'Just In', emoji: '🥕', tip: 'Highland carrots start appearing as Amihan approaches.' },
      { name: 'Sayote (Chayote)', status: 'Just In', emoji: '🌿', tip: 'Cool-weather vegetable starting to appear in market.' },
      { name: 'Patatas (Potato)', status: 'Just In', emoji: '🥔', tip: 'Benguet potato harvest season begins.' },
    ],
    '10': [
      { name: 'Repolyo (Cabbage)', status: 'Just In', emoji: '🥬', tip: 'First Benguet cabbage of the cool season.' },
      { name: 'Carrots', status: 'Peak Season', emoji: '🥕', tip: 'Highland carrots at peak — sweet and firm.' },
      { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿', tip: 'Abundant and affordable for tinola and stews.' },
      { name: 'Patatas (Potato)', status: 'Peak Season', emoji: '🥔', tip: 'Benguet harvest in full swing; great for caldereta.' },
      { name: 'Pineapple', status: 'Peak Season', emoji: '🍍', tip: 'Philippine pineapples from Cagayan de Oro peak now.' },
      { name: 'Baguio Beans', status: 'Just In', emoji: '🫘', tip: 'French beans from the Cordillera just arriving.' },
    ],
    '11': [
      { name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬', tip: 'Crisp Benguet cabbage at full peak for Christmas.' },
      { name: 'Carrots', status: 'Peak Season', emoji: '🥕', tip: 'Sweet carrots for Christmas cooking — mechado and afritada.' },
      { name: 'Broccoli', status: 'Just In', emoji: '🥦', tip: 'First broccoli of the season; great for soups and stir-fries.' },
      { name: 'Cauliflower', status: 'Just In', emoji: '🌿', tip: 'Highland cauliflower arriving for the holiday season.' },
      { name: 'Pineapple', status: 'Peak Season', emoji: '🍍', tip: 'Sweet pineapples abundant around Christmas.' },
      { name: 'Sayote (Chayote)', status: 'Peak Season', emoji: '🌿', tip: 'Mild and versatile; perfect for holiday chopsuey.' },
    ],
  },
};

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';
const AUTH_TOKEN_KEY = 'cookmate.auth.token';

function getAuthHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch { /* ignore */ }
  return {};
}

export function loadSeasonalData(): SeasonalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SeasonalData;
      if (parsed.seasons && parsed.yearRound && parsed.byMonth) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultSeasonalData;
}

export async function fetchSeasonalData(): Promise<SeasonalData> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/seasonal`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json() as SeasonalData;
    if (data.seasons && data.yearRound && data.byMonth) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      return data;
    }
  } catch { /* fall through to cache */ }
  return loadSeasonalData();
}

export async function saveSeasonalDataToApi(data: SeasonalData): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/seasonal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || 'Failed to save seasonal data');
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function saveSeasonalData(data: SeasonalData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function resetSeasonalData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function resetSeasonalDataToApi(): Promise<void> {
  await saveSeasonalDataToApi(defaultSeasonalData);
}
