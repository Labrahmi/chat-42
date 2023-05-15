/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: macbook <macbook@student.42.fr>            +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2023/04/01 23:11:38 by ylabrahm          #+#    #+#             */
/*   Updated: 2023/04/04 21:52:58 by macbook          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// imports
const os = require("os");
const https = require("https");
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// down (Data Fetching),   up (Web Sockets)
const { MongoClient, ServerApiVersion } = require("mongodb");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
var url = require("url");
const passport = require("passport");
const OAuth2Strategy = require("passport-oauth2");
const path = require("path");
const oauth = require("simple-oauth2");
const session = require("express-session");
const axios = require("axios");
var ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

// Atlas db details:
const username = encodeURIComponent("ylabrahm");
const password = encodeURIComponent("jKno5!!#Y85JK7cB");
const uri =
  "mongodb+srv://" +
  username +
  ":" +
  password +
  "@cluster0.5xrlhqb.mongodb.net/";
const client = new MongoClient(uri);

// app settings, enable url encode and a static dir to import media, also cookie setting
app.use(express.urlencoded());
app.use(express.static("public"));
app.use(cookieParser());

// 42 api details:
const UID = process.env._42_UID;
const SECRET = process.env._42_SECRET;
const redURI = process.env._42_redURI;
let token = "";

// init the PassportJs Strategy
passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: process.env._42_authorizationURL,
      tokenURL: process.env._42_tokenURL,
      clientID: UID,
      clientSecret: SECRET,
      callbackURL: redURI,
    },
    function (accessToken, refreshToken, profile, cb) {
      token = accessToken;
      return cb(null, profile);
    }
  )
);

// some necessary config for passport js to work
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});
app.use(
  session({
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// generateRandomString && getRandomInt
function generateRandomString(length) {
  return crypto.randomBytes(length).toString("hex");
}
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// anonyme login colors
let _login_colors = [
  "text-red-300",
  "text-blue-300",
  "text-gray-300",
  "text-yello-300",
  "text-slate-300",
  "text-lime-300",
  "text-white",
];

// set engine to ejs, so the app can render ejs files to the end-user interface.
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

// get a _rdm value from a given id
async function get_user_data(id, req, res) {
  try {
    const database = client.db("db_data");
    const collection = database.collection("coll_users");
    const user_ = await collection.find({ _login_id: id }).toArray();
    if (user_.length != 0) {
      return user_[0];
    } else {
      return null;
    }
  } catch {
    res.redirect("/error");
  }
}

// get a user data from a given _rdm
async function get_user_data_2(_rdm, req, res) {
  try {
    const database = client.db("db_data");
    const collection = database.collection("coll_users");
    const user_ = await collection.find({ _rdm: _rdm }).toArray();
    if (user_.length != 0) {
      return user_[0];
    } else {
      return null;
    }
  } catch {
    res.redirect("/error");
  }
}

// check the user authentification
async function check_auth(req, res) {
  try {
    const database = client.db("db_data");
    const collection = database.collection("coll_users");
    const user_ = await collection.find({ _rdm: req.cookies._rdm }).toArray();
    if (user_.length == 0) {
      return false;
    } else {
      return true;
    }
  } catch {
    res.redirect("/error");
  }
}

// the first redirect
app.get("/", async (req, res) => {
  res.redirect("/login");
});

// get method on the root directory
app.get("/login", (req, res) => {
  if (req.cookies._rdm == null)
    res.render("login", { api_url: process.env._42_token_auth });
  else {
    check_auth(req, res).then((ret_value) => {
      if (ret_value) {
        res.redirect("/dashboard");
      } else {
        res.render("login", { api_url: process.env._42_token_auth });
      }
    });
  }
});

app.get("/api", passport.authenticate("oauth2"), async function (req, res) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    let _42_response = await axios.get("https://api.intra.42.fr/v2/me", {
      headers,
    });
    _42_response = _42_response.data;
    if (_42_response.campus[0].id != 55) {
      // res.redirect("/error");
    } else {
      const db = client.db("db_data");
      const coll = db.collection("coll_users");
      let _user_exist = await coll.find({
        'user_data.id': _42_response.id,
      }).toArray();
      let _rdm = generateRandomString(16);
      if (_user_exist.length == 0) {
        let obj_user = {
          user_data: _42_response,
          _rdm: _rdm,
          _login_color: _login_colors[getRandomInt(6)],
          _anonyme_login_color: _login_colors[getRandomInt(6)],
        };
        await coll.insertOne(obj_user);
        res.cookie("_rdm", _rdm);
      }
      else {
        res.cookie("_rdm", _user_exist[0]._rdm);
      }
      res.redirect("/dashboard");
    }
  } catch (error) {
    console.log(error);
    res.redirect("/error");
  }
});

async function _42_auth_function(req, res) {
  const _42_response = await axios.get("https://api.intra.42.fr/v2/me", {
    headers,
  });
  if (_42_response.data.campus[0].id != 55) return;
  get_user_data(_42_response.data.id, req, res).then((ret_value, req, res) => {
    if (ret_value != null) {
      res.cookie("_rdm", ret_value._rdm);
      res.redirect("/dashboard");
    } else {
      let _rdm = generateRandomString(16);
      let _name = _42_response.data.displayname;
      let _login = _42_response.data.login;
      let _login_color = _login_colors[getRandomInt(6)];
      let _anonyme_login_color = _login_colors[getRandomInt(6)];
      let _anonyme_login = generateRandomString(4);
      let _login_id = _42_response.data.id;
      let _image_link = _42_response.data.image.link;
      let _campus = _42_response.data.campus[0].name;
      let _campus_id = _42_response.data.campus[0].id;
      res.cookie("_rdm", _rdm);
      let new_user_data = {
        _rdm: _rdm,
        _name: _name,
        _login: _login,
        _login_color: _login_color,
        _login_id: _login_id,
        _image_link: _image_link,
        _anonyme_login: _anonyme_login,
        _anonyme_login_color: _anonyme_login_color,
        _campus: _campus,
        _campus_id: _campus_id,
      };
      async function set_data(req, res) {
        try {
          const database = client.db("db_data");
          const coll_users = database.collection("coll_users");
          const add_user = await coll_users.insertOne(new_user_data);
          return true;
        } catch {
          res.redirect("/error");
        }
      }
      set_data(req, res).then((req, res) => {
        res.redirect("/dashboard");
      });
    }
  });
}

app.get("/dashboard", (req, res) => {
  if (req.cookies._rdm == null) res.redirect("/login");
  else {
    check_auth(req, res).then((ret_value) => {
      if (ret_value) {
        res.redirect("/dashboard/general");
      } else {
        res.redirect("/login");
      }
    });
  }
});

app.get("/dashboard/general", (req, res) => {
  if (req.cookies._rdm == null) res.redirect("/login");
  else {
    check_auth(req, res).then((ret_value) => {
      if (ret_value) {
        async function get_data() {
          try {
            const database = client.db("db_data");
            const coll_messages = database.collection("coll_messages");
            const get_messages = await coll_messages
              .find({
                _channel: "/dashboard/general",
              })
              .toArray();
            return get_messages;
          } catch {
            console.log("catchy");
          }
        }
        get_data().then((msgs_ret_value) => {
          if (msgs_ret_value) {
            res.render("dashboard", {
              _campus: "Tetouan",
              _rdm: req.cookies._rdm,
              _current_ch: "general",
              _old_messages: msgs_ret_value,
            });
          } else {
            res.render("dashboard", {
              _campus: "Tetouan",
              _rdm: req.cookies._rdm,
              _current_ch: "general",
              _old_messages: {},
            });
          }
        });
      } else {
        res.redirect("/login");
      }
    });
  }
});

app.get("/dashboard/announcement", (req, res) => {
  if (req.cookies._rdm == null) res.redirect("/login");
  else {
    check_auth(req, res).then((ret_value) => {
      if (ret_value) {
        async function get_data() {
          try {
            const database = client.db("db_data");
            const coll_messages = database.collection("coll_messages");
            const get_messages = await coll_messages
              .find({
                _channel: "/dashboard/announcement",
              })
              .toArray();
            return get_messages;
          } catch {
            console.log("catchy");
          }
        }
        get_data().then((msgs_ret_value) => {
          if (msgs_ret_value) {
            res.render("dashboard", {
              _campus: "Tetouan",
              _rdm: req.cookies._rdm,
              _current_ch: "announcement",
              _old_messages: msgs_ret_value,
            });
          } else {
            res.render("dashboard", {
              _campus: "Tetouan",
              _rdm: req.cookies._rdm,
              _current_ch: "announcement",
              _old_messages: {},
            });
          }
        });
      } else {
        res.redirect("/login");
      }
    });
  }
});

app.get("/dashboard/random", (req, res) => {
  if (req.cookies._rdm == null) res.redirect("/login");
  else {
    check_auth(req, res).then((ret_value) => {
      if (ret_value) {
        async function get_data() {
          try {
            const database = client.db("db_data");
            const coll_messages = database.collection("coll_messages");
            const get_messages = await coll_messages
              .find({
                _channel: "/dashboard/random",
              })
              .toArray();
            return get_messages;
          } catch {
            console.log("catchy");
          }
        }
        get_data().then((msgs_ret_value) => {
          if (msgs_ret_value) {
            res.render("dashboard", {
              _campus: "Tetouan",
              _rdm: req.cookies._rdm,
              _current_ch: "random",
              _old_messages: msgs_ret_value,
            });
          } else {
            res.render("dashboard", {
              _campus: "Tetouan",
              _rdm: req.cookies._rdm,
              _current_ch: "random",
              _old_messages: {},
            });
          }
        });
      } else {
        res.redirect("/login");
      }
    });
  }
});

app.get("/error", (req, res) => {
  res.send("Server Error");
});

io.on("connection", (socket) => {
  socket.on("client/add_like", (msg) => {
    async function get_msgs() {
      try {
        const db = client.db("db_data");
        const messages = db.collection("coll_messages");
        let O_ID = new ObjectId(msg._msg_id);
        let get_messages = await messages
          .find({
            _id: O_ID,
          })
          .toArray();
        if (get_messages.length != 0) {
          return get_messages[0];
        } else {
          return null;
        }
      } catch {
        console.log("error");
      }
    }
    get_msgs().then((ret_value) => {
      if (ret_value != null) {
        if (ret_value._like_users) {
          let d = new Array();
          d = ret_value._like_users;
          if (d.includes(msg._sender)) {
            d.splice(d.indexOf(msg._sender), 1);
          } else {
            d.push(msg._sender);
          }
          async function set_new_users() {
            const db = client.db("db_data");
            const messages = db.collection("coll_messages");
            let O_ID = new ObjectId(msg._msg_id);
            let x = await messages.updateOne(
              { _id: O_ID },
              { $set: { _like_users: d } }
            );
          }
          set_new_users().then(() => {
            console.log("inserted successfully");
          });
        }
      } else {
        console.log("else");
      }
    });
  });

  socket.on("client/add_dislike", (msg) => {
    async function get_msgs() {
      try {
        const db = client.db("db_data");
        const messages = db.collection("coll_messages");
        let O_ID = new ObjectId(msg._msg_id);
        let get_messages = await messages
          .find({
            _id: O_ID,
          })
          .toArray();
        if (get_messages.length != 0) {
          return get_messages[0];
        } else {
          return null;
        }
      } catch {
        console.log("error");
      }
    }
    get_msgs().then((ret_value) => {
      if (ret_value != null) {
        if (ret_value._dislike_users) {
          let d = new Array();
          d = ret_value._dislike_users;
          if (d.includes(msg._sender)) {
            d.splice(d.indexOf(msg._sender), 1);
          } else {
            d.push(msg._sender);
          }
          async function set_new_users() {
            const db = client.db("db_data");
            const messages = db.collection("coll_messages");
            let O_ID = new ObjectId(msg._msg_id);
            let x = await messages.updateOne(
              { _id: O_ID },
              { $set: { _dislike_users: d } }
            );
          }
          set_new_users().then(() => {
            console.log("inserted successfully");
          });
        }
      } else {
        console.log("else");
      }
    });
  });

  socket.on("client/dashboard/general", (msg) => {
    try {
      if (msg._message.length <= 1000) {
        let _rdm = msg._rdm;
        get_user_data_2(_rdm).then((ret_value) => {
          if (ret_value != null) {
            let message_obj = {
              _message: msg._message,
              _sender_display: ret_value.user_data.login,
              _sender_display_color: ret_value._login_color,
              _channel: msg._channel,
              _likes: 0,
              _dislikes: 0,
              _time: msg._time,
              _rdm: msg._rdm,
              _dislike_users: [],
              _like_users: [],
            };
            async function set_data() {
              try {
                const database = client.db("db_data");
                const coll_messages = database.collection("coll_messages");
                const add_messages = await coll_messages.insertOne(message_obj);
                return true;
              } catch {
                console.log("catchy");
              }
            }
            set_data().then((s_ret_value) => {
              if (s_ret_value) {
                io.emit("server/dashboard/general", message_obj);
              }
            });
          }
        });
      }
    } catch {
      console.log("fuck off");
    }
  });

  socket.on("client/dashboard/announcement", (msg) => {
    try {
      if (msg._message.length <= 1000) {
        let _rdm = msg._rdm;
        get_user_data_2(_rdm).then((ret_value) => {
          if (ret_value != null) {
            let message_obj = {
              _message: msg._message,
              _sender_display: ret_value._login,
              _sender_display_color: ret_value._login_color,
              _channel: msg._channel,
              _likes: 0,
              _dislikes: 0,
              _time: msg._time,
              _rdm: msg._rdm,
              _dislike_users: [],
              _like_users: [],
            };
            async function set_data() {
              try {
                const database = client.db("db_data");
                const coll_messages = database.collection("coll_messages");
                const add_messages = await coll_messages.insertOne(message_obj);
                return true;
              } catch {
                console.log("catchy");
              }
            }
            set_data().then((s_ret_value) => {
              if (s_ret_value) {
                io.emit("server/dashboard/announcement", message_obj);
              }
            });
          }
        });
      }
    } catch {
      console.log("fuck off");
    }
  });

  socket.on("client/dashboard/random", (msg) => {
    try {
      if (msg._message.length <= 1000) {
        let _rdm = msg._rdm;
        get_user_data_2(_rdm).then((ret_value) => {
          if (ret_value != null) {
            let message_obj = {
              _message: msg._message,
              _sender_display: "Anonymous",
              _sender_display_color: ret_value._anonyme_login_color,
              _channel: msg._channel,
              _likes: 0,
              _dislikes: 0,
              _time: msg._time,
              _rdm: msg._rdm,
              _dislike_users: [],
              _like_users: [],
            };
            //
            async function check_last_5() {
              const database = client.db("db_data");
              const coll_messages = database.collection("coll_messages");
              let get_last_msgs = await coll_messages.find({}).sort().toArray();
              get_last_msgs = get_last_msgs.slice(-6);
              let ixx = 0,
                jxx = 0;
              while (ixx < get_last_msgs.length) {
                if (get_last_msgs[ixx]._rdm == msg._rdm) {
                  jxx++;
                }
                ixx++;
              }
              return jxx;
            }
            check_last_5().then((jx_ret_value) => {
              if (jx_ret_value != 6) {
                async function set_data() {
                  try {
                    const database = client.db("db_data");
                    const coll_messages = database.collection("coll_messages");
                    const add_messages = await coll_messages.insertOne(
                      message_obj
                    );
                    return true;
                  } catch {
                    console.log("catchy");
                  }
                }
                set_data().then((s_ret_value) => {
                  if (s_ret_value) {
                    io.emit("server/dashboard/random", message_obj);
                  }
                });
              }
            });
            //
          }
        });
      }
    } catch {
      console.log("fuck off");
    }
  });
});

https
  .get("https://api.ipify.org", (response) => {
    let data = "";
    response.on("data", (chunk) => {
      data += chunk;
    });
    response.on("end", () => {
      const ipAddress = data;
      server.listen(process.env.PORT || 3000, () => {
        console.log(`listening on *:3000 | ip : ${ipAddress}`);
      });
    });
  })
  .on("error", (error) => {
    console.error(error);
  });
