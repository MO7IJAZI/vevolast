import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export type Currency = "TRY" | "USD" | "EUR" | "SAR" | "AED" | "EGP";

interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  nameAr: string;
  locale: string;
}

export const currencies: Record<Currency, CurrencyInfo> = {
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira", nameAr: "ليرة تركية", locale: "tr-TR" },
  USD: { code: "USD", symbol: "$", name: "US Dollar", nameAr: "دولار أمريكي", locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", nameAr: "يورو", locale: "de-DE" },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", nameAr: "ريال سعودي", locale: "ar-SA" },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", nameAr: "درهم إماراتي", locale: "ar-AE" },
  EGP: { code: "EGP", symbol: "E£", name: "Egyptian Pound", nameAr: "جنيه مصري", locale: "ar-EG" },
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number, currencyOverride?: Currency) => string;
  convertAmount: (amount: number, from: Currency, to?: Currency) => number;
  currencyInfo: CurrencyInfo;
  rates: Record<string, number> | undefined;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("vevoline-currency");
    return (saved as Currency) || "USD";
  });

  // Fetch exchange rates
  const { data: exchangeRates, isLoading } = useQuery<{ rates: Record<string, number>; date: string }>({
    queryKey: ["/api/exchange-rates"],
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    localStorage.setItem("vevoline-currency", currency);
  }, [currency]);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  const convertAmount = (amount: number, from: Currency, to: Currency = currency): number => {
    if (from === to) return amount;
    if (!exchangeRates?.rates) return amount;

    const fromRate = exchangeRates.rates[from] || 1;
    const toRate = exchangeRates.rates[to] || 1;

    // Convert to USD then to target
    // amount / fromRate = amount in USD
    // amount in USD * toRate = amount in target
    const converted = (amount / fromRate) * toRate;
    return Math.round(converted * 100) / 100;
  };

  const formatCurrency = (amount: number, currencyOverride?: Currency): string => {
    const curr = currencyOverride || currency;
    const info = currencies[curr];
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currencyInfo = currencies[currency];

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatCurrency, 
      convertAmount,
      currencyInfo,
      rates: exchangeRates?.rates,
      isLoading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
