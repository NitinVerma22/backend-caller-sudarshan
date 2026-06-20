const Lead = require("../models/Lead");
const FollowUp = require("../models/FollowUp");
const ActivityLog = require("../models/ActivityLog");
const Announcement = require("../models/Announcement");
const fs = require("fs");
const path = require("path");

const getLeads = async (req, res) => {
  const { status, type, page = 1, limit = 10, search, assigned, assignedTo, priority, source } = req.query;
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

  if (assignedTo) {
    query.assignedTo = assignedTo === "none" ? null : assignedTo;
  }

  if (priority) {
    query.priority = priority;
  }

  if (source) {
    query.source = { $regex: source, $options: "i" };
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
  const { name, phone, businessName, location, assignedTo, priority, source } = req.body;
  const lead = await Lead.create({
    name,
    phone,
    businessName,
    location,
    assignedTo,
    priority,
    source,
  });

  // Log Activity
  await ActivityLog.create({
    user: req.user._id,
    action: "create_lead",
    details: `Created lead '${name}' (Priority: ${priority || 'cold'}, Source: ${source || 'Manual'})`,
    lead: lead._id,
  });

  res.status(201).json(lead);
};

const updateLeadStatus = async (req, res) => {
  const { status, followUpNote, followUpDate, recordingAudio } = req.body;
  const lead = await Lead.findById(req.params.id);

  if (lead) {
    const oldStatus = lead.status;
    lead.status = status || lead.status;
    const updatedLead = await lead.save();

    // Handle audio recording saving if present
    let recordingUrl = null;
    if (recordingAudio) {
      try {
        const dir = path.join(__dirname, "..", "uploads", "recordings");
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const base64Data = recordingAudio.replace(/^data:audio\/\w+;base64,/, "");
        const audioBuffer = Buffer.from(base64Data, "base64");
        const filename = `rec_${Date.now()}_${lead._id}.webm`;
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, audioBuffer);
        recordingUrl = `/uploads/recordings/${filename}`;
      } catch (err) {
        console.error("Failed to save audio recording file", err);
      }
    }

    // Log Activity
    await ActivityLog.create({
      user: req.user._id,
      action: recordingUrl ? "call_log" : "update_status",
      details: followUpNote || `Updated status of lead '${lead.name}' from '${oldStatus}' to '${status}'`,
      lead: lead._id,
      recordingUrl: recordingUrl || undefined,
    });

    // Create a FollowUp entry if status is a follow-up type
    const followUpStatuses = ["interested", "callback", "follow_up"];
    if (followUpStatuses.includes(status)) {
      // Check if a pending follow-up already exists to avoid duplicates
      const existingFollowUp = await FollowUp.findOne({ 
        leadId: lead._id, 
        status: "pending" 
      });

      if (!existingFollowUp) {
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1); // Default to 1 hour from now

        await FollowUp.create({
          leadId: lead._id,
          note: followUpNote || `System: Lead marked as ${status}`,
          nextFollowUpDate: followUpDate || defaultDate,
          status: "pending"
        });
      }
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

  // Ensure default fields are present
  const leadsToInsert = leads.map(l => ({
    ...l,
    priority: l.priority || "cold",
    source: l.source || "Manual",
  }));

  const createdLeads = await Lead.insertMany(leadsToInsert);

  // Log Activity
  await ActivityLog.create({
    user: req.user._id,
    action: "bulk_import",
    details: `Imported ${createdLeads.length} leads via bulk import`,
  });

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

  // Log Activity
  let logDetails = `Deleted ${result.deletedCount} leads`;
  if (assignedTo || status) {
    logDetails += ` with filters: ${assignedTo ? `AssignedTo: ${assignedTo}` : ''} ${status ? `Status: ${status}` : ''}`;
  }
  await ActivityLog.create({
    user: req.user._id,
    action: "delete_leads",
    details: logDetails,
  });

  res.json({ message: `${result.deletedCount} leads deleted successfully` });
};

const getLeadHistory = async (req, res) => {
  const logs = await ActivityLog.find({ lead: req.params.id })
    .populate("user", "name role")
    .sort({ createdAt: -1 });

  res.json({ logs });
};

const getAnnouncement = async (req, res) => {
  const announcement = await Announcement.findOne({ active: true }).sort({ createdAt: -1 });
  res.json(announcement);
};

module.exports = { getLeads, createLead, updateLeadStatus, bulkCreateLeads, deleteLeads, getLeadHistory, getAnnouncement };
