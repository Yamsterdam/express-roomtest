const express = require("express");
const { pathToFileURL } = require("url");
const { isNullOrUndefined } = require("util");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
const rooms = {};

function generateID() {
  var nums = [];
  for (var i = 0; i < 6; i++) {
    nums.push((Math.random() * (9 - 0 + 1)) << 0);
  }

  var id = "";
  for (var i = 0; i < 6; i++) {
    id += nums[i];
  }
  return id;
}

app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/getrooms", function (req, res) {
  res.json({ rooms: rooms });
});

app.get("/join", function (req, res) {
  res.render("join.ejs");
});

app.get("/browser", function (req, res) {
  res.render("servers.ejs", {
    roomList: rooms,
  });
});

app.get("/:room", (req, res) => {
  var found = false;
  var foundKey = "";
  for (const [key, value] of Object.entries(rooms)) {
    if (value[0] == req.params.room) {
      console.log(value[0] + " is equal to " + req.params.room);
      found = true;
      foundKey = key;
    }
  }
  if (found == true) {
    res.render("chat.ejs", {
      roomName: foundKey,
      roomID: req.params.room,
    });
  } else {
    return res.redirect("/");
  }
});

io.sockets.on("connection", function (socket) {
  socket.on("join", function (pathname) {
    socket.join(pathname);
  });

  socket.on("username", function (username, path) {
    socket.username = username;
    console.log(path);
    io.to(path).emit(
      "is_online",
      "<i>" + socket.username + " joined the chat..</i>"
    );
    if (path != undefined) {
      for (const [key, value] of Object.entries(rooms)) {
        if (value[0] === path.substring(1)) {
          rooms[key][1] = rooms[key][1] + 1;
          console.log("Player count: " + rooms[key][1]);
        }
      }
    }
  });

  socket.on("browse", function (path) {
    console.log(path);
    socket.emit("redirect", "/" + "browser");
  });
  socket.on("home", function (path) {
    console.log(path);
    socket.emit("redirect", "/");
  });

  socket.on("joinRoom", function (id, path) {
    console.log(path);
    socket.emit("redirect", "/" + id);
  });

  socket.on("user_left", function (username, path) {
    console.log(path + " : " + username);
    io.to(path).emit(
      "is_online",
      "<i>" + socket.username + " left the chat..</i>"
    );
  });

  socket.on("chat_message", function (message, path) {
    io.to(path).emit(
      "chat_message",
      "<strong>" + socket.username + "</strong>: " + message
    );
  });

  socket.on("typing", function (username, path) {
    io.to(path).emit("type", "<i>" + socket.username + "</i>" + " is typing!");
  });

  socket.on("createRoom", function (roomName, path) {
    console.log(rooms);
    if (rooms.hasOwnProperty(roomName)) {
      socket.emit("exists");
    } else {
      let gen = true;
      while (gen == true) {
        let id = generateID();
        console.log(id);
        if (Object.values(rooms).indexOf(id) > -1) {
          console.log("id in use");
        } else {
          rooms[roomName] = [id, 0];
          socket.emit("redirect", "/" + rooms[roomName][0]);
          gen = false;
        }
      }
    }
  });

  socket.on("joinCode", function (code, path) {
    if (Object.values(rooms).indexOf(code) > -1) {
      console.log("id found");
      let room = Object.keys(rooms);
      let name = room[Object.values(rooms).indexOf(code)];
      console.log(name);
      socket.emit("redirect", "/" + code);
    }
  });
});

const server = http.listen(8080, function () {
  console.log("listening on 8080");
});
