const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/auth");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dfvymufao",
  api_key: "525622493837247",
  api_secret: "mVOEQ0zziHADCEnqGExtCqREDuc",
});

router.get("/post-sumary-stats", async (req, res) => {
  try {
    const deletedCount = await Post.countDocuments({ isDelete: true });
    const noMediaCount = await Post.countDocuments({ "image.url": null });
    const imageCount = await Post.countDocuments({
      "image.url": { $ne: null },
      "image.isVideo": false,
    });
    const videoCount = await Post.countDocuments({
      "image.url": { $ne: null },
      "image.isVideo": true,
    });
    const totalCount = await Post.countDocuments();

    const data = [
      { x: "Deleted", y: deletedCount },
      { x: "No Media", y: noMediaCount },
      { x: "Image", y: imageCount },
      { x: "Video", y: videoCount },
      { x: "Total", y: totalCount },
    ];

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// like-post v2
router.put("/like-post", async (req, res) => {
  try {
    const { postId, userId } = req.body;
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        $addToSet: { likes: userId },
      },
      {
        new: true,
      }
    );

    if (post?.postedBy?._id != userId) {
      const data = {
        type: "like",
        affectedBy: userId,
        content: "liked post of you!",
        affectedPost: postId,
      };
      const notifyToUser = await User.findByIdAndUpdate(
        post?.postedBy?._id,
        {
          $addToSet: { notify: data },
        },
        { new: true }
      );
      if (!notifyToUser) {
        return res.status(400).json({ msg: "No user found!" });
      }
    }
    return res.status(200).json({ msg: "something", post });
  } catch (error) {
    console.log(error);
    return res.status(400).json(error.msg);
  }
});

// like-comment v2
router.put("/like-comment", async (req, res) => {
  try {
    const { postId, userId, commentId } = req.body;

    // find post
    const post = await Post.findById(postId);

    // current comment
    const currentComment = post?.comments?.find((c) => c._id == commentId);
    // push user like
    const newLikeList = currentComment?.likes.push(userId);
    // list comment orther current comment
    const orther = post?.comments?.filter((c) => c._id != commentId);
    // list new
    const newData = [...orther, currentComment];

    const postUpdated = await Post.findByIdAndUpdate(
      postId,
      { comments: newData },
      { new: true }
    );

    if (currentComment?.postedBy?._id != userId) {
      const data = {
        type: "like",
        affectedBy: userId,
        content: " just liked your comment on the post!",
        affectedPost: postId,
      };
      const notifyToUser = await User.findByIdAndUpdate(
        currentComment?.postedBy?._id,
        {
          $addToSet: { notify: data },
        },
        { new: true }
      );
      if (!notifyToUser) {
        return res.status(400).json({ msg: "No user found!" });
      }
    }

    return res.status(200).json({ msg: "something", postUpdated, newLikeList });
  } catch (error) {
    console.log(error.msg);
    return res.json(error.msg);
  }
});

// unlike-comment v2
router.put("/unlike-comment", async (req, res) => {
  try {
    const { postId, userId, commentId } = req.body;

    //find post
    const post = await Post.findById(postId);

    // current comment
    const currentComment = post?.comments?.find((c) => c._id == commentId);

    // console.log(currentComment);
    // remove user unlike
    const reCurrentComment = await currentComment.likes.filter(
      (l) => l != userId
    );

    currentComment.likes = reCurrentComment;
    // list comment orther current comment
    const orther = post?.comments?.filter((c) => c._id != commentId);
    // list new
    const newData = [...orther, currentComment];
    // console.log(newData);
    const postUpdated = await Post.findByIdAndUpdate(
      postId,
      { comments: newData },
      { new: true }
    );

    return res.status(200).json({ msg: "something", postUpdated });
  } catch (error) {
    console.log(error.msg);
    return res.json(error.msg);
  }
});

// delete-comment v2
router.put("/delete-comment", async (req, res) => {
  try {
    const { postId, userId, commentId } = req.body;

    //find post
    const post = await Post.findById(postId);

    // current comment
    const currentComment = post?.comments?.find((c) => c._id == commentId);

    // console.log(currentComment);
    // remove user unlike

    currentComment.isDelete = true;

    // list comment orther current comment
    const orther = post?.comments?.filter((c) => c._id != commentId);
    // list new
    const newData = [...orther, currentComment];
    // console.log(newData);
    const postUpdated = await Post.findByIdAndUpdate(
      postId,
      { comments: newData },
      { new: true }
    );

    return res.status(200).json({ msg: "something", postUpdated });
  } catch (error) {
    console.log(error.msg);
    return res.json(error.msg);
  }
});

// unlike post v2
router.put("/unlike-post", async (req, res) => {
  try {
    const { postId, userId } = req.body;
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        $pull: { likes: userId },
      },
      {
        new: true,
      }
    );
    return res.status(200).json({ msg: "something", post });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: error });
  }
});

