import { parse } from "csv-parse/sync";
import Inventory from "../models/inventoryItem.js";

function safeToNumber(v) {
  if (v == null) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();

  // Try ISO format first
  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1;

  // Try DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    let yyyy = Number(m[3]);
    if (yyyy < 100) yyyy += 2000;
    const d2 = new Date(yyyy, mm, dd);
    if (!Number.isNaN(d2.getTime())) return d2;
  }

  return null;
}

function requirePharmacy(req, res) {
  if (!req.user) {
    return [false, res.status(401).json({ message: "Unauthorized" })];
  }
  if (req.userType !== "SuperUser" || req.user.role !== "pharmacy") {
    return [false, res.status(403).json({ message: "Only pharmacy accounts can access inventory" })];
  }
  return [true, null];
}

function normHeader(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");
}

const HEADER_SYNONYMS = {
  name: ["name", "item", "item_name", "product", "product_name", "drug", "medicine", "med_name", "description"],
  qty: ["qty", "quantity", "stock", "on_hand", "available", "balance", "units", "in_stock", "current_stock"],
  sku: ["sku", "code", "item_code", "barcode", "product_code", "id", "item_id"],
  unit_price: ["unit_price", "price", "selling_price", "sale_price", "mrp", "retail_price", "rate"],
  expiry_date: ["expiry", "expiry_date", "exp_date", "exp", "expiration", "expiration_date", "expire_date"],
  batch_no: ["batch", "batch_no", "batch_number", "lot", "lot_no", "lot_number"],
  brand: ["brand", "manufacturer", "company", "maker", "mfg"],
  strength: ["strength", "dose", "dosage", "mg", "concentration"],
};

function suggestMapping(headers) {
  const normalized = headers.map((h) => ({ raw: h, n: normHeader(h) }));

  const pick = (field) => {
    const candidates = HEADER_SYNONYMS[field] || [];

    // Exact match first
    for (const c of candidates) {
      const found = normalized.find((x) => x.n === normHeader(c));
      if (found) return found.raw;
    }

    // Partial match fallback
    for (const c of candidates) {
      const cn = normHeader(c);
      const found = normalized.find((x) => x.n.includes(cn) || cn.includes(x.n));
      if (found) return found.raw;
    }

    return null;
  };

  return {
    name: pick("name"),
    qty: pick("qty"),
    sku: pick("sku"),
    unit_price: pick("unit_price"),
    expiry_date: pick("expiry_date"),
    batch_no: pick("batch_no"),
    brand: pick("brand"),
    strength: pick("strength"),
  };
}

/* ===========================================================
   FULL INVENTORY AUTO-REFRESH (CLEAR ALL ITEMS)
=========================================================== */
async function autoClearInventoryIfNeeded(inv) {
  try {
    if (!inv) return { cleared: false, reason: "no_inventory" };
    if (!inv.autoRefreshSettings?.enabled) return { cleared: false, reason: "disabled" };

    const days = Number(inv.autoRefreshSettings.clearAfterDays || 3);
    if (!Number.isFinite(days) || days <= 0) return { cleared: false, reason: "invalid_days" };

    const last = inv.lastClearedAt ? new Date(inv.lastClearedAt) : new Date(inv.createdAt || Date.now());
    const now = new Date();

    const diffMs = now.getTime() - last.getTime();
    const limitMs = days * 24 * 60 * 60 * 1000;

    if (diffMs >= limitMs) {
      const oldCount = inv.items?.length || 0;
      inv.items = [];
      inv.lastClearedAt = now;
      await inv.save();

      return { cleared: true, deletedItems: oldCount, reason: "days_passed" };
    }

    return { cleared: false, reason: "not_due" };
  } catch (err) {
    console.error(" [autoClearInventoryIfNeeded]", err);
    return { cleared: false, reason: "error" };
  }
}

/**
 * Auto-delete expired items based on pharmacy settings (keep as-is)
 */
