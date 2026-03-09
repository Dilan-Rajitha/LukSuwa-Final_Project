
import mongoose from "mongoose";


const inventorySchema = new mongoose.Schema(
  {
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperUser",
      required: true,
      unique: true, 
      index: true,
    },

    // Auto-delete settings for expired items
    autoDeleteSettings: {
      enabled: { type: Boolean, default: true },
      daysBeforeExpiry: { type: Number, default: 7 },
    },

    // Auto refresh (FULL CLEAR) settings
    autoRefreshSettings: {
      enabled: { type: Boolean, default: false }, // default OFF (you can turn ON from UI)
      clearAfterDays: { type: Number, default: 3 },
    },

    // last time inventory got auto-cleared (for timer)
    lastClearedAt: { type: Date, default: Date.now },

    // All inventory items stored in array
    items: [
      {
        name: { type: String, required: true, trim: true },
        sku: { type: String, default: "", trim: true },

        qty: { type: Number, default: 0 },
        unit_price: { type: Number, default: 0 },

        batch_no: { type: String, default: "", trim: true },
        expiry_date: { type: Date, default: null },

        brand: { type: String, default: "", trim: true },
        strength: { type: String, default: "", trim: true },

        source: { type: String, default: "csv" }, // csv / manual

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Text index for search functionality
inventorySchema.index({
  "items.name": "text",
  "items.sku": "text",
  "items.brand": "text",
});

const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;