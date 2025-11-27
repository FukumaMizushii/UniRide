const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"], 
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your existing backend logic
const users = {};
const fixedPoints = [
  { 
    name: "Sust Gate", 
    coords: [24.911135347770895, 91.83223843574525] 
  },
  { 
    name: "IICT", 
    coords: [24.91813148559637, 91.83094024658205] 
  },
  { 
    name: "Chetona 71", 
    coords: [24.92066614969974, 91.8324798345566] 
  },
  { 
    name: "E Building", 
    coords: [24.92036938749737, 91.83409452438356] 
  },
  { 
    name: "Central Auditorium", 
    coords: [24.924105620167428, 91.83254957199098] 
  },
  { 
    name: "Shah Paran Hall", 
    coords: [24.924747773756355, 91.83506011962892] 
  },
  { 
    name: "Mujtoba Ali Hall", 
    coords: [24.92650881416285, 91.83562874794006] 
  },
  { 
    name: "Ladies Hall", 
    coords: [24.92236400496206, 91.8292772769928] 
  },
];

const rideRequests = {};
fixedPoints.forEach((pt) => (rideRequests[pt.name] = []));

// 🆕 ADD STUDENT ACTIVE REQUESTS TRACKING
const studentActiveRequests = {}; // studentId → pointName

// API Routes
app.get("/api/points", (req, res) => {
  res.json(fixedPoints);
});

app.post("/api/login", (req, res) => {
  const { username, role, id } = req.body;
  res.json({ success: true, username, role, id });
});

// Serve static files (for production)
app.use(express.static(path.join(__dirname, "../dist")));

// Socket.io logic
io.on("connection", (socket) => {
  console.log("✅ New WebSocket Connected:", socket.id);

  socket.on("register-user", ({ id, name, role }) => {
    users[id] = { username: name, role, socketID: socket.id };
    console.log(`🧑 User Registered: ${name} | Role: ${role} | ID: ${id}`);
  });

  socket.on("send-location", ({ permanentID, latitude, longitude }) => {
    if (!users[permanentID]) return;

    users[permanentID].latitude = latitude;
    users[permanentID].longitude = longitude;

    console.log(
      `🛰️ Location from ${users[permanentID].username}: ${latitude}, ${longitude}`
    );

    io.emit("driver-location", {
      driverId: permanentID,
      name: users[permanentID].username,
      latitude,
      longitude,
    });
  });

  // 🆕 ENHANCED RIDE REQUEST WITH VALIDATION
  socket.on("request-ride", ({ studentId, point }) => {
    console.log(
      `🔍 Checking request from student: ${studentId} for point: ${point}`
    );
    console.log(`📊 Current active requests:`, studentActiveRequests);

    // Check if student already has active request
    if (studentActiveRequests[studentId]) {
      console.log(
        `🚫 Student ${studentId} already has active request at ${studentActiveRequests[studentId]}`
      );
      socket.emit("request-error", {
        message: `You already have an active ride request at ${studentActiveRequests[studentId]}`,
      });
      return;
    }

    if (!rideRequests[point]) {
      console.log(`❌ Invalid point: ${point}`);
      socket.emit("request-error", { message: "Invalid pickup point" });
      return;
    }

    // Store active request
    studentActiveRequests[studentId] = point;
    rideRequests[point].push(studentId);

    console.log(`✅ Request stored - Student: ${studentId}, Point: ${point}`);
    console.log(`📊 Updated active requests:`, studentActiveRequests);

    // Notify student of success
    socket.emit("request-success", { point });

    // Notify all drivers
    io.emit("new-ride-request", { studentId, point });
  });

  // 🆕 CANCEL RIDE REQUEST
  socket.on("cancel-ride-request", ({ studentId, point }) => {
    if (studentActiveRequests[studentId] === point) {
      // Remove from ride requests
      const pointRequests = rideRequests[point] || [];
      rideRequests[point] = pointRequests.filter((id) => id !== studentId);

      // Remove from active requests
      delete studentActiveRequests[studentId];

      console.log(
        `❌ Ride request cancelled by student ${studentId} at ${point}`
      );

      // Notify student
      socket.emit("request-cancelled");

      // Notify drivers
      io.emit("ride-request-cancelled", { studentId, point });
    } else {
      socket.emit("request-error", {
        message: "No active request found to cancel",
      });
    }
  });

  // 🆕 UPDATED ACCEPT-RIDE WITH ACTIVE REQUEST CLEANUP
  socket.on("accept-ride", ({ driverId, point }) => {
    const students = rideRequests[point] || [];
    const driverName = users[driverId]?.username || "Unknown";

    console.log(
      `✅ Driver ${driverName} accepted requests at ${point} for students:`,
      students
    );

    // Notify students and clear their active requests
    students.forEach((studentId) => {
      // 🆕 Clear active request for this student
      delete studentActiveRequests[studentId];

      const studentSocket = users[studentId]?.socketID;
      if (studentSocket) {
        io.to(studentSocket).emit("ride-accepted", {
          driverName,
          point,
        });
      }
    });

    // Clear ride requests for that point
    rideRequests[point] = [];
    io.emit("clear-ride-requests", point);
  });

  // 🆕 GET DRIVER LOCATIONS (for when clients connect)
  socket.on("get-driver-locations", () => {
    // Send current driver locations to the requesting client
    Object.entries(users).forEach(([userId, user]) => {
      if (user.role === "driver" && user.latitude && user.longitude) {
        socket.emit("driver-location", {
          driverId: userId,
          name: user.username,
          latitude: user.latitude,
          longitude: user.longitude,
        });
      }
    });
  });

socket.on("disconnect", () => {
  const entry = Object.entries(users).find(
    ([id, info]) => info.socketID === socket.id
  );
  if (entry) {
    const [permanentID, user] = entry;
    console.log(`❌ User Disconnected: ${user.username} (${permanentID})`);

    // 🆕 FIX: Remove driver from users object completely
    delete users[permanentID];
    console.log(`🗑️ Removed user ${permanentID} from active users`);

    // 🆕 CLEANUP ACTIVE REQUESTS ON DISCONNECT
    if (studentActiveRequests[permanentID]) {
      const point = studentActiveRequests[permanentID];
      console.log(`🧹 Cleaning up active request for disconnected student: ${permanentID} at ${point}`);

      // Remove from ride requests
      const pointRequests = rideRequests[point] || [];
      rideRequests[point] = pointRequests.filter((id) => id !== permanentID);

      // Remove from active requests
      delete studentActiveRequests[permanentID];

      // Notify drivers about cancelled request
      io.emit("ride-request-cancelled", { studentId: permanentID, point });
    }

    // Notify all clients to remove marker
    io.emit("user-disconnected", permanentID);
  } else {
    console.log(`❌ Socket Disconnected (unregistered): ${socket.id}`);
  }
});
});

// FIX: Remove the problematic catch-all route for now
// We'll handle React routing differently

const PORT = 5500;
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running at http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🎯 Single-request validation: ACTIVE`);
});

// sudo kill -9 $(sudo lsof -t -i:5500)