async function cleanExpiredItems(pharmacyId) {
  try {
    const inv = await Inventory.findOne({ pharmacyId });
    if (!inv || !inv.autoDeleteSettings?.enabled) {
      return { deleted: 0 };
    }

    const daysBuffer = inv.autoDeleteSettings.daysBeforeExpiry || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysBuffer);

    const initialCount = inv.items.length;

    inv.items = inv.items.filter((item) => {
      if (!item.expiry_date) return true;
      return new Date(item.expiry_date) > cutoffDate;
    });

    const deleted = initialCount - inv.items.length;

    if (deleted > 0) {
      await inv.save();
      console.log(`Deleted ${deleted} expired items for pharmacy ${pharmacyId}`);
    }

    return { deleted };
  } catch (err) {
    console.error("[cleanExpiredItems]", err);
    return { deleted: 0 };
  }
}


/**
 * 1️Parse CSV - Preview headers and data
 * POST /inventory/parse-csv
 */
export async function parseCsv(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const text = req.file.buffer.toString("utf8");

    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const headers = records.length ? Object.keys(records[0]) : [];
    const suggestedMapping = suggestMapping(headers);

    return res.status(200).json({
      message: "CSV parsed successfully",
      headers,
      suggestedMapping,
      preview: records.slice(0, 8),
      totalRows: records.length,
    });
  } catch (err) {
    console.error("[parseCsv]", err);
    return res.status(500).json({
      message: "Failed to parse CSV",
      error: err.message,
    });
  }
}

/**
 * Import CSV - Save inventory data
 * POST /inventory/import-csv
 */
