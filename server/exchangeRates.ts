import { db } from "./db";
import { exchangeRates } from "../shared/schema.js";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { safeJsonParse } from "./utils/safeJson";

// Supported currencies
export const SUPPORTED_CURRENCIES = ["USD", "TRY", "SAR", "EGP", "EUR", "AED"] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Exchange rates interface
export interface ExchangeRatesData {
  base: string;
  date: string;
  rates: Record<string, number>;
  fetchedAt: Date;
}

// Default fallback rates (approximate, used only if API and cache fail)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  TRY: 32.5,
  SAR: 3.75,
  EGP: 49.5,
  EUR: 0.92,
  AED: 3.67,
};

// Cache in memory (1 hour)
let memoryCache: ExchangeRatesData | null = null;
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour

/**
 * Fetch exchange rates from external API
 * Using open.er-api.com (free, reliable, supports all required currencies)
 */
async function fetchFromAPI(): Promise<Record<string, number> | null> {
  try {
    // Primary: open.er-api.com
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.result === "success" && data.rates) {
        // Filter to only supported currencies
        const filteredRates: Record<string, number> = { USD: 1 };
        for (const currency of SUPPORTED_CURRENCIES) {
          if (data.rates[currency]) {
            filteredRates[currency] = data.rates[currency];
          }
        }
        return filteredRates;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch exchange rates from API:", error);
    return null;
  }
}

/**
 * Get cached rates from database
 */
async function getCachedRates(): Promise<ExchangeRatesData | null> {
  try {
    const cached = await db
      .select()
      .from(exchangeRates)
      .orderBy(desc(exchangeRates.fetchedAt))
      .limit(1);

    if (cached.length > 0) {
      const record = cached[0];
      return {
        base: record.base,
        date: record.date,
        rates: safeJsonParse(record.rates, FALLBACK_RATES),
        fetchedAt: record.fetchedAt || new Date(),
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get cached rates:", error);
    return null;
  }
}

/**
 * Save rates to database cache
 */
async function saveToCache(rates: Record<string, number>): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    await db.insert(exchangeRates).values({
      id: randomUUID(),
      base: "USD",
      date: today,
      rates: JSON.stringify(rates),
    });
  } catch (error) {
    console.error("Failed to save rates to cache:", error);
  }
}

/**
 * Check if cache is still valid (less than 1 hour old)
 */
function isCacheValid(fetchedAt: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - fetchedAt.getTime();
  return diff < CACHE_DURATION_MS;
}

/**
 * Get current exchange rates (with caching strategy)
 * 1. Check memory cache
 * 2. Check database cache
 * 3. Fetch from API
 * 4. Use fallback rates
 */
export async function getExchangeRates(): Promise<ExchangeRatesData> {
  // 1. Check memory cache
  if (memoryCache && isCacheValid(memoryCache.fetchedAt)) {
    return memoryCache;
  }

  // 2. Check database cache
  const dbCache = await getCachedRates();
  if (dbCache && isCacheValid(dbCache.fetchedAt)) {
    memoryCache = dbCache;
    return dbCache;
  }

  // 3. Fetch from API
  const apiRates = await fetchFromAPI();
  if (apiRates) {
    const today = new Date().toISOString().split("T")[0];
    const ratesData: ExchangeRatesData = {
      base: "USD",
      date: today,
      rates: apiRates,
      fetchedAt: new Date(),
    };
    
    // Save to database and memory
    await saveToCache(apiRates);
    memoryCache = ratesData;
    return ratesData;
  }

  // 4. Use database cache even if stale
  if (dbCache) {
    console.warn("Using stale exchange rates from database cache");
    memoryCache = dbCache;
    return dbCache;
  }

  // 5. Last resort: fallback rates
  console.warn("Using fallback exchange rates");
  const fallbackData: ExchangeRatesData = {
    base: "USD",
    date: new Date().toISOString().split("T")[0],
    rates: FALLBACK_RATES,
    fetchedAt: new Date(),
  };
  memoryCache = fallbackData;
  return fallbackData;
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const ratesData = await getExchangeRates();
  const rates = ratesData.rates;

  // Convert to USD first, then to target currency
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  // amount / fromRate gives us USD value
  // then * toRate gives us target currency
  const converted = (amount / fromRate) * toRate;
  
  return Math.round(converted * 100) / 100; // Round to 2 decimals
}

/**
 * Force refresh exchange rates (for admin use or scheduled tasks)
 */
export async function refreshExchangeRates(): Promise<ExchangeRatesData | null> {
  const apiRates = await fetchFromAPI();
  if (apiRates) {
    const today = new Date().toISOString().split("T")[0];
    const ratesData: ExchangeRatesData = {
      base: "USD",
      date: today,
      rates: apiRates,
      fetchedAt: new Date(),
    };
    
    await saveToCache(apiRates);
    memoryCache = ratesData;
    return ratesData;
  }
  return null;
}
