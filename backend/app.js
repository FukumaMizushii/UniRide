// app.js
// Express + Socket.IO backend for UniRide (works with React frontend)
// Usage: node app.js
// Make sure you have installed: npm i express socket.io cors

const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Allow Socket.IO CORS from typical dev origins (adjust as needed)
const io = socketio(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"], // Vite / CRA defaults
    methods: ["GET", "POST"]
  }
});

// ----------------- CONFIG -----------------
const PORT = process.env.PORT || 5500;

// ----------------- DATA STRUCTURES -----------------
// Users: permanentID -> { username, role, socketID, latitude, longitude }
const users = {};

// Fixed points for ride requests (shared with client)
const fixedPoints = [
  { name: "Gate A", coords: [24.912361403380515, 91.83300018310548] },
  { name: "Gate B", coords: [24.904868651039813, 91.83233499526979] },
  { name: "Library", coords: [24.912147331056858, 91.84336423873903] },
  { name: "Hall", coords: [24.90477133957499, 91.84327840805054] },
];

// Ride requests: pointName -> array of student IDs
const rideRequests = {};
fixedPoints.forEach(pt => (rideRequests[pt.name] = []));

// ----------------- MIDDLEWARE -----------------
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"], // adjust or set to true for open access
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------- SIMPLE REST API for Frontend -----------------

// Return fixed pickup points (React can fetch this on mount)
app.get("/api/fixed-points", (req, res) => {
  res.json({ fixedPoints });
});

// Return current active drivers (useful when a student opens the page)
app.get("/api/drivers", (req, res) => {
  // map users to driver objects
  const drivers = Object.entries(users)
    .filter(([, u]) => u.role === "driver")
    .map(([id, u]) => ({
      id,
      name: u.username,
      latitude: u.latitude,
      longitude: u.longitude,
      online: Boolean(u.socketID)
    }));
  res.json({ drivers });
});