export async function importCsv(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const { mapping, mode = "merge" } = req.body;
    if (!mapping) {
      return res.status(400).json({ message: "mapping is required (JSON string)" });
    }

    let mapObj;
    try {
      mapObj = typeof mapping === "string" ? JSON.parse(mapping) : mapping;
    } catch {
      return res.status(400).json({ message: "Invalid mapping JSON" });
    }

    if (!mapObj.name || !mapObj.qty) {
      return res.status(400).json({
        message: "Mapping must include at least: name and qty",
        example: { name: "ItemName", qty: "Stock" },
      });
    }

    const text = req.file.buffer.toString("utf8");
    const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });

    const pharmacyId = req.user.id;

    // Get or create inventory document
    let inv = await Inventory.findOne({ pharmacyId });
    if (!inv) {
      inv = new Inventory({
        pharmacyId,
        autoDeleteSettings: { enabled: true, daysBeforeExpiry: 7 },
        autoRefreshSettings: { enabled: false, clearAfterDays: 3 },
        lastClearedAt: new Date(),
        items: [],
      });
      await inv.save();
    }

    // Auto clear FULL inventory if needed (based on refresh settings)
    const refreshResult = await autoClearInventoryIfNeeded(inv);

    // Auto-delete expired items BEFORE import (existing feature)
    const cleanResult = await cleanExpiredItems(pharmacyId);

    // Parse CSV rows into items
    const newItems = [];
    for (const r of rows) {
      const name = String(r[mapObj.name] ?? "").trim();
      if (!name) continue;

      const qty = safeToNumber(r[mapObj.qty]);
      const sku = mapObj.sku ? String(r[mapObj.sku] ?? "").trim() : "";
      const unit_price = mapObj.unit_price ? safeToNumber(r[mapObj.unit_price]) : 0;
      const expiry_date = mapObj.expiry_date ? parseDate(r[mapObj.expiry_date]) : null;
      const batch_no = mapObj.batch_no ? String(r[mapObj.batch_no] ?? "").trim() : "";
      const brand = mapObj.brand ? String(r[mapObj.brand] ?? "").trim() : "";
      const strength = mapObj.strength ? String(r[mapObj.strength] ?? "").trim() : "";

      newItems.push({
        name,
        qty,
        sku,
        unit_price,
        expiry_date,
        batch_no,
        brand,
        strength,
        source: "csv",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (!newItems.length) {
      return res.status(400).json({
        message: "No valid rows found. Check your mapping and CSV content.",
      });
    }

    if (mode === "replace") {
      inv.items = newItems;
      await inv.save();

      return res.status(200).json({
        message: `Inventory replaced successfully`,
        imported: newItems.length,
        autoDeleted: cleanResult.deleted,
        autoRefreshed: refreshResult.cleared,
        refreshDeletedItems: refreshResult.deletedItems || 0,
      });
    }

    // Merge mode
    let upserts = 0;
    for (const newItem of newItems) {
      const existingIdx = inv.items.findIndex((item) => {
        if (newItem.sku && item.sku) return item.sku === newItem.sku;
        return item.name === newItem.name;
      });

      if (existingIdx >= 0) {
        const existingItem = inv.items[existingIdx];
        inv.items[existingIdx] = {
          ...existingItem.toObject(),
          ...newItem,
          updatedAt: new Date(),
        };
      } else {
        inv.items.push(newItem);
      }
      upserts++;
    }

    await inv.save();

    return res.status(200).json({
      message: `Inventory imported (merge) successfully`,
      imported: newItems.length,
      upserts,
      autoDeleted: cleanResult.deleted,
      autoRefreshed: refreshResult.cleared,
      refreshDeletedItems: refreshResult.deletedItems || 0,
    });
  } catch (err) {
    console.error("[importCsv]", err);
    return res.status(500).json({
      message: "Failed to import CSV",
      error: err.message,
    });
  }
}

/**
 * List inventory items with search
 * GET /inventory?q=search_term
 */
export async function listInventory(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    const pharmacyId = req.user.id;
    const { q = "" } = req.query;

    let inv = await Inventory.findOne({ pharmacyId });
    if (!inv) {
      // Create default doc if not exists
      inv = new Inventory({
        pharmacyId,
        autoDeleteSettings: { enabled: true, daysBeforeExpiry: 7 },
        autoRefreshSettings: { enabled: false, clearAfterDays: 3 },
        lastClearedAt: new Date(),
        items: [],
      });
      await inv.save();
    }

    // Auto clear FULL inventory if due
    const refreshResult = await autoClearInventoryIfNeeded(inv);

    let items = inv.items || [];

    // Search filter
    if (q) {
      const searchTerm = q.toLowerCase();
      items = items.filter((item) => {
        return (
          item.name.toLowerCase().includes(searchTerm) ||
          (item.sku && item.sku.toLowerCase().includes(searchTerm)) ||
          (item.brand && item.brand.toLowerCase().includes(searchTerm))
        );
      });
    }

    // Sort by updatedAt desc
    items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const itemsWithId = items.slice(0, 500).map((item) => ({
      ...item.toObject(),
      _id: item._id?.toString() || item._id,
    }));

    return res.status(200).json({
      count: itemsWithId.length,
      items: itemsWithId,

      autoDeleteSettings: inv.autoDeleteSettings,

      // NEW
      autoRefreshSettings: inv.autoRefreshSettings,
      lastClearedAt: inv.lastClearedAt,
      autoRefreshed: refreshResult.cleared,
      refreshDeletedItems: refreshResult.deletedItems || 0,
    });
  } catch (err) {
    console.error("[listInventory]", err);
    return res.status(500).json({
      message: "Failed to load inventory",
      error: err.message,
    });
  }
}

/**
 * Update single inventory item
 * PATCH /inventory/:id
 */
export async function updateInventoryItem(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    const pharmacyId = req.user.id;
    const { id } = req.params;

    const inv = await Inventory.findOne({ pharmacyId });
    if (!inv) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    const item = inv.items.id(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const allowed = ["name", "sku", "qty", "unit_price", "batch_no", "brand", "strength", "expiry_date"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === "qty" || k === "unit_price") {
          item[k] = safeToNumber(req.body[k]);
        } else if (k === "expiry_date") {
          item[k] = parseDate(req.body[k]);
        } else {
          item[k] = req.body[k];
        }
      }
    }

    item.updatedAt = new Date();
    await inv.save();

    return res.status(200).json({
      message: "Item updated successfully",
      item: item.toObject(),
    });
  } catch (err) {
    console.error("[updateInventoryItem]", err);
    return res.status(500).json({
      message: "Failed to update item",
      error: err.message,
    });
  }
}

