// @ts-nocheck
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide name!"],
      minlength: 3,
      trim: true,
    },
    username: { type: String, required: false, unique: false, default: null },
    email: {
      type: String,
      trim: true,
      require: [true, "Please provider email!"],
      unique: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provider a valid email!",
      },
    },
    password: {
      type: String,
      trim: true,
      require: [true, "Please provider password!"],
      minlength: 6,
      select: true,
    },
    secret: {
      type: String,
      required: [true, "Please provider secret!"],
    },
    about: {
      type: String,
    },
    image: {
      type: String,
    },
    following: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    follower: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    role: {
      type: String,
      default: "Subscriber",
    },
    city: { type: String },
    notify: [
      {
        type: {
          type: String,
          required: true,
        },
        affectedBy: {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
        content: { type: String },
        affectedPost: {
          type: mongoose.Types.ObjectId,
          ref: "Post",
          default: null,
        },
        created: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
