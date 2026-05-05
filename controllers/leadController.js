const Lead = require("../models/Lead");
const FollowUp = require("../models/FollowUp");

const getLeads = async (req, res) => {
  const { status, type, page = 1, limit = 10, search, assigned } = req.query;
  const query = {};

  if (status) {
    const statusArray = status.split(",").map(s => s === "fresh" ? "new" : s);
    query.status = { $in: statusArray };
  }
  
  if (assigned === "false") {
    query.assignedTo = null;
  } else if (assigned === "true") {
    query.assignedTo = { $ne: null };
  }

  if (req.user.role === "telecaller") {
    query.assignedTo = req.user._id;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const count = await Lead.countDocuments(query);
  const leads = await Lead.find(query)
    .populate("assignedTo", "name email")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  res.json({
    leads,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
  });
};

const createLead = async (req, res) => {
  const { name, phone, businessName, location, assignedTo } = req.body;
  const lead = await Lead.create({
    name,
    phone,
    businessName,
    location,
    assignedTo,
  });
  res.status(201).json(lead);
};

const updateLeadStatus = async (req, res) => {
  const { status, followUpNote, followUpDate } = req.body;
  const lead = await Lead.findById(req.params.id);

  if (lead) {
    lead.status = status || lead.status;
    const updatedLead = await lead.save();

    // Create a FollowUp entry if status is a follow-up type or if details are provided
    const followUpStatuses = ["interested", "callback", "follow_up"];
    if (followUpStatuses.includes(status) || followUpNote || followUpDate) {
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 1);

      await FollowUp.create({
        leadId: lead._id,
        note: followUpNote || `Marked as ${status}`,
        nextFollowUpDate: followUpDate || defaultDate,
      });
    }

    res.json(updatedLead);
  } else {
    res.status(404);
    throw new Error("Lead not found");
  }
};

const bulkCreateLeads = async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) {
    res.status(400);
    throw new Error("Invalid leads data");
  }

  const createdLeads = await Lead.insertMany(leads);
  res.status(201).json(createdLeads);
};

const deleteLeads = async (req, res) => {
  const { assignedTo, status } = req.query;
  const query = {};

  if (assignedTo) {
    query.assignedTo = assignedTo === "none" ? null : assignedTo;
  }
  if (status) {
    query.status = status;
  }

  const result = await Lead.deleteMany(query);
  res.json({ message: `${result.deletedCount} leads deleted successfully` });
};

module.exports = { getLeads, createLead, updateLeadStatus, bulkCreateLeads, deleteLeads };
