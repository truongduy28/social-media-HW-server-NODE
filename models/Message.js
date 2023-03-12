const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    members: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    content: [
      {
        text: String,
        image: {
          url: String,
        },
        created: {
          type: Date,
          default: Date.now,
        },
        like: {
          type: Boolean,
          default: false,
        },
        sentBy: {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
        reply: {
          type: mongoose.Types.ObjectId,
          ref: "Message",
        },
        seen: [
          {
            type: mongoose.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
