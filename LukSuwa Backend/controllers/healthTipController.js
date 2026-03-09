import HealthTip from "../models/healthTip.js";

function requireAdmin(req, res) {
  if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
    res.status(403).json({ message: "Access denied. Admin only." });
    return false;
  }
  return true;
}


export async function getPublicHealthTips(req, res) {
  try {
    const tips = await HealthTip.find({ isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ count: tips.length, tips });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch tips", error: err.message });
  }
}


export async function getAllHealthTips(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const tips = await HealthTip.find().sort({ createdAt: -1 });
    return res.status(200).json({ count: tips.length, tips });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch tips", error: err.message });
  }
}


export async function createHealthTip(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const { title, body, category } = req.body;

    if (!title || !String(title).trim() || !body || !String(body).trim()) {
      return res.status(400).json({ message: "title and body are required" });
    }

    const tip = await HealthTip.create({
      title: String(title).trim(),
      body: String(body).trim(),
      category: String(category || "general").trim(),
      isActive: true,
      createdBy: req.user?.id || req.user?._id,
    });

    return res.status(201).json({ message: "Tip created", tip });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create tip", error: err.message });
  }
}


export async function updateHealthTip(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { title, body, category } = req.body;

    const tip = await HealthTip.findById(id);
    if (!tip) return res.status(404).json({ message: "Tip not found" });

    if (typeof title === "string") tip.title = title.trim();
    if (typeof body === "string") tip.body = body.trim();
    if (typeof category === "string") tip.category = category.trim();

    await tip.save();

    return res.status(200).json({ message: "Tip updated", tip });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update tip", error: err.message });
  }
}


export async function toggleHealthTip(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;

    const tip = await HealthTip.findById(id);
    if (!tip) return res.status(404).json({ message: "Tip not found" });

    tip.isActive = !tip.isActive;
    await tip.save();

    return res.status(200).json({
      message: tip.isActive ? "Tip activated" : "Tip deactivated",
      tip,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to toggle tip", error: err.message });
  }
}

/**
 * DELETE /health-tips/:id
 * Admin: Delete
 */
export async function deleteHealthTip(req, res) {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;

    const tip = await HealthTip.findById(id);
    if (!tip) return res.status(404).json({ message: "Tip not found" });

    await HealthTip.deleteOne({ _id: id });

    return res.status(200).json({ message: "Tip deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete tip", error: err.message });
  }
}
