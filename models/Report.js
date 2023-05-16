// Report Schema
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    feature: {
      source: {
        type: String,
        enum: ["app", "post", "user"],
        required: true,
      },
      link: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;