/**
 * Delete single inventory item
 * DELETE /inventory/:id
 */
export async function deleteInventoryItem(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    const pharmacyId = req.user.id;
    const { id } = req.params;

    const inv = await Inventory.findOne({ pharmacyId });
    if (!inv) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    const item = inv.items.id(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.deleteOne();
    await inv.save();

    return res.status(200).json({
      message: "Item deleted successfully",
    });
  } catch (err) {
    console.error("[deleteInventoryItem]", err);
    return res.status(500).json({
      message: "Failed to delete item",
      error: err.message,
    });
  }
}

/**
 * Update auto-delete settings (expired items)
 * PUT /inventory/settings/auto-delete
 */
export async function updateAutoDeleteSettings(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    const pharmacyId = req.user.id;
    const { enabled, daysBeforeExpiry } = req.body;

    let inv = await Inventory.findOne({ pharmacyId });
    if (!inv) {
      inv = new Inventory({
        pharmacyId,
        autoDeleteSettings: { enabled: true, daysBeforeExpiry: 7 },
        autoRefreshSettings: { enabled: false, clearAfterDays: 3 },
        lastClearedAt: new Date(),
        items: [],
      });
    }

    if (enabled !== undefined) {
      inv.autoDeleteSettings.enabled = Boolean(enabled);
    }

    if (daysBeforeExpiry !== undefined) {
      const days = Number(daysBeforeExpiry);
      if (days > 0 && days <= 365) {
        inv.autoDeleteSettings.daysBeforeExpiry = days;
      }
    }

    await inv.save();

    return res.status(200).json({
      message: "Auto-delete settings updated successfully",
      autoDeleteSettings: inv.autoDeleteSettings,
    });
  } catch (err) {
    console.error("[updateAutoDeleteSettings]", err);
    return res.status(500).json({
      message: "Failed to update settings",
      error: err.message,
    });
  }
}

/**
 * Update auto-refresh settings (FULL inventory clear)
 * PUT /inventory/settings/auto-refresh
 */
export async function updateAutoRefreshSettings(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    const pharmacyId = req.user.id;
    const { enabled, clearAfterDays } = req.body;

    let inv = await Inventory.findOne({ pharmacyId });
    if (!inv) {
      inv = new Inventory({
        pharmacyId,
        autoDeleteSettings: { enabled: true, daysBeforeExpiry: 7 },
        autoRefreshSettings: { enabled: false, clearAfterDays: 3 },
        lastClearedAt: new Date(),
        items: [],
      });
    }

    if (enabled !== undefined) {
      inv.autoRefreshSettings.enabled = Boolean(enabled);

      if (Boolean(enabled) === true) {
        inv.lastClearedAt = new Date();
      }
    }

    if (clearAfterDays !== undefined) {
      const d = Number(clearAfterDays);
      if (Number.isFinite(d) && d >= 1 && d <= 365) {
        inv.autoRefreshSettings.clearAfterDays = d;
      }
    }

    await inv.save();

    return res.status(200).json({
      message: "Auto-refresh settings updated successfully",
      autoRefreshSettings: inv.autoRefreshSettings,
      lastClearedAt: inv.lastClearedAt,
    });
  } catch (err) {
    console.error("[updateAutoRefreshSettings]", err);
    return res.status(500).json({
      message: "Failed to update auto-refresh settings",
      error: err.message,
    });
  }
}

/**
 * Manual cleanup of expired items
 * POST /inventory/cleanup
 */
export async function manualCleanup(req, res) {
  const [ok] = requirePharmacy(req, res);
  if (!ok) return;

  try {
    const pharmacyId = req.user.id;
    const result = await cleanExpiredItems(pharmacyId);

    return res.status(200).json({
      message: `Cleanup completed: ${result.deleted} expired items removed`,
      deleted: result.deleted,
    });
  } catch (err) {
    console.error("[manualCleanup]", err);
    return res.status(500).json({
      message: "Failed to cleanup",
      error: err.message,
    });
  }
}