// (Optional) simple health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ----------------- Serve static client build (optional) -----------------
// If you build your React app (vite/build -> dist), point 'clientDist' to it.
// This block will serve the built files in production.
const clientDist = path.join(__dirname, "client", "dist"); // change if you build elsewhere
if (require("fs").existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback
  app.get("*", (req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// ----------------- SOCKET.IO HANDLERS -----------------
io.on("connection", socket => {
  console.log("✅ New WebSocket Connected:", socket.id);

  // Register user with permanent ID
  // payload: { id, name, role }
  socket.on("register-user", ({ id, name, role }) => {
    if (!id) return;
    users[id] = users[id] || {};
    users[id].username = name || users[id].username || "Unknown";
    users[id].role = role || users[id].role || "student";
    users[id].socketID = socket.id;
    console.log(`🧑 Registered: ${users[id].username} (${users[id].role}) id=${id} socket=${socket.id}`);

    // Immediately send current drivers list and pickup points to this socket
    socket.emit("fixed-points", fixedPoints);
    // send drivers as a map-like object
    const driversForClient = Object.entries(users)
      .filter(([,u]) => u.role === "driver")
      .reduce((acc, [pid, u]) => {
        acc[pid] = { name: u.username, latitude: u.latitude, longitude: u.longitude, online: Boolean(u.socketID) };
        return acc;
      }, {});
    socket.emit("drivers-list", driversForClient);
  });

  // Driver sends location updates
  // payload: { permanentID, latitude, longitude }
  socket.on("send-location", ({ permanentID, latitude, longitude }) => {
    if (!permanentID) return;
    users[permanentID] = users[permanentID] || {};
    users[permanentID].latitude = latitude;
    users[permanentID].longitude = longitude;
    users[permanentID].socketID = socket.id; // refresh socketID in case of reconnect

    // broadcast to all clients that a driver moved
    io.emit("driver-location", {
      driverId: permanentID,
      name: users[permanentID].username || "Driver",
      latitude,
      longitude
    });
  });

  // Student requests ride at a fixed point
  // payload: { studentId, point }
  socket.on("request-ride", ({ studentId, point }) => {
    if (!studentId || !point || !rideRequests[point]) return;
    // avoid duplicate student entries for same point
    if (!rideRequests[point].includes(studentId)) rideRequests[point].push(studentId);

    console.log(`📝 Request: student=${studentId} point=${point}`);
    // notify all drivers (or you could emit to a namespace/room)
    io.emit("new-ride-request", { studentId, point, counts: rideRequests[point].length });
  });

  // Driver accepts all requests at a point
  // payload: { driverId, point }
  socket.on("accept-ride", ({ driverId, point }) => {
    if (!driverId || !point) return;
    const students = rideRequests[point] || [];
    const driverName = users[driverId]?.username || "Driver";

    console.log(`✅ Accept: driver=${driverId} point=${point} students=${students.length}`);

    // notify each student (if they're online)
    students.forEach(studentId => {
      const studentSocket = users[studentId]?.socketID;
      if (studentSocket) {
        io.to(studentSocket).emit("ride-accepted", { driverId, driverName, point });
      }
    });

    // clear requests for that point
    rideRequests[point] = [];
    io.emit("clear-ride-requests", { point });
  });

  // Optional: allow clients to request current rideRequests summary
  socket.on("get-requests", () => {
    socket.emit("requests-summary", rideRequests);
  });

  // Handle disconnect -- keep permanent user record but clear socketID
  socket.on("disconnect", () => {
    // find user by socket id
    const entry = Object.entries(users).find(([pid, info]) => info.socketID === socket.id);
    if (entry) {
      const [permanentID, info] = entry;
      console.log(`❌ Disconnect: ${info.username} (${permanentID}) socket=${socket.id}`);
      users[permanentID].socketID = null;
      // notify clients that this user went offline (useful to remove markers)
      io.emit("user-disconnected", permanentID);
    } else {
      console.log(`❌ Socket disconnected (not matched): ${socket.id}`);
    }
  });
});

// ----------------- START SERVER -----------------
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`  - REST: /api/fixed-points  /api/drivers`);
  console.log(`  - Socket.IO ready`);
});

/*
Notes & next steps for connecting with your React frontend:

1) In development (Vite), configure a proxy so your React dev server forwards API
   & socket connections to this backend. Example (vite.config.js):
   server: { proxy: { '/api': 'http://localhost:5500', '/socket.io': 'http://localhost:5500' } }

   Or, in the frontend, connect socket with:
     const socket = io("http://localhost:5500");

2) Your React pages:
   - /points (student) should:
       * fetch /api/fixed-points (or listen for 'fixed-points' socket event)
       * open socket and 'register-user' with { id, name, role: 'student' }
       * listen for 'drivers-list' or 'driver-location' and display markers
       * emit 'request-ride' when student requests a point

   - /driverPortal (driver) should:
       * open socket and 'register-user' with { id, name, role: 'driver' }
       * request geolocation and emit 'send-location' continuously
       * listen for 'new-ride-request' and show counts
       * emit 'accept-ride' when accept is clicked

3) If you later build the React app into a static bundle, put it in ./client/dist
   (or change clientDist path above) and the server will serve the static files.

4) Security & persistence:
   - This example uses in-memory storage (users, rideRequests). For production,
     persist users and rideRequests into a DB (MongoDB) as we discussed earlier.

If you want, next step I can:
- provide a minimal React hook example for connecting to this socket and plotting drivers,
- or provide the updated `vite.config.js` proxy config you need.
*/


// const express = require("express");
// const app = express();
// const path = require("path");

// const http = require("http");

// const socketio = require("socket.io");
// const server = http.createServer(app);
// const io = socketio(server);

// app.set("view engine", "ejs");
// app.use(express.static(path.join(__dirname, "public")));

