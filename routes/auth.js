import User from "./../models/user.js";
import validator from "validator";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import randomCatAvatar from "../middleware/randomCatAvatar.js";

const newFormat = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

const register = async(req, res) => {
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
    const image = {
        url: randomCatAvatar(),
        public_id: nanoid(),
    };
    const user = await User.create({
        name,
        email,
        password,
        secret,
        username: nanoid(),
        image,
    });

    return res.status(200).json({
        msg: "Register success. Let's login",
    });
};
const login = async(req, res) => {
    try {
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

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "Email or password is not defined!" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Email or password is not defined!" });
        }

        const token = jwt.sign({ _id: user._id }, process.env.JWT, {
            expiresIn: rememberPassword ? "365d" : process.env.JWT_LIFETIME,
        });
        user.password = undefined;
        user.secret = undefined;
        return res.status(200).json({ token, user });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ msg: "LOGIN ERROR. Try again!" });
    }
};

const currentUser = async(req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        return res.status(200).json({ user, ok: true });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ msg: "Error. Try again!" });
    }
};

const updateUser = async(req, res) => {
    try {
        const {
            name,
            username,
            about,
            image,
            password,
            rePassword,
            currentPassword,
        } = req.body;
        const userId = req.user.userId;
        let data = { name, username };
        if (!name) {
            return res.status(400).json({ msg: "Please provider name!" });
        }
        if (newFormat.test(name)) {
            return res
                .status(400)
                .json({ msg: "Name cannot have special characters" });
        }
        if (!username) {
            return res.status(400).json({ msg: "Please provider username!" });
        }
        if (about) {
            data.about = about;
        }
        if (image) {
            data.image = image;
        }
        if (currentPassword) {
            if (password !== rePassword) {
                return res.status(400).json({ msg: "New passwords are not the same!" });
            }
            if (password.length < 6) {
                return res
                    .status(400)
                    .json({ msg: "Password must be longer than 6 characters!" });
            }

            const user = await User.findById(userId);

            if (!user) {
                return res.status(400).json({ msg: "No user found" });
            }

            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res
                    .status(400)
                    .json({ msg: "Current password is wrong! Try again!" });
            }
        }

        let user = await User.findByIdAndUpdate(req.user.userId, data, {
            new: true,
        });
        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        if (currentPassword) {
            user.password = password;
            await user.save();
        }
        user.password = undefined;
        user.secret = undefined;
        const token = jwt.sign({ _id: user._id }, process.env.JWT, {
            expiresIn: process.env.JWT_LIFETIME || "1d",
        });
        return res.status(200).json({ msg: "Update user success.", user, token });
    } catch (error) {
        if (error.code == 11000) {
            return res.status(400).json({ msg: "Duplicate username!" });
        }
        console.log(error);
        return res.status(400).json({ msg: "UPDATE ERROR. Try again!" });
    }
};

const ForgotPassword = async(req, res) => {
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
        return res.status(200).json({ msg: "ok" });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const addFollower = async(req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.body.userId, {
            $addToSet: {
                follower: req.user.userId,
            },
        });
        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        next();
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const userFollower = async(req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.userId, {
                $addToSet: { following: req.body.userId },
            }, { new: true }
        );
        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        res.status(200).json({ msg: "Follow success!.", user });
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const removeFollower = async(req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.body.userId, {
            $pull: {
                follower: req.user.userId,
            },
        });
        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        next();
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const userUnFollower = async(req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.userId, {
                $pull: { following: req.body.userId },
            }, { new: true }
        );
        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        res.status(200).json({ msg: "Unfollowed!.", user });
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const findPeople = async(req, res) => {
    try {
        // current user
        const user = await User.findById(req.user.userId);
        // array user following

        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        let following = user.following;
        // ,
        // "_id image name username"
        const people = await User.find({ _id: { $nin: following } })
            .select(
                "-password -secret -email -following -follower -createdAt -updatedAt"
            )
            .limit(10);

        return res.status(200).json({ msg: "Find success", people });
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const userFollowing = async(req, res) => {
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
            .select(
                "-password -secret -email -following -follower -createdAt -updatedAt"
            )
            .limit(100);
        return res
            .status(200)
            .json({ msg: "Find success", following: people, name: user.name });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};
const listUserFollower = async(req, res) => {
    try {
        const userId = req.params.id;
        // current user
        const user = await User.findById(userId);
        // array user follower
        if (!user) {
            return res.status(400).json({ msg: "No user found!" });
        }
        let follower = user.follower;
        //follower.filter((f) => new mongoose.Types.ObjectId(f));

        const people = await User.find({ _id: { $in: follower } })
            .select(
                "-password -secret -email -following -follower -createdAt -updatedAt"
            )
            .limit(100);
        return res
            .status(200)
            .json({ msg: "Find success", follower: people, name: user.name });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const searchUser = async(req, res) => {
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
};

const getInformationUser = async(req, res) => {
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
};

const allUsers = async(req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const perPage = Number(req.query.perPage) || 10;
        const users = await User.find({})
            .select("-password -secret")
            .skip((page - 1) * perPage)
            .sort({ createdAt: -1 })
            .limit(perPage);
        if (!users) {
            return res.status(400).json({ msg: "No user found!" });
        }
        const numberUsers = await User.find({}).estimatedDocumentCount();
        return res.status(200).json({ users, numberUsers });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const deleteUserWithAdmin = async(req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(400).json({ msg: "No user found." });
        }
        return res.status(200).json({ msg: "Deleted user." });
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

const something = async(req, res) => {
    try {
        return res.status(200).json({ msg: "ok" });
    } catch (error) {
        return res.status(400).json({ msg: "Something went wrong. Try again!" });
    }
};

export {
    register,
    login,
    updateUser,
    currentUser,
    ForgotPassword,
    addFollower,
    userFollower,
    findPeople,
    userFollowing,
    removeFollower,
    userUnFollower,
    searchUser,
    getInformationUser,
    allUsers,
    deleteUserWithAdmin,
    listUserFollower,
};