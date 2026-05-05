const FollowUp = require("../models/FollowUp");
const Lead = require("../models/Lead");

const addFollowUp = async (req, res) => {
  const { leadId, note, nextFollowUpDate } = req.body;
  const followUp = await FollowUp.create({ leadId, note, nextFollowUpDate });
  res.status(201).json(followUp);
};

const getFollowUps = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "telecaller") {
      const userLeads = await Lead.find({ assignedTo: req.user._id }).distinct("_id");
      query = { leadId: { $in: userLeads } };
    }
    const followUps = await FollowUp.find(query)
      .populate("leadId")
      .sort({ nextFollowUpDate: 1 });
    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTodayFollowUps = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let query = {
      nextFollowUpDate: { $gte: start, $lte: end },
      status: "pending",
    };

    if (req.user.role === "telecaller") {
      const userLeads = await Lead.find({ assignedTo: req.user._id }).distinct("_id");
      query.leadId = { $in: userLeads };
    }

    const followUps = await FollowUp.find(query).populate("leadId");
    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOverdueFollowUps = async (req, res) => {
  try {
    const now = new Date();
    let query = {
      nextFollowUpDate: { $lt: now },
      status: "pending",
    };

    if (req.user.role === "telecaller") {
      const userLeads = await Lead.find({ assignedTo: req.user._id }).distinct("_id");
      query.leadId = { $in: userLeads };
    }

    const followUps = await FollowUp.find(query).populate("leadId");
    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  const followUp = await FollowUp.findById(req.params.id);
  if (followUp) {
    followUp.status = "completed";
    await followUp.save();
    res.json({ message: "Notification marked as read" });
  } else {
    res.status(404).json({ message: "Notification not found" });
  }
};

const clearAllNotifications = async (req, res) => {
  let query = { status: "pending" };
  if (req.user.role === "telecaller") {
    const userLeads = await Lead.find({ assignedTo: req.user._id }).distinct("_id");
    query.leadId = { $in: userLeads };
  }
  
  await FollowUp.updateMany(query, { status: "completed" });
  res.json({ message: "All notifications cleared" });
};

module.exports = {
  addFollowUp,
  getFollowUps,
  getTodayFollowUps,
  getOverdueFollowUps,
  markAsRead,
  clearAllNotifications,
};