// io.on("connection", function (socket) {
//   socket.on("send-location", function (data) {
//     io.emit("receive-location", { id: socket.id, ...data });
//   });
//   socket.on("disconnect", function() {
//     io.emit("user-disconnected", socket.id);
//   });
//   console.log("connected");
// });

// app.get("/", function (rq, res) {
//   res.render("index");
// });

// server.listen(5500);




// const express = require("express");
// const app = express();
// const path = require("path");

// const http = require("http");
// const server = http.createServer(app);

// const socketio = require("socket.io");
// const io = socketio(server);

// // Store users: permanentID → { username, role, socketID }
// const users = {};

// app.set("view engine", "ejs");

// // Allow public files (style.css, script.js, etc.)
// app.use(express.static(path.join(__dirname, "public")));

// // Parse submitted form data
// app.use(express.urlencoded({ extended: true }));

// // Login Page
// app.get("/", (req, res) => {
//   res.render("index"); // This is login page
// });

// // Handle login → go to map page
// app.post("/navigate", (req, res) => {
//   const { username, role } = req.body;
//   console.log(`➡️ LOGIN REQUEST: ${username} | Role: ${role}`);

//   res.render("navigation", { username, role });
// });


// // SOCKET.IO HANDLING
// io.on("connection", (socket) => {
//   console.log("\n✅ New WebSocket Connected");
//   console.log(`🔗 Socket ID: ${socket.id}`);

//   // When client registers itself with permanent ID
//   socket.on("register-user", ({ permanentID, username, role }) => {
//     users[permanentID] = { username, role, socketID: socket.id };
    
//     console.log(`🧑 User Registered: ${username} (${role})`);
//     console.log(`🆔 Permanent ID: ${permanentID}`);
//   });

//   // When location updates
//   socket.on("send-location", (data) => {
//     const { permanentID, latitude, longitude } = data;

//     const user = users[permanentID] || { username: "Unknown", role: "Unknown" };

//     console.log(`🛰️ Location Update from ${user.username} (${permanentID})`);
//     console.log(`   Lat: ${latitude}, Lon: ${longitude}`);

//     // Send update to all clients
//     io.emit("receive-location", {
//       permanentID,
//       username: user.username,
//       role: user.role,
//       latitude,
//       longitude,
//     });
//   });

//   // When user disconnects → remove only the *socket*, but keep identity
//   socket.on("disconnect", () => {
//     const entry = Object.entries(users).find(([id, info]) => info.socketID === socket.id);
//     if (entry) {
//       const [permanentID, user] = entry;
//       console.log(`❌ User Disconnected: ${user.username} (${permanentID})`);

//       // Notify clients to remove marker
//       io.emit("user-disconnected", permanentID);
      
//       // We DO NOT delete user permanently → identity stays saved
//       // But update socketID to null so it can reattach later
//       users[permanentID].socketID = null;
//     } else {
//       console.log(`❌ Socket Disconnected (not registered): ${socket.id}`);
//     }
//   });
// });


// // START SERVER
// const PORT = 5500;
// server.listen(PORT, () => {
//   console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
// });


// const express = require("express");
// const path = require("path");
// const http = require("http");
// const socketio = require("socket.io");
// const cors = require("cors");

// const app = express();
// const server = http.createServer(app);
// const io = socketio(server);

// // ----------------- DATA STRUCTURES -----------------

// // Users: permanentID → { username, role, socketID, latitude, longitude }
// const users = {};

// // Fixed points for ride requests
// const fixedPoints = [
//   { name: "Gate A", coords: [24.912361403380515, 91.83300018310548] },
//   { name: "Gate B", coords: [24.904868651039813, 91.83233499526979] },
//   { name: "Library", coords: [24.912147331056858, 91.84336423873903] },
//   { name: "Hall", coords: [24.90477133957499, 91.84327840805054] },
// ];

// // Ride requests: pointName → array of student IDs
// const rideRequests = {};
// fixedPoints.forEach(pt => rideRequests[pt.name] = []);

