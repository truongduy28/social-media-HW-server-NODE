const User = require("../models/User.js");
const Post = require("../models/Post.js");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const newFormat = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
const validator = require("validator");
const randomCatAvatar = require("./../middleware/randomCatAvatar");

const router = require("express").Router();

router.get("/users-chart", async (req, res) => {
  try {
    // Get the start and end dates from the query parameters, or use default values
    const { start = threeMonthsAgo(), end = new Date() } = req.query;

    // Convert the start and end dates to Date objects
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Find all users created within the specified time range and group them by their createdAt date
    const users = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Transform the data into the format needed for the chart
    const data = users.map((user) => ({
      date: `${user._id.day}/${user._id.month}/${user._id.year}`,
      quantity: user.count,
    }));

    // Return the data as a JSON response
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

function threeMonthsAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date;
}

router.get("/search/:keyword", async (req, res) => {
  const { keyword } = req.params;

  try {
    const users = await User.find(
      {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
        ],
      },
      "name email image createdAt"
      // "name createdAt"
    );

    const posts = await Post.find(
      {
        content: { $regex: keyword, $options: "i" },
        isDelete: false,
      },
      "content postedBy image createdAt"
      // "  createdAt"
    ).populate("postedBy", "name email image");

    const results = [
      ...users.map((user) => ({ type: "user", user })),
      ...posts.map((post) => ({ type: "post", post })),
    ];

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// register user v2
router.post("/register", async (req, res) => {
  const { name, email, password, rePassword, secret } = req.body;

  if (!name || !email || !password || !secret || !rePassword) {
    return res.status(400).json({ msg: "Please provider all values!" });
  }
  if (name.length < 3 || name.length > 20) {
    return res.status(400).json({
      msg: "Name must be longer than 3 characters and shorter 20 characters",
    });
  }

  if (newFormat.test(name)) {
    return res
      .status(400)
      .json({ msg: "Name cannot have special characters!" });
  }
  if (password !== rePassword) {
    return res.status(400).json({ msg: "Passwords are not the same!" });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ msg: "Password must be longer than 6 characters!" });
  }
  const isEmail = validator.isEmail(email);
  if (!isEmail) {
    return res.status(400).json({ msg: "Please provider a valid email!" });
  }
  const exist = await User.findOne({ email });
  if (exist) {
    //throw new BadRequest('Email is taken!');
    return res.status(400).json({ msg: "Email is taken!" });
  }
  const image = randomCatAvatar();
  const user = await User({
    name,
    email,
    password,
    secret,
    image,
  });
  try {
    await user.save();
    return res.status(200).json({
      msg: "Register success. Let's login",
    });
  } catch (err) {
    return res.status(500).json(err.message);
  }
});

// login v2
router.post("/login", async (req, res) => {
  const { email, password, rememberPassword } = req.body;
  if (!email || !password) {
    return res.status(400).json({ msg: "Please provider all values!" });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ msg: "Password must be longer than 6 characters!" });
  }
  const isEmail = validator.isEmail(email);
  if (!isEmail) {
    return res.status(400).json({ msg: "Please provider a valid email!" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Email or password is not defined!" });
    }

    // const validPassword = await bcrypt.compare(password, user.password);
    // if (!validPassword)
    //     return res.status(400).json({ msg: "Email or password is not defined!" });

    if (password != user.password)
      return res.status(400).json({ msg: "Email or password is not defined!" });
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET
    );
    user.password = "";
    return res.status(200).json({
      success: true,
      message: "login successfully",
      accessToken,
      user,
    });
  } catch (err) {
    return res.status(500).json(err.message);
  }
});

