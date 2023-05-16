const router = require("express").Router();
const mongoose = require("mongoose");

const Report = require("../models/Report");
const User = require("../models/User");
const Post = require("../models/Post");

// POST route to save a report
router.post("/", async (req, res) => {
  try {
    const { content, type, reportedBy, feature } = req.body; // Extract data from the request body

    // Create a new Report instance with the extracted data
    const report = new Report({
      content,
      type,
      reportedBy,
      feature,
    });

    // Save the report to the database
    await report.save();

    // Return a success response
    return res
      .status(201)
      .json({ message: "Report saved successfully", report });
  } catch (error) {
    // Handle any errors that may occur
    console.error(error);
    return res.status(500).json({ error: "Failed to save report" });
  }
});

// Route to get all reports
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find({}).populate(
      "reportedBy",
      "name id image"
    );

    // Loop through each report and call appropriate models based on feature.source value
    const updatedReports = await Promise.all(
      reports.map(async (report) => {
        if (report.feature.source === "user") {
          const user = await User.findById(report.feature.link).select(
            "name id image email"
          );
          report.feature.link = user; // Update feature.link with user model data
        } else if (report.feature.source === "post") {
          const post = await Post.findById(report.feature.link)
            .select("id content image")
            .populate("postedBy", "name id image email"); // Populate postedBy field with user information
          report.feature.link = post; // Update feature.link with post model data
        }
        return report;
      })
    );

    return res.json(updatedReports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Route to get reports based on feature.source: post
router.get("/posts", async (req, res) => {
  try {
    const reports = await Report.find({ "feature.source": "post" }).populate(
      "reportedBy",
      "name id image"
    );

    // Loop through each report and call appropriate models based on feature.source value
    const updatedReports = await Promise.all(
      reports.map(async (report) => {
        const post = await Post.findById(report.feature.link)
          .select("id content image")
          .populate("postedBy", "name id image email"); // Populate postedBy field with user information
        report.feature.link = post; // Update feature.link with post model data

        return report;
      })
    );

    return res.json(updatedReports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Route to get reports based on feature.source: user
router.get("/users", async (req, res) => {
  try {
    const reports = await Report.find({ "feature.source": "user" }).populate(
      "reportedBy",
      "name id image"
    );

    const updatedReports = await Promise.all(
      reports.map(async (report) => {
        const post = await User.findById(report.feature.link).select(
          "name id image email"
        );
        report.feature.link = post; // Update feature.link with post model data

        return report;
      })
    );
    res.json(updatedReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to get reports based on feature.source: app
router.get("/apps", async (req, res) => {
  try {
    const reports = await Report.find({ "feature.source": "app" }).populate(
      "reportedBy",
      "name id image"
    );
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
