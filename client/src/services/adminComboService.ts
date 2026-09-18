import { db } from "./firebase/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

export interface ComboItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPriceSnapshot: number;
}

export interface ComboPricingInput {
  comboPrice: number;
  kpMemberPrice?: number | null;
  originalTotalPrice: number;
  savingsAmount?: number;
  gstPercentage?: number;
}

export interface ComboDocument {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  images: {
    main: string;
    gallery?: string[];
  };
  pricing: ComboPricingInput;
  units_in_stock: number;
  inStock: boolean;
  items: ComboItemInput[];
  status: "active" | "draft" | "hidden";
  categoryIds?: string[];
  isBestseller?: boolean;
  isSample?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockHistoryEntry {
  id: string;
  changeType: "manual_adjustment" | "order_deduction" | "order_cancellation_restock";
  previousStock: number;
  changeQuantity: number;
  newStock: number;
  referenceId: string;
  timestamp: string;
}

export interface ProductSnapshot {
  id: string;
  name: string;
  isSample?: boolean;
  variants?: { id: string; weight: string; price: number }[];
}

const COMBOS_COLLECTION = "combos";
const PRODUCTS_COLLECTION = "products";

/**
 * Fetch all combos from Firestore
 */
export async function getAllCombos(): Promise<ComboDocument[]> {
  const combosRef = collection(db, COMBOS_COLLECTION);
  const snapshot = await getDocs(combosRef);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const units = typeof data.units_in_stock === "number" ? data.units_in_stock : 0;
    return {
      id: docSnap.id,
      name: data.name || data.title || "",
      slug: data.slug || "",
      description: data.description || "",
      shortDescription: data.shortDescription || "",
      images: data.images || { main: "", gallery: [] },
      pricing: {
        comboPrice: data.pricing?.comboPrice ?? data.comboPrice ?? 0,
        kpMemberPrice: data.pricing?.kpMemberPrice ?? data.kpMemberPrice ?? null,
        originalTotalPrice: data.pricing?.originalTotalPrice ?? data.originalTotalPrice ?? 0,
        savingsAmount: data.pricing?.savingsAmount ?? 0,
        gstPercentage: data.pricing?.gstPercentage ?? 5,
      },
      units_in_stock: units,
      inStock: units > 0,
      items: Array.isArray(data.items) ? data.items : [],
      status: data.status || "active",
      categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : ["combo-packs"],
      isBestseller: Boolean(data.isBestseller),
      isSample: Boolean(data.isSample),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : "",
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : "",
    };
  });
}

/**
 * Search active products for constituent item picker
 */
export async function getProductsForPicker(): Promise<ProductSnapshot[]> {
  const productsRef = collection(db, PRODUCTS_COLLECTION);
  const snapshot = await getDocs(productsRef);
  
  // For each product, also query its variants subcollection if variants aren't embedded
  const products = await Promise.all(
    snapshot.docs.map(async (d) => {
      const data = d.data();
      let variants = Array.isArray(data.variants) ? data.variants : [];

      if (variants.length === 0) {
        try {
          const variantsRef = collection(db, PRODUCTS_COLLECTION, d.id, "variants");
          const variantsSnap = await getDocs(variantsRef);
          variants = variantsSnap.docs.map((vDoc) => {
            const vData = vDoc.data();
            return {
              id: vDoc.id,
              weight: vData.weight || "Standard",
              price: typeof vData.price === "number" ? vData.price : 0,
            };
          });
        } catch (e) {
          console.warn(`Failed to fetch subcollection variants for product ${d.id}`, e);
        }
      }

      return {
        id: d.id,
        name: data.name || "Product",
        isSample: Boolean(data.isSample),
        variants,
      };
    })
  );

  return products;
}

/**
 * Create a new Combo document in Firestore
 */
export async function createCombo(input: Omit<ComboDocument, "id">): Promise<string> {
  const combosRef = collection(db, COMBOS_COLLECTION);
  const newComboRef = doc(combosRef);
  const comboId = newComboRef.id;

  const units = typeof input.units_in_stock === "number" ? input.units_in_stock : 0;

  const comboData = {
    title: input.name,
    name: input.name,
    slug: input.slug,
    description: input.description || "",
    shortDescription: input.shortDescription || "",
    images: input.images,
    comboPrice: Number(input.pricing.comboPrice) || 0,
    kpMemberPrice: input.pricing.kpMemberPrice ? Number(input.pricing.kpMemberPrice) : null,
    originalTotalPrice: Number(input.pricing.originalTotalPrice) || 0,
    pricing: {
      comboPrice: Number(input.pricing.comboPrice) || 0,
      kpMemberPrice: input.pricing.kpMemberPrice ? Number(input.pricing.kpMemberPrice) : null,
      originalTotalPrice: Number(input.pricing.originalTotalPrice) || 0,
      savingsAmount: Number(input.pricing.savingsAmount) || 0,
      gstPercentage: Number(input.pricing.gstPercentage) || 5,
    },
    units_in_stock: units,
    stockStatus: units <= 0 ? "out_of_stock" : units <= 5 ? "low_stock" : "in_stock",
    inStock: units > 0,
    items: input.items || [],
    status: input.status || "active",
    categoryIds: input.categoryIds || ["combo-packs"],
    isBestseller: Boolean(input.isBestseller),
    isSample: Boolean(input.isSample),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newComboRef, comboData);

  if (units > 0) {
    const historyRef = doc(collection(db, COMBOS_COLLECTION, comboId, "stockHistory"));
    await setDoc(historyRef, {
      changeType: "manual_adjustment",
      previousStock: 0,
      changeQuantity: units,
      newStock: units,
      referenceId: "admin_initial_creation",
      timestamp: serverTimestamp(),
    });
  }

  return comboId;
}

