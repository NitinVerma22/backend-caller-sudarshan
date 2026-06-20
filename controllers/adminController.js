const User = require("../models/User");
const Lead = require("../models/Lead");
const ActivityLog = require("../models/ActivityLog");
const FollowUp = require("../models/FollowUp");
const Announcement = require("../models/Announcement");

const assignLeads = async (req, res) => {
  const { leadIds, telecallerId } = req.body;
  
  const telecaller = await User.findById(telecallerId);
  if (!telecaller) {
    res.status(404);
    throw new Error("Telecaller not found");
  }

  await Lead.updateMany(
    { _id: { $in: leadIds } },
    { $set: { assignedTo: telecallerId } }
  );

  // Log Activity
  await ActivityLog.create({
    user: req.user._id,
    action: "assign_leads",
    details: `Assigned ${leadIds.length} leads to telecaller '${telecaller.name}'`,
  });

  res.json({ message: "Leads assigned successfully" });
};

const getTelecallerPerformance = async (req, res) => {
  const performance = await User.aggregate([
    { $match: { role: "telecaller" } },
    {
      $lookup: {
        from: "leads",
        localField: "_id",
        foreignField: "assignedTo",
        as: "leads",
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        totalLeads: { $size: "$leads" },
        conversions: {
          $size: {
            $filter: {
              input: "$leads",
              as: "lead",
              cond: { $eq: ["$$lead.status", "converted"] },
            },
          },
        },
      },
    },
  ]);
  res.json(performance);
};

const getAllTelecallers = async (req, res) => {
  const telecallers = await User.find({ role: "telecaller" }).select("-password");
  res.json(telecallers);
};

const deleteTelecaller = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user && user.role === "telecaller") {
    const callerName = user.name;
    await user.deleteOne();

    // Unassign leads from deleted telecaller
    await Lead.updateMany({ assignedTo: req.params.id }, { $set: { assignedTo: null } });

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: "delete_telecaller",
      details: `Deleted telecaller account '${callerName}' and unassigned their leads`,
    });

    res.json({ message: "Telecaller removed successfully" });
  } else {
    res.status(404);
    throw new Error("Telecaller not found");
  }
};

const changeTelecallerPassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.trim().length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters long");
  }

  const user = await User.findById(req.params.id);
  if (user && user.role === "telecaller") {
    user.password = password;
    await user.save();

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: "change_password",
      details: `Changed password for telecaller '${user.name}'`,
    });

    res.json({ message: "Password updated successfully" });
  } else {
    res.status(404);
    throw new Error("Telecaller not found");
  }
};

const revokeTelecallerLeads = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user && user.role === "telecaller") {
    const result = await Lead.updateMany(
      { assignedTo: req.params.id },
      { $set: { assignedTo: null } }
    );

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: "revoke_leads",
      details: `Revoked access of ${result.modifiedCount} leads from telecaller '${user.name}'`,
    });

    res.json({ message: `Revoked access to ${result.modifiedCount} leads` });
  } else {
    res.status(404);
    throw new Error("Telecaller not found");
  }
};

const unassignLeads = async (req, res) => {
  const { leadIds } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    res.status(400);
    throw new Error("Invalid lead IDs");
  }

  await Lead.updateMany(
    { _id: { $in: leadIds } },
    { $set: { assignedTo: null } }
  );

  // Log Activity
  await ActivityLog.create({
    user: req.user._id,
    action: "unassign_leads",
    details: `Unassigned (removed access of) ${leadIds.length} selected leads`,
  });

  res.json({ message: "Leads unassigned successfully" });
};

const getActivityLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;

  const count = await ActivityLog.countDocuments();
  const logs = await ActivityLog.find()
    .populate("user", "name email")
    .populate("lead", "name phone")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  res.json({
    logs,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  });
};

const getDashboardStats = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const assignedLeads = await Lead.countDocuments({ assignedTo: { $ne: null } });
    const unassignedLeads = totalLeads - assignedLeads;

    // Status Distribution
    const statusStats = await Lead.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const statusDistribution = statusStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Priority Distribution
    const priorityStats = await Lead.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);
    const priorityDistribution = priorityStats.reduce((acc, curr) => {
      acc[curr._id || "cold"] = curr.count;
      return acc;
    }, {});

    // Source Distribution
    const sourceStats = await Lead.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } }
    ]);
    const sourceDistribution = sourceStats.reduce((acc, curr) => {
      acc[curr._id || "Manual"] = curr.count;
      return acc;
    }, {});

    res.json({
      totalLeads,
      assignedLeads,
      unassignedLeads,
      statusDistribution,
      priorityDistribution,
      sourceDistribution,
    });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
};

const getTelecallerProfile = async (req, res) => {
  const telecaller = await User.findById(req.params.id).select("-password");
  if (!telecaller || telecaller.role !== "telecaller") {
    res.status(404);
    throw new Error("Telecaller not found");
  }

  // Active Leads
  const leads = await Lead.find({ assignedTo: req.params.id })
    .select("name phone status priority businessName")
    .sort({ updatedAt: -1 });

  // Upcoming Follow-ups
  const leadIds = leads.map(l => l._id);
  const followUps = await FollowUp.find({ leadId: { $in: leadIds }, status: "pending" })
    .populate("leadId", "name phone")
    .sort({ nextFollowUpDate: 1 })
    .limit(10);

  // Recent activities
  const activities = await ActivityLog.find({ user: req.params.id })
    .populate("lead", "name")
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    telecaller,
    leads,
    followUps,
    activities,
  });
};

const createAnnouncement = async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error("Announcement message is required");
  }

  // Deactivate previous active announcements
  await Announcement.updateMany({ active: true }, { active: false });

  const announcement = await Announcement.create({
    message,
    user: req.user._id,
    active: true
  });

  // Log Activity
  await ActivityLog.create({
    user: req.user._id,
    action: "create_announcement",
    details: `Published announcement: "${message}"`,
  });

  res.status(201).json(announcement);
};

module.exports = {
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
};
