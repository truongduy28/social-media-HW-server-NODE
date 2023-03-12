const router = require("express").Router();
const Message = require("../models/Message");

// get all messages v2
router.get("/get-all-messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(userId);
    const messages = await Message.find({ members: { $in: userId } })
      .populate(
        "members",
        "-password -secret -following -follower -role -updatedAt -email -createdAt -about -username"
      )
      .populate(
        "content.sentBy",
        "-password -secret -following -follower -role -updatedAt -email -createdAt -about -username"
      )
      .sort({ updatedAt: -1 });
    return res.status(200).json({ messages });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: `Something went wrong!Try again!` });
  }
});

// send message v2
router.put("/send-message", async (req, res) => {
  try {
    const { receivedId, text, image, sentBy } = req.body;
    let data = { sentBy };

    const limit = req.body.limit || 10;
    if (!receivedId.length || receivedId.includes(null)) {
      return res.status(400).json({ msg: `Something went wrong!Try again!` });
    }
    if (image) {
      data.image = image;
    }
    if (text) {
      data.text = text;
    }
    if (!image && !text) {
      return res.status(400).json({ msg: "Text or image is required!" });
    }
    // data.seen
    let message = await Message.findOneAndUpdate(
      {
        members: [...receivedId, sentBy].sort(),
      },
      {
        $addToSet: { content: data },
      },
      { new: true }
    )
      .populate(
        "content.sentBy",
        "-password -secret -following -follower -role -updatedAt -email -createdAt -about -username"
      )
      .populate(
        "members",
        "-password -secret -following -follower -role -updatedAt -email -createdAt -about -username"
      );

    if (!message) {
      message = await Message.create({
        members: [sentBy, ...receivedId].sort(),
        content: data,
      });
      message = await Message.findById(message._id)
        .populate(
          "members",
          "-password -secret -following -follower -role -updatedAt -email -createdAt -about -username"
        )
        .populate(
          "content.sentBy",
          "-password -secret -following -follower -role -updatedAt -email -createdAt -about -username"
        );
    }

    return res.status(200).json({ message: message });
  } catch (error) {
    console.log(error);
    return res.status(400).json(error.msg);
  }
});

//add

router.post("/", async (req, res) => {
  const newMessage = new Message(req.body);

  try {
    const savedMessage = await newMessage.save();
    return res.status(200).json(savedMessage);
  } catch (err) {
    return res.status(500).json(err);
  }
});

//get

router.get("/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId,
    });
    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json(err);
  }
});

module.exports = router;
