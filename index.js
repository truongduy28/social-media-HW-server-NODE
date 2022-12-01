// import library
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

// heheh

// import route
const userRoute = require("./routes/user");
const postRoute = require("./routes/post");
const messageRoute = require("./routes/message");
const chatRoute = require("./routes/chat");
const messageV2Route = require("./routes/messageV2");

// app start up and port
const app = express();

app.use(express.json());

// Enviroment avarible ENV
dotenv.config();

app.use("/images", express.static(path.join(__dirname, "public/images")));

// connect database
mongoose.connect(process.env.MONGO_URL, () => {
  console.log("Connected to MongoDB");
});

//middleware
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan("common"));

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "public/images");
//     },
//     filename: (req, file, cb) => {
//         cb(null, req.body.name);
//         // cb(null, file.originalname);
//     },
// });

// const upload = multer({ storage: storage });
// app.post("/api/upload", upload.single("file"), (req, res) => {
//     try {
//         return res.status(200).json("File uploded successfully");
//     } catch (error) {
//         return res.status(500).json(error.message);
//     }
// });

// request http
app.get("/", (req, res) => {
  res.send("alo");
});
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/messages", messageRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messsagesV2", messageV2Route);

const server = app.listen(1800, () => {
  console.log("Server is running... ");
});

const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_HOST,
      "http://localhost:3000",
      "https://frost-social.vercel.app",
      "https://frost-social-4f5kdlt7u-noothelee.vercel.app",
      "https://frost-social-git-main-noothelee.vercel.app/",
    ],
    methods: ["GET", "POST", "PUT", "PATCH"],
    allowedHeaders: ["Content-type"],
  },
});

io.on("connect", (socket) => {
  socket.on("new-post", (newPost) => {
    console.log("new-post", newPost);
    socket.broadcast.emit("new-post", newPost);
  });
  socket.on("new-comment", (newComment) => {
    //console.log("new-post", newPost);
    socket.broadcast.emit("new-comment", newComment);
  });
  socket.on("new-message", (newMessage) => {
    // console.log(newMessage);
    socket.broadcast.emit("new-message", newMessage);
  });
});
