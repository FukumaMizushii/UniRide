// require('dotenv').config();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI.replace(
  "<db_password>",
  process.env.DB_PASSWORD
);

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");

    // Start server only after DB connection
    const PORT = process.env.PORT || 5500;
    server.listen(PORT, () => {
      console.log(`🚀 Backend Server running at http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready for connections`);
      console.log(`🗄️  MongoDB connected: ✅`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// Remove the old server.listen() at the bottom of the file

// // MongoDB Connection
// const MONGODB_URI = process.env.MONGODB_URI.replace(
//   "<db_password>",
//   process.env.DB_PASSWORD
// );

// mongoose
//   .connect(MONGODB_URI)
//   .then(() => console.log("✅ MongoDB Connected Successfully"))
//   .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Import Models
const User = require("./models/User");
const RideRequest = require("./models/RideRequest");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Fixed points (now stored in database for future flexibility)
const fixedPoints = [
  { name: "Sust Gate", coords: [24.911135347770895, 91.83223843574525] },
  { name: "IICT", coords: [24.91813148559637, 91.83094024658205] },
  { name: "Chetona 71", coords: [24.92066614969974, 91.8324798345566] },
  { name: "E Building", coords: [24.92036938749737, 91.83409452438356] },
  {
    name: "Central Auditorium",
    coords: [24.924105620167428, 91.83254957199098],
  },
  { name: "Shah Paran Hall", coords: [24.924747773756355, 91.83506011962892] },
  { name: "Mujtoba Ali Hall", coords: [24.92650881416285, 91.83562874794006] },
  { name: "Ladies Hall", coords: [24.92236400496206, 91.8292772769928] },
];

// In-memory storage for real-time data (complementary to database)
const activeSockets = {}; // userId → socketId
const rideRequests = {};
fixedPoints.forEach((pt) => (rideRequests[pt.name] = []));

// API Routes
app.get("/api/points", (req, res) => {
  res.json(fixedPoints);
});

// User Registration
// ✅ FIXED: User Registration - Allow multiple users properly
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role, studentId, autoId } = req.body;

    console.log("📝 Registration attempt:", {
      name,
      email,
      role,
      studentId,
      autoId,
    });

    // ✅ FIX: Build proper query based on role
    let query = { email };

    if (role === "student" && studentId) {
      // For students, check if email OR studentId exists
      query = { $or: [{ email }, { studentId }] };
    } else if (role === "driver" && autoId) {
      // For drivers, check if email OR autoId exists
      query = { $or: [{ email }, { autoId }] };
    }

    // Check if user already exists
    const existingUser = await User.findOne(query);

    if (existingUser) {
      let message = "User already exists with this ";

      if (existingUser.email === email) {
        message += "email";
      } else if (role === "student" && existingUser.studentId === studentId) {
        message += "student ID";
      } else if (role === "driver" && existingUser.autoId === autoId) {
        message += "auto ID";
      } else {
        message += "credentials";
      }

      console.log("❌ Registration failed:", message);
      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // This will be hashed by the pre-save hook
      role,
      studentId: role === "student" ? studentId : undefined,
      autoId: role === "driver" ? autoId : undefined,
    });

    await user.save();
    console.log("✅ User registered successfully:", user.email);

    res.json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        autoId: user.autoId,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed - " + error.message,
    });
  }
});

