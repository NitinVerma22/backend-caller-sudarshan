const User = require("../models/User");
const Lead = require("../models/Lead");

const assignLeads = async (req, res) => {
  const { leadIds, telecallerId } = req.body;
  await Lead.updateMany(
    { _id: { $in: leadIds } },
    { $set: { assignedTo: telecallerId } }
  );
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
    await user.deleteOne();
    res.json({ message: "Telecaller removed successfully" });
  } else {
    res.status(404);
    throw new Error("Telecaller not found");
  }
};

module.exports = { assignLeads, getTelecallerPerformance, getAllTelecallers, deleteTelecaller };
