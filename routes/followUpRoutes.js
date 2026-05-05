const express = require("express");
const {
  addFollowUp,
  getFollowUps,
  getTodayFollowUps,
  getOverdueFollowUps,
  markAsRead,
  clearAllNotifications,
} = require("../controllers/followUpController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.route("/").post(protect, addFollowUp).get(protect, getFollowUps);
router.get("/today", protect, getTodayFollowUps);
router.get("/overdue", protect, getOverdueFollowUps);
router.put("/mark-read/:id", protect, markAsRead);
router.post("/clear-all", protect, clearAllNotifications);

module.exports = router;
