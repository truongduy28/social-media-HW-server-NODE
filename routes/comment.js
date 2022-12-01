const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const jwt = require('jsonwebtoken')
const verifyToken = require('../middleware/auth')


//create a comment
router.post("/:postId/comment", verifyToken, async(req, res) => {
    const newComment = new Comment({
            userId: req.userId,
            desc: req.body.desc,
            img: req.body.img,
            postId: req.params.postId
        })
        // newPost.populate('userId')
    try {
        const saveComment = await newComment.save();
        return res.status(200).json(saveComment);
    } catch (err) {
        return res.status(500).json(err.message);
    }
});


//update a comment
router.put("/:postId/comment/:id", verifyToken, async(req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        // if (comment.userId == req.userId) {
        await comment.updateOne({ $set: req.body });
        return res.status(200).json(comment);
        // } else {
        //     return res.status(403).json("you can update only your comment");
        // }
    } catch (err) {
        res.status(500).json(err.message);
    }
});

//delete a comment
router.delete("/:postId/comment/:id", verifyToken, async(req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        await comment.deleteOne();
        return res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (err) {
        return res.status(500).json(err.message);
    }
});


//get a comment
router.get("/:postId/comment/:id", async(req, res) => {
    try {
        const comment = await Comment.findById(req.params.id).populate('userId', ['username', 'profilePicture', 'isAdmin'])
        return res.status(200).json(comment);
    } catch (err) {
        return res.status(500).json(err.message);
    }
});

//get all comments of post
router.get("/:postId/comments", async(req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.postId }).populate('userId', ['username', 'profilePicture', 'isAdmin']);

        return res.status(200).json({ comments });
    } catch (err) {
        return res.status(500).json(err.message);
    }
});

module.exports = router;