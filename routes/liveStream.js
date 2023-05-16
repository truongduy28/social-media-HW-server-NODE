const router = require("express").Router();
const LiveStream = require("../models/LiveStream");

router.post("/create-live", async (req, res) => {
  try {
    const { content, streamedBy } = req.body;
    let roomId = Math.floor(1 + Math.random() * 9000);
    const liveStream = await LiveStream.create({
      content,
      roomId,
      streamedBy,
      status: "online",
    });
    const populatedLiveStream = await LiveStream.findById(
      liveStream._id
    ).populate("streamedBy", "name");
    res.status(201).json(populatedLiveStream);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.get("/streams", async (req, res) => {
  try {
    const liveStreams = await LiveStream
      .find
      // { status: "online" }
      ()
      .populate("streamedBy", "name image");
    res.status(200).json(liveStreams);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

router.put("/offline-live/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const liveStream = await LiveStream.findById(id);
    if (!liveStream) {
      return res.status(404).send("Live stream not found.");
    }
    liveStream.status = "offline";
    await liveStream.save();
    res.status(200).json(liveStream);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
