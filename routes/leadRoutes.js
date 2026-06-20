const express = require("express");
const {
  getLeads,
  createLead,
  updateLeadStatus,
  bulkCreateLeads,
  deleteLeads,
  getLeadHistory,
  getAnnouncement,
} = require("../controllers/leadController");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.route("/")
  .get(protect, getLeads)
  .post(protect, admin, createLead)
  .delete(protect, admin, deleteLeads);

router.route("/bulk").post(protect, admin, bulkCreateLeads);
router.route("/announcement").get(protect, getAnnouncement);
router.route("/:id/history").get(protect, admin, getLeadHistory);
router.route("/:id").put(protect, updateLeadStatus);

module.exports = router;
