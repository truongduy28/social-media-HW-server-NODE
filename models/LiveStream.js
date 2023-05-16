// Report Schema
const mongoose = require("mongoose");

const liveStream = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
    streamedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model("LiveStream", liveStream);

module.exports = Report;