// get all posts v2
router.get("/all-posts", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 5;
    const posts = await Post.find({ isDelete: false })
      .populate("postedBy", "-password -secret")
      .populate("isShare")
      .populate("isShare.postedBy", "-password -secret")
      .limit(perPage)
      .skip((page - 1) * perPage)
      .sort({ createdAt: -1 })
      .populate("comments.postedBy", "-password -secret");
    if (!posts) {
      return res.status(400).json({ msg: "No posts found!" });
    }
    const postsCount = await Post.find({}).estimatedDocumentCount();
    return res.status(200).json({ posts, postsCount });
  } catch (error) {
    return res.status(500).json(err.msg);
    // console.log(error);
    // return res.status(400).json({ msg: error.msg });
  }
});

// get all posts for admin v2
router.get("/all-posts-for-admin", async (req, res) => {
  try {
    // const page = Number(req.query.page) || 1;
    // const perPage = Number(req.query.perPage) || 5;
    const posts = await Post.find()
      .populate("postedBy", "-password -secret")
      // .limit(perPage)
      // .skip((page - 1) * perPage)
      .sort({ createdAt: -1 })
      .populate("comments.postedBy", "-password -secret");
    if (!posts) {
      return res.status(400).json({ msg: "No posts found!" });
    }
    const postsCount = await Post.find({}).estimatedDocumentCount();
    return res.status(200).json({ posts, postsCount });
  } catch (err) {
    return res.status(500).json(err.msg);
    // console.log(error);
    // return res.status(400).json({ msg: error.msg });
  }
});

// get all posts of follower user v2
router.get("/post-of-follower-user/:id", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 5;

    const userId = req.params.id;
    // current user
    const user = await User.findById(userId);
    // array user following
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    let following = user.following;

    const posts = await Post.find({
      isDelete: false,
      postedBy: { $in: following },
    })
      .populate("postedBy", "-password -secret")
      .limit(perPage)
      .skip((page - 1) * perPage)
      .sort({ createdAt: -1 })
      .populate("comments.postedBy", "-password -secret");
    if (!posts) {
      return res.status(400).json({ msg: "No posts found!" });
    }
    const postsCount = await Post.find({}).estimatedDocumentCount();
    return res.status(200).json({ posts, postsCount });
  } catch (error) {
    return res.status(500).json(err.msg);
    // console.log(error);
    // return res.status(400).json({ msg: error.msg });
  }
});

// get all posts with user v2
router.get("/get-all-posts-with-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ postedBy: { _id: id } })
      .populate("postedBy", "-password -secret")
      .populate("comments.postedBy", "-password -secret")
      .populate("isShare")
      .sort({
        createdAt: -1,
      });
    return res.status(200).json({ posts });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: error });
  }
});

// add commment v2
router.put("/add-comment", async (req, res) => {
  try {
    const { postId, comment, image, postedBy } = req.body;
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        $push: {
          comments: {
            text: comment,
            image,
            postedBy,
          },
        },
      },
      {
        new: true,
      }
    )
      .populate("postedBy", "-password -secret")
      .populate("comments.postedBy", "-password -secret");

    if (post?.postedBy?._id != postedBy) {
      const data = {
        type: "comment",
        affectedBy: postedBy,
        content: "  commented to post of you!",
        affectedPost: postId,
      };
      const notifyToUser = await User.findByIdAndUpdate(
        post?.postedBy?._id,
        {
          $addToSet: { notify: data },
        },
        { new: true }
      );
      if (!notifyToUser) {
        return res.status(400).json({ msg: "No user found!" });
      }
    }
    return res.status(200).json({ msg: "something", post });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: error });
  }
});

//create post v2
router.post("/create-post", async (req, res) => {
  const { content, image, postedBy } = req.body;
  if (!content.length) {
    return res.status(400).json({ msg: "Content is required!" });
  }
  try {
    const post = await Post.create({
      content,
      postedBy,
      image,
    });

    const postWithUser = await Post.findById(post._id).populate(
      "postedBy",
      "-password -secret"
    );

    const listFollowingUser = await User.find({ following: { $in: postedBy } });

    if (listFollowingUser) {
      listFollowingUser.map(async (u) => {
        const data = {
          type: "post",
          affectedBy: postedBy,
          content: "just posted a new post!",
          affectedPost: post._id,
        };
        const notifyToFollowingUser = await User.findByIdAndUpdate(
          u?._id,
          {
            $addToSet: { notify: data },
          },
          { new: true }
        );
        if (!notifyToFollowingUser) {
          return res.status(400).json({ msg: "No user found!" });
        }
      });
    }

    return res.status(200).json({ post: postWithUser, listFollowingUser });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ msg: err });
  }
});

