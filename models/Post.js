const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    postedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      url: { type: String },
      isVideo: { type: Boolean, default: false },
    },
    likes: [{ type: mongoose.Types.ObjectId, ref: "User" }],
    isDelete: { type: Boolean, default: false },
    comments: [
      {
        text: String,
        image: {
          type: String,
        },
        created: {
          type: Date,
          default: Date.now,
        },
        isDelete: { type: Boolean, default: false },
        likes: [{ type: mongoose.Types.ObjectId, ref: "User" }],
        postedBy: {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  { timestamps: true }
);
module.exports = mongoose.model("Post", postSchema);