// forget password v2
router.put("/forget-password", async (req, res) => {
  try {
    const { email, newPassword, rePassword, secret } = req.body;
    if (!email || !newPassword || !rePassword || !secret) {
      return res.status(400).json({ msg: "Please provider all values!" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be longer than 6 characters!" });
    }
    if (newPassword !== rePassword) {
      return res.status(400).json({ msg: "Passwords are not the same!" });
    }
    const isEmail = validator.isEmail(email);
    if (!isEmail) {
      return res.status(400).json({ msg: "Please provider a valid email!" });
    }
    const user = await User.findOne({ email, secret });
    if (!user) {
      return res.status(400).json({ msg: "Email or secret is not defined!" });
    }

    user.password = newPassword;
    user.save();
    return res.status(200).json({ msg: "Password be changed successfully!" });
  } catch (error) {
    console.log(error);
    return res.json({ error: error.message });
  }
});

//update user v2
router.put("/update-user", async (req, res) => {
  const {
    id,
    name,
    about,
    image,
    newPassword,
    confirmNewPassword,
    currentPassword,
    city,
  } = req.body;
  // const userId = req.user;

  console.log(req.body);
  let data = { name };
  try {
    if (!name) {
      return res.status(400).json({ msg: "Please provider name!" });
    }
    if (newFormat.test(name)) {
      return res
        .status(400)
        .json({ msg: "Name cannot have special characters" });
    }
    // if (!username) {
    //     return res.status(400).json({ msg: "Please provider username!" });
    // }
    if (about) {
      data.about = about;
    }
    if (image) {
      data.image = image;
    }
    if (city) {
      data.city = city;
    }

    if (!currentPassword) {
      return res
        .status(400)
        .json({ msg: "Password is required to authen user" });
    }
    if (currentPassword) {
      if (newPassword || confirmNewPassword) {
        if (newPassword !== confirmNewPassword) {
          return res
            .status(400)
            .json({ msg: "New passwords are not the same!" });
        }
        if (newPassword.length < 8) {
          return res
            .status(400)
            .json({ msg: "Password must be longer than 8 characters!" });
        }
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(400).json({ msg: "No user found" });
      }

      if (user.password != currentPassword) {
        return res
          .status(400)
          .json({ msg: "Current password is wrong! Try again!" });
      }
    }
    let user = await User.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    if (newPassword) {
      user.password = newPassword;
      await user.save();
    }
    user.password = undefined;
    user.secret = undefined;
    // const token = jwt.sign({ _id: user._id }, process.env.JWT, {
    //     expiresIn: process.env.JWT_LIFETIME || "1d",
    // });
    return res.status(200).json({ msg: "Update user success.", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.msg);
  }
});

// follow user v2
router.put("/follow", async (req, res) => {
  const { followed, follower } = req.body;
  try {
    const userFollowed = await User.findByIdAndUpdate(
      followed,
      {
        $addToSet: { follower: follower },
      },
      { new: true }
    );
    if (!userFollowed) {
      return res.status(400).json({ msg: "No user found!" });
    }

    const userFollower = await User.findByIdAndUpdate(
      follower,
      {
        $addToSet: { following: followed },
      },
      { new: true }
    );
    if (!userFollower) {
      return res.status(400).json({ msg: "No user found!" });
    }

    const data = {
      type: "follow",
      affectedBy: follower,
      content: "just followed you!",
    };
    console.log(data);
    const notifyToUser = await User.findByIdAndUpdate(
      followed,
      {
        $addToSet: { notify: data },
      },
      { new: true }
    );
    if (!notifyToUser) {
      return res.status(400).json({ msg: "No user found!" });
    }
    res
      .status(200)
      .json({ msg: "Follow success!.", userFollowed, userFollower });
  } catch (error) {
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// un-follow user v2
router.put("/un-follow", async (req, res) => {
  const { followed, follower } = req.body;

  try {
    const userFollowed = await User.findByIdAndUpdate(
      followed,
      {
        $pull: { follower: follower },
      },
      { new: true }
    );
    if (!userFollowed) {
      return res.status(400).json({ msg: "No user found!" });
    }

    const userFollower = await User.findByIdAndUpdate(
      follower,
      {
        $pull: { following: followed },
      },
      { new: true }
    );
    if (!userFollower) {
      return res.status(400).json({ msg: "No user found!" });
    }

    res.status(200).json({ msg: "Unfollowed!.", userFollowed, userFollower });
  } catch (error) {
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// put notify to user v2
router.put("/notify", async (req, res) => {
  const { type, userId, affectedBy, content, affectedPost } = req.body;
  const data = {
    type,
    affectedBy,
    content,
    affectedPost,
  };
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { notify: data },
      },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    res.status(200).json({ msg: "Notify successfully!.", user, userFollower });
  } catch (error) {
    return res.json(error.msg);
  }
});

// get all user for admin
router.get("/all-user-for-admin", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 10;
    const users = await User.find({})
      .select("-password -secret")
      .sort({ createdAt: -1 });

    if (!users) {
      return res.status(400).json({ msg: "No user found!" });
    }
    const numberUsers = await User.find({}).estimatedDocumentCount();
    return res.status(200).json({ users, numberUsers });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// search user v2
router.get("/search-user/:query", async (req, res) => {
  const { query } = req.params;
  if (!query) return;
  try {
    // $regex is special method from mongodb
    // The i modify is used to preform case-insensitive matching
    const search = await User.find({
      $or: [{ name: { $regex: query, $options: "i" } }],
    }).select(
      "-password -secret -email -following -follower -createdAt -updatedAt"
    );
    return res.status(200).json({ msg: "ok", search });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// suggest users v2
router.get("/suggest-user/:id", async (req, res) => {
  try {
    // current user
    const user = await User.findById(req.params.id);
    // array user following

    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    let following = user.following;
    // ,
    // "_id image name username"
    // const temp = await User.find({ _id: { $nin: following } })
    //   .select("-password -secret -following -follower -createdAt -updatedAt")
    //   .limit(10);
    const temp = await User.aggregate([
      {
        $match: {
          _id: {
            $nin: following,
          },
        },
      },
      { $sample: { size: 10 } },
      { $project: { name: 1, email: 1, image: 1 } },
    ]);
    const people = temp.filter((u) => u._id != req.params.id);
    return res.status(200).json({ msg: "Find success", people });
  } catch (error) {
    // return res.status(400).json({ msg: "Something went wrong. Try again!" });
    console.log(error);
  }
});

// 10 user newest
router.get("/suggest-newest-user/:id", async (req, res) => {
  try {
    // current user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }

    let following = user.following; // array of user IDs that the current user is following

    // Find users who are not in the "following" array and sort them by creation date in descending order
    const temp = await User.find({ _id: { $nin: following } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email image"); // specify the fields to be included in the result

    const people = temp.filter((u) => u._id != req.params.id); // exclude the current user

    return res.status(200).json({ msg: "Find success", people });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Something went wrong. Try again!" });
  }
});

// get list user following v2
router.get("/user-following/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    // current user
    const user = await User.findById(userId);
    // array user following
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    let following = user.following;
    //following.filter((f) => new mongoose.Types.ObjectId(f));

    const people = await User.find({ _id: { $in: following } })
      .select("-password -secret -following -follower -createdAt -updatedAt")
      .limit(100);
    return res
      .status(200)
      .json({ msg: "Find success", following: people, name: user.name });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// get list user follower v2
router.get("/user-follower/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // current user
    const user = await User.findById(id);
    // array user follower
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    let follower = user.follower;
    //follower.filter((f) => new mongoose.Types.ObjectId(f));

    const people = await User.find({ _id: { $in: follower } })
      .select("-password -secret  -following -follower -createdAt -updatedAt")
      .limit(100);
    return res
      .status(200)
      .json({ msg: "Find success", follower: people, name: user.name });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// get notify of user v2
router.get("/notify/:id", async (req, res) => {
  const userId = req.params.id;
  if (!userId) return;
  try {
    // current user
    const user = await User.findById(userId)
      .select(
        "-password -secret -following -follower -createdAt -updatedAt -name -username -image -role -email"
      )
      .populate(
        "notify.affectedBy",
        "-password -secret -following -follower -createdAt -updatedAt  -username  -role -notify"
      );

    // array user following
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }

    return res.status(200).json({ msg: "Find success", user });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

// get info
router.get("/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const user = await User.findById(_id).select("-password -secret");
    if (!user) {
      return res.status(400).json({ msg: "No user found!" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ msg: "Something went wrong. Try again!" });
  }
});

module.exports = router;