// archve post v3
router.post("/archive-post", async (req, res) => {
  try {
    const { userId, postId } = req.body; // Extract userId and postId from the request body
    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if postId already exists in archivedPosts array
    if (user.archivedPosts.includes(postId)) {
      return res.status(400).json({ message: "Post already archived" });
    }

    // Update the user's archivedPosts array with postId
    user.archivedPosts.push(postId);
    await user.save();

    return res
      .status(200)
      .json({ message: "Post archived successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// get archived post
router.get("/get-archived-post/:userId", async (req, res) => {
  try {
    const userId = req.params.userId; // Extract userId from the request parameters
    // Find the user by userId and populate the archivedPosts array with the postedBy field
    const user = await User.findById(userId).populate({
      path: "archivedPosts",
      populate: { path: "postedBy", select: "name image " },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const archivedPosts = user.archivedPosts; // Get the archivedPosts array from the user object

    return res.status(200).json({ archivedPosts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// delete archived post
router.delete("/delete-archived-post", async (req, res) => {
  try {
    const { userId, postId } = req.body; // Extract userId and postId from the request body
    console.log(req.body);
    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if postId exists in archivedPosts array
    if (!user.archivedPosts.includes(postId)) {
      return res
        .status(400)
        .json({ message: "Post not found in archived posts" });
    }

    // Remove postId from the archivedPosts array
    user.archivedPosts = user.archivedPosts.filter(
      (id) => id.toString() !== postId.toString()
    );
    await user.save();

    return res
      .status(200)
      .json({ message: "Post removed from archived posts successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//share post v2
router.post("/share-post", async (req, res) => {
  const { postId, userId } = req.body;

  try {
    try {
      const post = await Post.create({
        content: "shared a post",
        postedBy: userId,
        isShare: postId,
      });

      const postWithUser = await Post.findById(post._id)
        .populate("postedBy", "-password -secret")
        .populate("isShare.postedBy", "-password -secret")
        .populate("isShare");

      if (
        postWithUser.postedBy._id.toString() != userId ||
        postWithUser.isShare?.postedBy != userId
      ) {
        const data = {
          type: "share",
          affectedBy: userId,
          content: "just shared post of you!",
          affectedPost: postWithUser._id,
        };

        const notifyToUser = await User.findByIdAndUpdate(
          postWithUser?.isShare?.postedBy._id,
          {
            $addToSet: { notify: data },
          },
          { new: true }
        );

        console.log(notifyToUser);
        if (!notifyToUser) {
          return res.status(400).json({ msg: "No user found!" });
        }
      } else {
        console.log(postWithUser.postedBy._id.toString());
        console.log(userId);
      }

      return res.status(200).json({ post: postWithUser });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ msg: err });
    }

    return res.status(200).json({ post });
  } catch (error) {
    return res.status(400).json({ msg: error });
  }
});
//create a post
router.post("/", verifyToken, async (req, res) => {
  const newPost = new Post({
    userId: req.userId,
    desc: req.body.desc,
    img: req.body.img,
    category: req.body.category,
  });
  // newPost.populate('userId')
  try {
    const savedPost = await newPost.save();
    res.status(200).json(savedPost);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// edit post v2
router.patch("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { content, image } = req.body;
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        content,
        image,
      },
      {
        new: true,
      }
    )
      .populate("postedBy", "-password -secret")
      .populate("comments.postedBy", "-password -secret");
    // const savedPost = await post.save();

    if (!post) {
      return res.status(400).json({ msg: "No post found!" });
    }
    return res.status(200).json({ msg: "Updated posts success", post });
  } catch (error) {
    return res.status(400).json({ msg: error });
  }
});

// delete post v2
router.put("/delete/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { postedBy } = req.body;
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        isDelete: true,
      },
      { new: true }
    );
    if (!post) {
      return res.status(400).json({ msg: "No post found!" });
    }

    const posts = await Post.find()
      .populate("postedBy", "-password -secret")
      // .limit(perPage)
      // .skip((page - 1) * perPage)
      .sort({ createdAt: -1 })
      .populate("comments.postedBy", "-password -secret");

    // notify
    if (postedBy) {
      if (post?.postedBy?._id != postedBy) {
        const data = {
          type: "hidden",
          affectedBy: postedBy,
          content:
            "  has been to deleted your post because any reason relative policy and terms! ",
          affectedPost: postId,
        };
        const notifyToUser = await User.findByIdAndUpdate(
          post?.postedBy?._id,
          {
            $addToSet: { notify: data },
          },
          { new: true }
        );
        if (!notifyToUser) {
          return res.status(400).json({ msg: "No user found!" });
        }
      }
    }

    return res
      .status(200)
      .json({ msg: "Delete successfully", post, allPost: posts });
  } catch (error) {
    return res.status(400).json({ msg: error });
  }
});

//update a post
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.userId == req.userId) {
      await post.updateOne({ $set: req.body });
      return res.status(200).json(post);
    } else {
      return res.status(403).json("you can update only your post");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// delete-comment v2
router.patch("/edit-comment/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const { _id, text, image } = req.body;
    const commentId = _id;
    //find post
    const post = await Post.findById(postId);

    // // current comment
    const currentComment = post?.comments?.find((c) => c._id == commentId);

    // // console.log(currentComment);
    // // remove user unlike

    currentComment.text = text;
    if (image) currentComment.image = image;
    else currentComment.image = "";

    // // list comment orther current comment
    const orther = post?.comments?.filter((c) => c._id != commentId);
    // // list new
    const newData = [...orther, currentComment];
    // // console.log(newData);
    const postUpdated = await Post.findByIdAndUpdate(
      postId,
      { comments: newData },
      { new: true }
    );

    return res.status(200).json({ msg: "something", postUpdated });
  } catch (error) {
    console.log(error.msg);
    return res.json(error.msg);
  }
});

// get post
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId)
      .populate("postedBy", "-password -secret")
      .populate("comments.postedBy", "-password -secret")
      .populate("isShare")
      .populate("isShare.postedBy", "-password -secret");
    if (!post) {
      return res.status(400).json({ msg: "No post found!" });
    }
    return res.status(200).json({ post });
  } catch (error) {
    return res.status(400).json({ msg: error });
  }
});

//delete a post
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.userId == req.userId) {
      await post.deleteOne();
      return res.status(200).json("the post has been deleted");
    } else {
      return res.status(403).json("you can delete only your post");
    }
  } catch (err) {
    return res.status(500).json(err.message);
  }
});

