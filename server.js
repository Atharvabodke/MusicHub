const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const mongoose = require("mongoose");
const path = require("path");
const SongSchema = require("./public/schema/Songs.js");
const UserSchema = require("./public/schema/User.js");
const config = require("config");
const db_url = config.get("musichub.dbConfig.url");
const local_url = config.get("musichub.dbConfig.local_url");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const session = require("express-session")({
  secret: uuidv4(),
  resave: true,
  saveUninitialized: true,
});
const sharedSession = require("express-socket.io-session");

//testing
const { inspect } = require("util");

//  middleware
app.use(express.static("./public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session);
io.use(
  sharedSession(session, {
    autoSave: true,
  })
);

//  root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/html/login.html"));
});

//  signup path
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/html/signup.html"));
});

//  home path
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/html/home.html"));
});

//signup user path

app.post("/signupuser", (req, res) => {
  mongoose.connect(db_url).then(() => {
    validateUser().then(() => {
      res.redirect("/");
    });
  });
  async function validateUser() {
    await UserSchema.create({
      username: req.body.username,
      password: req.body.password,
      socket_id: "",
      friends: [],
      friend_request: [],
      playlist: [],
    });
  }
});

//  login user path
app.post("/loginuser", (req, res) => {
  mongoose.connect(db_url).then(() => {
    findUser();
  });
  async function findUser() {
    const user = await UserSchema.find({
      $and: [{ username: req.body.username }, { password: req.body.password }],
    });
    if (user.length >= 1) {
      req.session.username = user[0].username;
      req.session._id = user[0]._id;
      res.redirect("/home");
    } else {
      res.redirect("/");
    }
  }
});

//  test
app.get("/test", (req, res) => {
  res.send(
    req.session._id +
      " -- " +
      req.session.username +
      " ---- " +
      req.session.socket_id
  );
});

//  socket connection
io.on("connection", (socket) => {
  let friendReqCount;
  let friend_list;
  mongoose.connect(db_url);
  getSongs();

  async function getSongs() {
    const songs = await SongSchema.find();
    socket.handshake.session.socket_id = socket.id;
    socket.handshake.session.save();

    getFriendReq().then(() => {
      uploadSocketId().then(() => {
        socket.emit("load", {
          sessionData: {
            username: socket.handshake.session.username,
            _id: socket.handshake.session._id,
          },
          song: songs,
          friendReqCount: friendReqCount.length,
          friendsCount: friend_list,
        });
      });
    });

    async function getFriendReq() {
      friendReqCount = await UserSchema.distinct("friend_request", {
        _id: socket.handshake.session._id,
      });

      friend_list = await UserSchema.find(
        { _id: socket.handshake.session._id },
        { _id: 0, friends: 1 }
      );
    }

    async function uploadSocketId() {
      await UserSchema.updateOne(
        { _id: socket.handshake.session._id },
        { socket_id: socket.handshake.session.socket_id }
      );
    }
  }

  // friend request
  socket.on("friend_request", (id) => {
    socket.broadcast
      .to(id)
      .emit(
        "sent_friend_request",
        "you have a request from: " + socket.handshake.session.username
      );
  });

  // send friend count
  socket.on("sendFriendCount", (data) => {
    let friendCount;
    getFriendCount().then(() => {
      socket.broadcast
        .to(data.socket_id)
        .emit("updateFriendCount", friendCount);
    });

    async function getFriendCount() {
      friendCount = await UserSchema.find(
        { _id: data.user_id },
        { _id: 0, friends: 1 }
      );
    }
  });

  // on disconnect
  socket.on("disconnect", () => {
    console.log("disconneted");
  });
});

//      AXIOS REQUESET

// get all users
app.get("/getAllUsers", (req, res) => {
  let users;
  let friends;
  let final_friends;
  mongoose.connect(db_url).then(() => {
    getFriends().then(() => {
      final_friends = friends[0].friends;
      getAllUser().then(() => {
        res.send(users);
      });
    });
  });

  async function getAllUser() {
    //users = await UserSchema.find({ _id: { $ne: req.session._id } });
    users = await UserSchema.find({
      $and: [
        { _id: { $ne: req.session._id } },
        { _id: { $nin: final_friends } },
      ],
    });
  }
  async function getFriends() {
    friends = await UserSchema.find(
      { _id: req.session._id },
      { _id: 0, friends: 1 }
    );
  }
});

// logout user
app.get("/logoutUser", (req, res) => {
  mongoose.connect(db_url).then(() => {
    logoutUser().then(() => {
      req.session.destroy();
      res.send();
    });
  });
  async function logoutUser() {
    await UserSchema.updateOne(
      { _id: req.session._id },
      { $set: { socket_id: "" } }
    );
  }
});

//request user
app.get("/requestUser", (req, res) => {
  mongoose.connect(db_url).then(() => {
    addFriend();
  });

  async function addFriend() {
    let friend = await UserSchema.find({ _id: req.query.user_id });

    if (friend[0].friend_request.length > 0) {
      for (let i = 0; i < friend[0].friend_request.length; i++) {
        if (friend[0].friend_request[i] == req.session._id) {
          res.send();
          break;
        } else {
          UserSchema.updateOne(
            { _id: req.query.user_id },
            { $push: { friend_request: req.session._id } }
          ).then(() => {
            res.send();
          });
        }
      }
    } else {
      UserSchema.updateOne(
        { _id: req.query.user_id },
        { $push: { friend_request: req.session._id } }
      ).then(() => {
        res.send();
      });
    }
  }
});

//friend request update count
app.get("/friend_request_recived", (req, res) => {
  let user;
  getUser().then(() => {
    res.send(user);
  });

  async function getUser() {
    user = await UserSchema.find(
      { _id: req.session._id },
      { friend_request: 1 }
    ).populate("friend_request");
  }
});

//reject friend
app.get("/reject_friend", (req, res) => {
  removeRequest().then(() => {
    res.send();
  });

  async function removeRequest() {
    await UserSchema.updateMany(
      { _id: req.session._id },
      { $pull: { friend_request: req.query.user_id } }
    );
  }
});
//accept friend
app.get("/accept_friend", (req, res) => {
  let friend_list;
  removeRequest().then(() => {
    updateFriendList().then(() => {
      res.send({ friend_count: friend_list });
    });
  });

  async function removeRequest() {
    await UserSchema.updateMany(
      { _id: req.session._id },
      { $pull: { friend_request: req.query.user_id } }
    );
  }

  //update friend list
  async function updateFriendList() {
    //update self
    await UserSchema.updateOne(
      { _id: req.session._id },
      { $push: { friends: req.query.user_id } }
    );

    //update other user
    await UserSchema.updateOne(
      { _id: req.query.user_id },
      { $push: { friends: req.session._id } }
    );

    //get friends count
    friend_list = await UserSchema.find(
      { _id: req.session._id },
      { _id: 0, friends: 1 }
    );
  }
});

http.listen(process.env.PORT || 8080);
