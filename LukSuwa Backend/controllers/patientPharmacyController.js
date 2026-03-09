import Inventory from "../models/inventoryItem.js";
import SuperUser from "../models/superUser.js";

/**
 * Search for medicine across all pharmacies
 * GET /patient/pharmacies/search?medicine=paracetamol
 */
export async function searchMedicineInPharmacies(req, res) {
  try {
    const { medicine } = req.query;

    if (!medicine || !medicine.trim()) {
      return res.status(400).json({ message: "Medicine name is required" });
    }

    const searchTerm = medicine.trim();

    // Find all inventories that have items matching the medicine name
    const inventories = await Inventory.find({
      "items.name": { $regex: searchTerm, $options: "i" },
    }).select("pharmacyId items autoDeleteSettings");

    if (!inventories.length) {
      return res.status(200).json({
        message: "No pharmacies found with this medicine",
        pharmacies: [],
      });
    }

    // Get pharmacy details for each inventory
    const pharmacyIds = inventories.map((inv) => inv.pharmacyId);
    const pharmacies = await SuperUser.find({
      _id: { $in: pharmacyIds },
      role: "pharmacy",
      isApproved: true,
    }).select("pharmacy_name address phone_number location");

    // Build response with pharmacy details + matching items
    const results = [];

    for (const inv of inventories) {
      const pharmacy = pharmacies.find((p) => p._id.toString() === inv.pharmacyId.toString());
      
      if (!pharmacy) continue; // Skip if pharmacy not found or not approved

      // Filter items that match search term
      const matchingItems = inv.items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingItems.length === 0) continue;

      results.push({
        pharmacyId: pharmacy._id.toString(),
        pharmacyName: pharmacy.pharmacy_name || "Unknown Pharmacy",
        pharmacyAddress: pharmacy.address || "",
        pharmacyPhone: pharmacy.phone_number || "",
        location: pharmacy.location
          ? {
              latitude: pharmacy.location.coordinates[1],
              longitude: pharmacy.location.coordinates[0],
            }
          : null,
        items: matchingItems.map((item) => ({
          _id: item._id?.toString() || "",
          name: item.name,
          sku: item.sku || "",
          qty: item.qty || 0,
          unit_price: item.unit_price || 0,
          brand: item.brand || "",
          strength: item.strength || "",
          batch_no: item.batch_no || "",
          expiry_date: item.expiry_date || null,
        })),
      });
    }

    // Sort by number of matching items
    results.sort((a, b) => b.items.length - a.items.length);

    return res.status(200).json({
      message: `Found in ${results.length} pharmacies`,
      pharmacies: results,
    });
  } catch (err) {
    console.error("[searchMedicineInPharmacies]", err);
    return res.status(500).json({
      message: "Failed to search pharmacies",
      error: err.message,
    });
  }
}

/**
 * Get all pharmacies with their locations (for map view)
 * GET /patient/pharmacies
 */
export async function getAllPharmacies(req, res) {
  try {
    const pharmacies = await SuperUser.find({
      role: "pharmacy",
      isApproved: true,
    }).select("pharmacy_name address phone_number location");

    const results = pharmacies.map((p) => ({
      pharmacyId: p._id.toString(),
      pharmacyName: p.pharmacy_name || "Unknown Pharmacy",
      pharmacyAddress: p.address || "",
      pharmacyPhone: p.phone_number || "",
      location: p.location
        ? {
            latitude: p.location.coordinates[1],
            longitude: p.location.coordinates[0],
          }
        : null,
    }));

    return res.status(200).json({
      message: `Found ${results.length} pharmacies`,
      pharmacies: results,
    });
  } catch (err) {
    console.error("[getAllPharmacies]", err);
    return res.status(500).json({
      message: "Failed to fetch pharmacies",
      error: err.message,
    });
  }
}

/**
 * Get specific pharmacy inventory
 * GET /patient/pharmacies/:pharmacyId/inventory
 */
export async function getPharmacyInventory(req, res) {
  try {
    const { pharmacyId } = req.params;

    const pharmacy = await SuperUser.findOne({
      _id: pharmacyId,
      role: "pharmacy",
      isApproved: true,
    }).select("pharmacy_name address phone_number location");

    if (!pharmacy) {
      return res.status(404).json({ message: "Pharmacy not found" });
    }

    const inventory = await Inventory.findOne({ pharmacyId }).select("items");

    return res.status(200).json({
      pharmacyId: pharmacy._id.toString(),
      pharmacyName: pharmacy.pharmacy_name || "Unknown Pharmacy",
      pharmacyAddress: pharmacy.address || "",
      pharmacyPhone: pharmacy.phone_number || "",
      location: pharmacy.location
        ? {
            latitude: pharmacy.location.coordinates[1],
            longitude: pharmacy.location.coordinates[0],
          }
        : null,
      items: inventory?.items || [],
    });
  } catch (err) {
    console.error("[getPharmacyInventory]", err);
    return res.status(500).json({
      message: "Failed to fetch pharmacy inventory",
      error: err.message,
    });
  }
}