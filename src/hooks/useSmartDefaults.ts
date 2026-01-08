import { useEffect, useState } from "react";

/**
 * Smart Defaults System
 * Provides intelligent default values based on user behavior and context
 */

// Storage keys
const STORAGE_KEYS = {
  LAST_CLIENT: "smart_last_client",
  LAST_TECHNIQUE: "smart_last_technique",
  LAST_QUANTITY: "smart_last_quantity",
  PREFERRED_PAYMENT: "smart_preferred_payment",
  PREFERRED_DELIVERY: "smart_preferred_delivery",
  DISCOUNT_PATTERN: "smart_discount_pattern",
  RECENT_PRODUCTS: "smart_recent_products",
  USER_PREFERENCES: "smart_user_preferences",
};

// Types
interface SmartDefaults {
  lastClientId?: string;
  lastClientName?: string;
  lastTechniqueId?: string;
  lastTechniqueName?: string;
  lastQuantity?: number;
  preferredPaymentTerms?: string;
  preferredDeliveryTime?: string;
  commonDiscountPercent?: number;
  recentProductIds?: string[];
}

interface UserPreferences {
  defaultValidityDays: number;
  defaultPaymentTerms: string;
  defaultDeliveryTime: string;
  autoSaveQuotes: boolean;
  showPricesWithTax: boolean;
}

// Get smart defaults
export function getSmartDefaults(): SmartDefaults {
  try {
    return {
      lastClientId: localStorage.getItem(STORAGE_KEYS.LAST_CLIENT) || undefined,
      lastClientName: localStorage.getItem(`${STORAGE_KEYS.LAST_CLIENT}_name`) || undefined,
      lastTechniqueId: localStorage.getItem(STORAGE_KEYS.LAST_TECHNIQUE) || undefined,
      lastTechniqueName: localStorage.getItem(`${STORAGE_KEYS.LAST_TECHNIQUE}_name`) || undefined,
      lastQuantity: parseInt(localStorage.getItem(STORAGE_KEYS.LAST_QUANTITY) || "0") || undefined,
      preferredPaymentTerms: localStorage.getItem(STORAGE_KEYS.PREFERRED_PAYMENT) || undefined,
      preferredDeliveryTime: localStorage.getItem(STORAGE_KEYS.PREFERRED_DELIVERY) || undefined,
      commonDiscountPercent: parseFloat(localStorage.getItem(STORAGE_KEYS.DISCOUNT_PATTERN) || "0") || undefined,
      recentProductIds: JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_PRODUCTS) || "[]"),
    };
  } catch {
    return {};
  }
}

// Save smart default
export function saveSmartDefault(key: keyof SmartDefaults, value: unknown, extraData?: Record<string, string>) {
  try {
    const storageKey = {
      lastClientId: STORAGE_KEYS.LAST_CLIENT,
      lastClientName: `${STORAGE_KEYS.LAST_CLIENT}_name`,
      lastTechniqueId: STORAGE_KEYS.LAST_TECHNIQUE,
      lastTechniqueName: `${STORAGE_KEYS.LAST_TECHNIQUE}_name`,
      lastQuantity: STORAGE_KEYS.LAST_QUANTITY,
      preferredPaymentTerms: STORAGE_KEYS.PREFERRED_PAYMENT,
      preferredDeliveryTime: STORAGE_KEYS.PREFERRED_DELIVERY,
      commonDiscountPercent: STORAGE_KEYS.DISCOUNT_PATTERN,
      recentProductIds: STORAGE_KEYS.RECENT_PRODUCTS,
    }[key];
    
    if (storageKey) {
      if (Array.isArray(value)) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        localStorage.setItem(storageKey, String(value));
      }
      
      // Save extra data (like names)
      if (extraData) {
        Object.entries(extraData).forEach(([k, v]) => {
          localStorage.setItem(`${storageKey}_${k}`, v);
        });
      }
    }
  } catch (e) {
    console.warn("Failed to save smart default:", e);
  }
}

// Get user preferences
export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  
  return {
    defaultValidityDays: 15,
    defaultPaymentTerms: "30 dias",
    defaultDeliveryTime: "15-20 dias úteis",
    autoSaveQuotes: true,
    showPricesWithTax: false,
  };
}

// Save user preferences
export function saveUserPreferences(prefs: Partial<UserPreferences>) {
  try {
    const current = getUserPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save preferences:", e);
  }
}

// Hook for smart defaults
export function useSmartDefaults() {
  const [defaults, setDefaults] = useState<SmartDefaults>(getSmartDefaults);
  
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (Object.values(STORAGE_KEYS).some(key => e.key?.includes(key))) {
        setDefaults(getSmartDefaults());
      }
    };
    
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
  
  const save = <K extends keyof SmartDefaults>(key: K, value: SmartDefaults[K], extra?: Record<string, string>) => {
    saveSmartDefault(key, value, extra);
    setDefaults(getSmartDefaults());
  };
  
  return { defaults, save };
}

// Hook for user preferences
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(getUserPreferences);
  
  const update = (updates: Partial<UserPreferences>) => {
    saveUserPreferences(updates);
    setPreferences(getUserPreferences());
  };
  
  return { preferences, update };
}

// Suggest quantity based on history
export function suggestQuantity(productId: string): number | null {
  try {
    const history = JSON.parse(localStorage.getItem("quantity_history") || "{}");
    const productHistory = history[productId];
    
    if (productHistory && Array.isArray(productHistory) && productHistory.length > 0) {
      // Return most common quantity
      const counts: Record<number, number> = {};
      productHistory.forEach((q: number) => {
        counts[q] = (counts[q] || 0) + 1;
      });
      
      return parseInt(
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
      );
    }
  } catch {}
  
  return null;
}

// Record quantity for suggestions
export function recordQuantity(productId: string, quantity: number) {
  try {
    const history = JSON.parse(localStorage.getItem("quantity_history") || "{}");
    if (!history[productId]) {
      history[productId] = [];
    }
    history[productId].push(quantity);
    // Keep only last 10
    history[productId] = history[productId].slice(-10);
    localStorage.setItem("quantity_history", JSON.stringify(history));
  } catch {}
}

// Get suggested discount based on client history
export function getSuggestedDiscount(clientId: string): number | null {
  try {
    const history = JSON.parse(localStorage.getItem("discount_history") || "{}");
    const clientHistory = history[clientId];
    
    if (clientHistory && Array.isArray(clientHistory) && clientHistory.length > 0) {
      // Return average discount
      const sum = clientHistory.reduce((a: number, b: number) => a + b, 0);
      return Math.round(sum / clientHistory.length);
    }
  } catch {}
  
  return null;
}

// Record discount for suggestions
export function recordDiscount(clientId: string, discountPercent: number) {
  try {
    const history = JSON.parse(localStorage.getItem("discount_history") || "{}");
    if (!history[clientId]) {
      history[clientId] = [];
    }
    history[clientId].push(discountPercent);
    // Keep only last 5
    history[clientId] = history[clientId].slice(-5);
    localStorage.setItem("discount_history", JSON.stringify(history));
  } catch {}
}