/**
 * Update an existing Combo document and log stock changes atomically
 */
export async function updateCombo(
  comboId: string,
  input: Partial<ComboDocument>,
  adminUid: string = "admin"
): Promise<void> {
  const comboRef = doc(db, COMBOS_COLLECTION, comboId);

  await runTransaction(db, async (transaction) => {
    const comboSnap = await transaction.get(comboRef);
    if (!comboSnap.exists()) {
      throw new Error("Combo document does not exist");
    }

    const currentData = comboSnap.data();
    const currentUnits = typeof currentData.units_in_stock === "number" ? currentData.units_in_stock : 0;

    let stockChanged = false;
    let newUnits = currentUnits;

    if (typeof input.units_in_stock === "number" && input.units_in_stock !== currentUnits) {
      stockChanged = true;
      newUnits = input.units_in_stock;
    }

    const updates: Record<string, any> = {
      ...input,
      ...(input.name ? { title: input.name } : {}),
      ...(input.pricing?.comboPrice !== undefined ? { comboPrice: input.pricing.comboPrice } : {}),
      ...(input.pricing?.kpMemberPrice !== undefined ? { kpMemberPrice: input.pricing.kpMemberPrice } : {}),
      ...(input.pricing?.originalTotalPrice !== undefined ? { originalTotalPrice: input.pricing.originalTotalPrice } : {}),
      updatedAt: serverTimestamp(),
    };
    delete updates.id;

    if (stockChanged) {
      updates.units_in_stock = newUnits;
      updates.inStock = newUnits > 0;
      updates.stockStatus = newUnits <= 0 ? "out_of_stock" : newUnits <= 5 ? "low_stock" : "in_stock";
    }

    transaction.update(comboRef, updates);

    if (stockChanged) {
      const historyRef = doc(collection(db, COMBOS_COLLECTION, comboId, "stockHistory"));
      transaction.set(historyRef, {
        changeType: "manual_adjustment",
        previousStock: currentUnits,
        changeQuantity: newUnits - currentUnits,
        newStock: newUnits,
        referenceId: adminUid,
        timestamp: serverTimestamp(),
      });
    }
  });
}

/**
 * Quick adjust stock quantity
 */
export async function quickAdjustStock(
  comboId: string,
  delta: number,
  reason: string = "Quick stock adjustment",
  adminUid: string = "admin"
): Promise<void> {
  const comboRef = doc(db, COMBOS_COLLECTION, comboId);

  await runTransaction(db, async (transaction) => {
    const comboSnap = await transaction.get(comboRef);
    if (!comboSnap.exists()) throw new Error("Combo document not found");

    const currentUnits = comboSnap.data().units_in_stock || 0;
    const newUnits = Math.max(0, currentUnits + delta);

    transaction.update(comboRef, {
      units_in_stock: newUnits,
      inStock: newUnits > 0,
      stockStatus: newUnits <= 0 ? "out_of_stock" : newUnits <= 5 ? "low_stock" : "in_stock",
      updatedAt: serverTimestamp(),
    });

    const historyRef = doc(collection(db, COMBOS_COLLECTION, comboId, "stockHistory"));
    transaction.set(historyRef, {
      changeType: "manual_adjustment",
      previousStock: currentUnits,
      changeQuantity: delta,
      newStock: newUnits,
      referenceId: `${adminUid}:${reason}`,
      timestamp: serverTimestamp(),
    });
  });
}

/**
 * Fetch stock history audit log for a combo
 */
export async function getComboStockHistory(comboId: string): Promise<StockHistoryEntry[]> {
  const historyRef = collection(db, COMBOS_COLLECTION, comboId, "stockHistory");
  const q = query(historyRef, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data();
    let ts = d.timestamp;
    if (ts && typeof ts.toDate === "function") {
      ts = ts.toDate().toISOString();
    } else {
      ts = new Date().toISOString();
    }
    return {
      id: docSnap.id,
      changeType: d.changeType || "manual_adjustment",
      previousStock: d.previousStock ?? 0,
      changeQuantity: d.changeQuantity ?? 0,
      newStock: d.newStock ?? 0,
      referenceId: d.referenceId || "",
      timestamp: String(ts),
    };
  });
}

/**
 * Delete a Combo document
 */
export async function deleteCombo(comboId: string): Promise<void> {
  await deleteDoc(doc(db, COMBOS_COLLECTION, comboId));
}
