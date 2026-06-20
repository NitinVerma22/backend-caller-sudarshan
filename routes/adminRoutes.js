const express = require("express");
const {
  assignLeads,
  getTelecallerPerformance,
  getAllTelecallers,
  deleteTelecaller,
  changeTelecallerPassword,
  revokeTelecallerLeads,
  unassignLeads,
  getActivityLogs,
  getDashboardStats,
  getTelecallerProfile,
  createAnnouncement,
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/assign", protect, admin, assignLeads);
router.post("/unassign", protect, admin, unassignLeads);
router.post("/announcement", protect, admin, createAnnouncement);
router.get("/performance", protect, admin, getTelecallerPerformance);
router.get("/telecallers", protect, admin, getAllTelecallers);
router.get("/telecallers/:id/profile", protect, admin, getTelecallerProfile);
router.get("/logs", protect, admin, getActivityLogs);
router.get("/stats", protect, admin, getDashboardStats);
router.delete("/telecallers/:id", protect, admin, deleteTelecaller);
router.put("/telecallers/:id/change-password", protect, admin, changeTelecallerPassword);
router.put("/telecallers/:id/revoke-leads", protect, admin, revokeTelecallerLeads);

module.exports = router;
