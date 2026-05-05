const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    businessName: { type: String },
    location: { type: String },
    status: {
      type: String,
      enum: [
        "new",
        "connected",
        "not_connected",
        "busy",
        "callback",
        "follow_up",
        "interested",
        "not_interested",
        "converted",
      ],
      default: "new",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Lead = mongoose.model("Lead", leadSchema);
module.exports = Lead;
