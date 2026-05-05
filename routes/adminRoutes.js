const express = require("express");
const {
  assignLeads,
  getTelecallerPerformance,
  getAllTelecallers,
  deleteTelecaller,
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/assign", protect, admin, assignLeads);
router.get("/performance", protect, admin, getTelecallerPerformance);
router.get("/telecallers", protect, admin, getAllTelecallers);
router.delete("/telecallers/:id", protect, admin, deleteTelecaller);

module.exports = router;
