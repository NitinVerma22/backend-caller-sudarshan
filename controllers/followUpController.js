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

    // --- Self-Healing Mechanism ---
    // If we're fetching follow-ups, let's make sure we haven't missed any "Interested" leads
    const followUpStatuses = ["interested", "callback", "follow_up"];
    const leadQuery = req.user.role === "telecaller" 
      ? { assignedTo: req.user._id, status: { $in: followUpStatuses } }
      : { status: { $in: followUpStatuses } };

    const activeLeads = await Lead.find(leadQuery);
    
    for (const lead of activeLeads) {
      const hasFollowUp = await FollowUp.findOne({ leadId: lead._id, status: "pending" });
      if (!hasFollowUp) {
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1);
        await FollowUp.create({
          leadId: lead._id,
          note: `Auto-generated follow-up for ${lead.status} lead`,
          nextFollowUpDate: defaultDate,
          status: "pending"
        });
      }
    }
    // ------------------------------

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
