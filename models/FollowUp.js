const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    note: { type: String, required: true },
    nextFollowUpDate: { type: Date, required: true },
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

const FollowUp = mongoose.model("FollowUp", followUpSchema);
module.exports = FollowUp;
