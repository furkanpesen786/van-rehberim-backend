export type TabType = 'home' | 'places' | 'news' | 'deals' | 'jobs' | 'settings';

export interface JobListing {
  id: string;
  title: string;
  providerName: string;
  category: string;
  district: string;
  address?: string;
  phone: string;
  description: string;
  photo?: string;
  durationDays: 1 | 3 | 7 | 15 | 30;
  pricePaid: number;
  createdAt: string;
  isFeatured?: boolean;
  experienceYears?: string;
}

export interface JobCategory {
  id: string;
  name: string;
  iconName: string;
  color: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  distance: string;
  isOpen24h: boolean;
  dutyDate: string;
  mapsUrl?: string;
  city?: string;
  isLive?: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  type: 'Devlet' | 'Özel' | 'Üniversite';
  district: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  hasEmergency: boolean;
  rating: number;
  mapUrl?: string;
}

export interface BusRoute {
  id: string;
  lineNo: string;
  title: string;
  route: string;
  departureTimes: string[];
  returnTimes?: string[];
  stops?: string[];
  frequency: string;
  status: 'Aktif' | 'Yoğun' | 'Tamamlandı';
  tariff?: string;
  operatingHours?: string;
}

export interface TaxiStand {
  id: string;
  name: string;
  driverName?: string;
  plate: string;
  phone: string;
  operatingRegions: string;
  district?: string;
  address?: string;
  availableVehicles?: number;
  subscriptionPlan?: 'FIRST_MONTH_FREE' | 'PAID';
  monthlyFee?: string;
  createdAt?: string;
}

export interface PlaceToVisit {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  image: string;
  category: 'Tarih' | 'Doğa' | 'Kültür' | 'Göl';
  location: string;
  distanceFromCenter: string;
  bestTimeToVisit: string;
  entryFee: string;
  rating: number;
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  image: string;
  summary: string;
  content: string;
  date: string;
  time: string;
  source: string;
  sourceUrl?: string;
  readCount: number;
}

export interface Deal {
  id: string;
  storeName: string;
  category: string;
  dealTitle: string;
  discountRate: string;
  image: string;
  images?: string[];
  startDate: string;
  endDate: string;
  locationName: string;
  address: string;
  description: string;
  isFeatured?: boolean;
}

export interface DeathNotice {
  id: string;
  fullName: string;
  age: number | string;
  family: string;
  funeralPlace: string;
  condolenceAddress: string;
  date: string;
  contactPhone: string;
  sourceUrl?: string;
}

export interface CurrencyRate {
  code: string;
  name: string;
  value: string;
  change: string;
  isUp: boolean;
}

export interface WeatherDayForecast {
  day: string;
  date: string;
  condition: string;
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'wind';
  tempMax: number;
  tempMin: number;
  pop: number;
  humidity: number;
}

export interface VanWeatherData {
  city: string;
  currentTemp: number;
  feelsLike: number;
  condition: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  uvIndex: number;
  uvStatus: string;
  uvAdvice: string;
  aqi: number;
  aqiStatus: string;
  aqiColor: string;
  aqiAdvice: string;
  lastUpdated: string;
  forecast7Days: WeatherDayForecast[];
}

export interface PrayerTimes {
  imsak: string;
  sabah: string;
  ogle: string;
  ikindi: string;
  aksam: string;
  yatsi: string;
  nextPrayer: string;
  remainingMinutes: number;
}