//like / dislike a post
router.put("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.likes.includes(req.userId)) {
      await post.updateOne({ $push: { likes: req.userId } });
      return res.status(200).json(post);
    } else {
      await post.updateOne({ $pull: { likes: req.userId } });
      return res.status(200).json("The post has been disliked");
    }
  } catch (err) {
    return res.status(500).json(err);
  }
});

//get a post
// router.get("/:id", async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id).populate("userId", [
//       "username",
//       "profilePicture",
//       "isAdmin",
//     ]);
//     return res.status(200).json(post);
//   } catch (err) {
//     return res.status(500).json(err.message);
//   }
// });

//get timeline posts
router.get("/timeline/all", async (req, res) => {
  try {
    const currentUser = await User.findById(req.body.userId);
    const userPosts = await Post.find({ userId: currentUser._id });
    const friendPosts = await Promise.all(
      currentUser.followings.map((friendId) => {
        return Post.find({ userId: friendId });
      })
    );
    res.json(userPosts.concat(...friendPosts));
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// get all posts
router.get("/", async (req, res) => {
  const { q, gte, lt } = req.query;

  // Fetch Document By Specific Date (findDate is Parameter)
  const search = (data) => {
    return data.filter((item) => item.desc.toLowerCase().includes(q));
  };

  try {
    if (gte && lt) {
      const startDate = new Date(
        new Date(gte).setUTCHours(0, 0, 0, 0)
      ).toISOString();
      const endDate = new Date(
        new Date(lt).setUTCHours(23, 59, 59, 999)
      ).toISOString();
      const posts = await Post.find({
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      })
        .sort({ createdAt: -1 })
        .populate("userId", ["username", "profilePicture", "isAdmin"]);
      if (q) return res.json(search(posts));
      else return res.json(posts);
    } else {
      const posts = await Post.find()
        .sort({ createdAt: -1 })
        .populate("userId", ["username", "profilePicture", "isAdmin"]);
      if (q) return res.json(search(posts));
      else return res.json(posts);
    }
  } catch (err) {
    return res.status(500).json(err.message);
  }
});

// get post of user
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("userId", ["username", "profilePicture", "isAdmin"]);
    return res.status(200).json(posts);
  } catch (err) {
    return res.status(500).json(err.message);
  }
});

// album image v3
router.get("/album/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find posts by the given userId
    const posts = await Post.find({ postedBy: userId });

    // Extract images with url, isVideo, postId, likeCount, commentCount, and createdAt fields from the posts where isDelete is false
    const images = posts
      .filter((post) => post.image && post.image.url && !post.isDelete) // Filter out posts without images and where isDelete is true
      .map((post) => ({
        url: post.image.url,
        isVideo: post.image.isVideo,
        postId: post._id,
        likeCount: post.likes.length,
        commentCount: post.comments.length,
        createdAt: post.createdAt,
      })); // Extract the url, isVideo, postId, likeCount, commentCount, and createdAt fields

    return res.status(200).json(images);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch images" });
  }
});

module.exports = router;
