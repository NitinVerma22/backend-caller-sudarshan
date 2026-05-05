const mongoose = require("mongoose");
const Lead = require("../models/Lead");

const getStats = async (req, res) => {
  const query = req.user.role === "telecaller" 
    ? { assignedTo: new mongoose.Types.ObjectId(req.user._id) } 
    : {};
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const stats = await Lead.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        fresh: { $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] } },
        connected: { $sum: { $cond: [{ $eq: ["$status", "connected"] }, 1, 0] } },
        not_connected: { $sum: { $cond: [{ $eq: ["$status", "not_connected"] }, 1, 0] } },
        interested: { $sum: { $cond: [{ $eq: ["$status", "interested"] }, 1, 0] } },
        not_interested: { $sum: { $cond: [{ $eq: ["$status", "not_interested"] }, 1, 0] } },
        converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
        follow_up: { $sum: { $cond: [{ $eq: ["$status", "follow_up"] }, 1, 0] } },
        callback: { $sum: { $cond: [{ $eq: ["$status", "callback"] }, 1, 0] } },
        busy: { $sum: { $cond: [{ $eq: ["$status", "busy"] }, 1, 0] } },
        callsToday: { 
          $sum: { 
            $cond: [
              { $and: [
                { $gte: ["$updatedAt", todayStart] },
                { $lte: ["$updatedAt", todayEnd] },
                { $ne: ["$status", "new"] }
              ]}, 
              1, 0 
            ] 
          } 
        },
        interestedToday: { 
          $sum: { 
            $cond: [
              { $and: [
                { $gte: ["$updatedAt", todayStart] },
                { $lte: ["$updatedAt", todayEnd] },
                { $eq: ["$status", "interested"] }
              ]}, 
              1, 0 
            ] 
          } 
        },
      },
    },
  ]);

  res.json(stats[0] || {
    total: 0,
    fresh: 0,
    connected: 0,
    not_connected: 0,
    interested: 0,
    not_interested: 0,
    converted: 0,
    follow_up: 0,
    callback: 0,
    busy: 0,
    callsToday: 0,
    interestedToday: 0,
  });
};

module.exports = { getStats };
