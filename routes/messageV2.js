const asyncHandler = require("express-async-handler");
const MessageV2 = require("../models/MessageV2");
const Chat = require("../models/Chat");
const User = require("../models/User");
const router = require("express").Router();

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
router.get(
  "/:chatId",
  asyncHandler(async (req, res) => {
    try {
      const messages = await MessageV2.find({ chat: req.params.chatId })
        .populate("sender", "name pic email")
        .populate("chat");
      res.json(messages);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  })
);

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      console.log("Invalid data passed into request");
      return res.sendStatus(400);
    }

    var newMessage = {
      sender: req.user._id,
      content: content,
      chat: chatId,
    };

    try {
      var message = await MessageV2.create(newMessage);

      message = await MessageV2.populate("sender", "name pic").execPopulate();
      message = await MessageV2.populate("chat").execPopulate();
      message = await User.populate(message, {
        path: "chat.users",
        select: "name pic email",
      });

      await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

      res.json(message);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  })
);

module.exports = router;