// User Login
// ✅ FIXED: User Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log("🔐 Login attempt:", { email, role });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if role matches
    if (user.role !== role) {
      console.log("❌ Role mismatch:", user.role, "!=", role);
      return res.status(400).json({
        success: false,
        message: `Invalid credentials for ${role} role`,
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log("❌ Invalid password for:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update user as online
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    console.log("✅ Login successful:", user.email);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        autoId: user.autoId,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// Debug endpoints
app.get("/api/debug/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json({
      success: true,
      count: users.length,
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        studentId: u.studentId,
        autoId: u.autoId,
        isOnline: u.isOnline,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/debug/ride-requests", async (req, res) => {
  try {
    const requests = await RideRequest.find({})
      .populate("student", "name email")
      .populate("driver", "name email");

    res.json({
      success: true,
      count: requests.length,
      requests: requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/debug/clear-users", async (req, res) => {
  try {
    await User.deleteMany({});
    await RideRequest.deleteMany({});

    // Reset in-memory storage
    Object.keys(rideRequests).forEach((point) => {
      rideRequests[point] = [];
    });

    res.json({ success: true, message: "All users and ride requests cleared" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Serve static files
app.use(express.static(path.join(__dirname, "../dist")));

// Socket.io logic
io.on("connection", (socket) => {
  console.log("✅ New WebSocket Connected:", socket.id);

  socket.on("register-user", async ({ id, name, role }) => {
    try {
      // Store socket connection
      activeSockets[id] = socket.id;

      // Update user online status in database
      await User.findByIdAndUpdate(id, {
        isOnline: true,
        lastSeen: new Date(),
      });

      console.log(`🧑 User Registered: ${name} | Role: ${role} | ID: ${id}`);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  });

  socket.on(
    "send-location",
    async ({ permanentID, latitude, longitude, name }) => {
      try {
        // Update user location in database
        await User.findByIdAndUpdate(permanentID, {
          lastLocation: {
            latitude,
            longitude,
            lastUpdated: new Date(),
          },
        });

        console.log(`🛰️ Location from ${name}: ${latitude}, ${longitude}`);

        // Broadcast to all clients
        io.emit("driver-location", {
          driverId: permanentID,
          name: name,
          latitude,
          longitude,
        });
      } catch (error) {
        console.error("Error updating location:", error);
      }
    }
  );

  // Enhanced ride request with database
  // ✅ FIXED: Enhanced ride request with proper database handling
  socket.on("request-ride", async ({ studentId, point }) => {
    try {
      console.log(
        `🔍 Ride request from student: ${studentId} for point: ${point}`
      );

      // Validate point exists
      if (!rideRequests[point]) {
        console.log(`❌ Invalid point: ${point}`);
        socket.emit("request-error", { message: "Invalid pickup point" });
        return;
      }

      // Check if student already has active request in database
      const activeRequest = await RideRequest.findOne({
        student: studentId,
        status: { $in: ["pending", "accepted"] },
      });

      if (activeRequest) {
        console.log(`🚫 Student ${studentId} already has active request`);
        socket.emit("request-error", {
          message: `You already have an active ride request at ${activeRequest.point}`,
        });
        return;
      }

      // Create ride request in database
      const rideRequest = new RideRequest({
        student: studentId,
        point: point,
        status: "pending",
      });

      await rideRequest.save();

      // Update in-memory storage for real-time updates
      if (!rideRequests[point].includes(studentId)) {
        rideRequests[point].push(studentId);
      }

      console.log(`✅ Request stored - Student: ${studentId}, Point: ${point}`);
      console.log(`📊 Current requests at ${point}:`, rideRequests[point]);

      // Notify student of success
      socket.emit("request-success", {
        point,
        requestId: rideRequest._id,
      });

      // Notify all drivers
      io.emit("new-ride-request", {
        studentId,
        point,
        requestId: rideRequest._id,
        requestsCount: rideRequests[point].length,
      });

      // Update point marker tooltip
      io.emit("update-point-requests", {
        point,
        requestsCount: rideRequests[point].length,
      });
    } catch (error) {
      console.error("❌ Error creating ride request:", error);
      socket.emit("request-error", {
        message: "Failed to create ride request",
      });
    }
  });

  // Cancel ride request
  socket.on("cancel-ride-request", async ({ studentId, point }) => {
    try {
      // Update database
      await RideRequest.findOneAndUpdate(
        {
          student: studentId,
          point: point,
          status: "pending",
        },
        {
          status: "cancelled",
          completedAt: new Date(),
        }
      );

      // Update in-memory storage
      const pointRequests = rideRequests[point] || [];
      rideRequests[point] = pointRequests.filter((id) => id !== studentId);

      console.log(
        `❌ Ride request cancelled by student ${studentId} at ${point}`
      );

      socket.emit("request-cancelled");
      io.emit("ride-request-cancelled", { studentId, point });
    } catch (error) {
      console.error("Error cancelling ride request:", error);
    }
  });

  // Accept ride with database update
  socket.on("accept-ride", async ({ driverId, point }) => {
    try {
      const students = rideRequests[point] || [];
      const driver = await User.findById(driverId);

      console.log(
        `✅ Driver ${driver?.name} accepted requests at ${point} for students:`,
        students
      );

      // Update all pending requests for this point
      await RideRequest.updateMany(
        {
          point: point,
          status: "pending",
        },
        {
          status: "accepted",
          driver: driverId,
          acceptedAt: new Date(),
        }
      );

      // Notify students
      students.forEach((studentId) => {
        const studentSocket = activeSockets[studentId];
        if (studentSocket) {
          io.to(studentSocket).emit("ride-accepted", {
            driverName: driver?.name || "Driver",
            point,
          });
        }
      });

      // Clear ride requests for that point
      rideRequests[point] = [];
      io.emit("clear-ride-requests", point);
    } catch (error) {
      console.error("Error accepting ride:", error);
    }
  });

  // Get driver locations from database
  socket.on("get-driver-locations", async () => {
    try {
      // Get online drivers with recent locations
      const onlineDrivers = await User.find({
        role: "driver",
        isOnline: true,
        "lastLocation.lastUpdated": {
          $gte: new Date(Date.now() - 5 * 60 * 1000),
        }, // Last 5 minutes
      });

      onlineDrivers.forEach((driver) => {
        if (driver.lastLocation) {
          socket.emit("driver-location", {
            driverId: driver._id,
            name: driver.name,
            latitude: driver.lastLocation.latitude,
            longitude: driver.lastLocation.longitude,
          });
        }
      });
    } catch (error) {
      console.error("Error getting driver locations:", error);
    }
  });

  socket.on("disconnect", async () => {
    try {
      // Find user by socket ID and mark as offline
      const userId = Object.keys(activeSockets).find(
        (id) => activeSockets[id] === socket.id
      );

      if (userId) {
        // Update user as offline in database
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        delete activeSockets[userId];
        console.log(`❌ User Disconnected: ${userId}`);

        // Notify all clients to remove marker
        io.emit("user-disconnected", userId);
      }
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  });
});

const PORT = process.env.PORT || 5500;

// sudo kill -9 $(sudo lsof -t -i:5500)
