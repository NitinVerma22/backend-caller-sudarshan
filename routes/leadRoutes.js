const express = require("express");
const {
  getLeads,
  createLead,
  updateLeadStatus,
  bulkCreateLeads,
  deleteLeads,
} = require("../controllers/leadController");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();

router.route("/")
  .get(protect, getLeads)
  .post(protect, admin, createLead)
  .delete(protect, admin, deleteLeads);

router.route("/bulk").post(protect, admin, bulkCreateLeads);
router.route("/:id").put(protect, updateLeadStatus);

module.exports = router;