// // ----------------- EXPRESS SETUP -----------------
// app.set("view engine", "ejs");
// app.use(express.static(path.join(__dirname, "public")));
// app.use(express.urlencoded({ extended: true }));

// // ----------------- ROUTES -----------------

// // Login page
// app.get("/", (req, res) => {
//   res.render("index");
// });

// // After login → navigation page
// app.post("/navigate", (req, res) => {
//   let username, role, id;

//   if (req.body.role === "student") {
//     username = req.body.studentName;
//     role = "student";
//     id = req.body.studentId;
//   } else if (req.body.role === "driver") {
//     username = req.body.driverName;
//     role = "driver";
//     id = req.body.driverId;
//   } else {
//     return res.send("Invalid role!");
//   }

//   console.log(`➡️ LOGIN: ${username} | Role: ${role} | ID: ${id}`);

//   res.render("navigation", {
//     USER_NAME: username,
//     USER_ROLE: role,
//     USER_ID: id,
//     FIXED_POINTS: fixedPoints,
//   });
// });

// // ----------------- SOCKET.IO -----------------
// io.on("connection", socket => {
//   console.log("\n✅ New WebSocket Connected");
//   console.log(`🔗 Socket ID: ${socket.id}`);

//   // User registers with permanent ID
//   socket.on("register-user", ({ id, name, role }) => {
//     users[id] = { username: name, role, socketID: socket.id };
//     console.log(`🧑 User Registered: ${name} | Role: ${role} | ID: ${id}`);
//   });

//   // Driver sends location updates
//   socket.on("send-location", ({ permanentID, latitude, longitude }) => {
//     if (!users[permanentID]) return;

//     users[permanentID].latitude = latitude;
//     users[permanentID].longitude = longitude;

//     console.log(`🛰️ Location Update from ${users[permanentID].username} (${permanentID})`);
//     console.log(`   Lat: ${latitude}, Lon: ${longitude}`);

//     io.emit("driver-location", {
//       driverId: permanentID,
//       name: users[permanentID].username,
//       latitude,
//       longitude,
//     });
//   });

//   // Student requests ride at a fixed point
//   socket.on("request-ride", ({ studentId, point }) => {
//     if (!rideRequests[point]) return;
//     rideRequests[point].push(studentId);

//     console.log(`📝 Ride request at ${point} by student ${studentId}`);
//     io.emit("new-ride-request", { studentId, point });
//   });

//   // Driver accepts ride requests at a point
//   socket.on("accept-ride", ({ driverId, point }) => {
//     const students = rideRequests[point] || [];
//     const driverName = users[driverId]?.username || "Unknown";

//     console.log(`✅ Driver ${driverName} accepted requests at ${point} for students:`, students);

//     // Notify all students at that point
//     students.forEach(studentId => {
//       const studentSocket = users[studentId]?.socketID;
//       if (studentSocket) {
//         io.to(studentSocket).emit("ride-accepted", {
//           driverName,
//           point,
//         });
//       }
//     });

//     // Clear ride requests for that point
//     rideRequests[point] = [];
//     io.emit("clear-ride-requests", point);
//   });

//   // Handle disconnect
//   socket.on("disconnect", () => {
//     const entry = Object.entries(users).find(([id, info]) => info.socketID === socket.id);
//     if (entry) {
//       const [permanentID, user] = entry;
//       console.log(`❌ User Disconnected: ${user.username} (${permanentID})`);

//       // Notify clients to remove driver marker
//       io.emit("user-disconnected", permanentID);

//       // Keep user identity, just remove socketID
//       users[permanentID].socketID = null;
//     } else {
//       console.log(`❌ Socket Disconnected (not registered): ${socket.id}`);
//     }
//   });
// });

// // ----------------- START SERVER -----------------
// const PORT = 5500;
// server.listen(PORT, () => {
//   console.log(`\n🚀 Server running at http://localhost:${PORT}\n`);
// });
