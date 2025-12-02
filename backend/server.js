const path = require("path");
// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
require("dotenv").config({ path: path.resolve(__dirname, envFile) });
// require("dotenv").config({ path: path.resolve(__dirname, ".env") });
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
let MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI && MONGODB_URI.includes("<db_password>")) {
  MONGODB_URI = MONGODB_URI.replace(
    "<db_password>",
    process.env.DB_PASSWORD || ""
  );
}

// Import Models
const User = require("./models/User");
const RideRequest = require("./models/RideRequest");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Fixed points
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

// In-memory storage
const activeSockets = {};
const rideRequests = {};
fixedPoints.forEach((pt) => (rideRequests[pt.name] = []));

// API Routes
app.get("/api/points", (req, res) => {
  res.json(fixedPoints);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "UniRide Backend is running",
    timestamp: new Date().toISOString(),
  });
  // // Open browser console (F12) and run:
  // fetch("http://localhost:5500/api/health")
  //   .then((response) => response.json())
  //   .then((data) => console.log("Backend Health:", data))
  //   .catch((error) => console.error("Health Check Failed:", error));
});

// User Registration
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

    let query = { email };
    if (role === "student" && studentId) {
      query = { $or: [{ email }, { studentId }] };
    } else if (role === "driver" && autoId) {
      query = { $or: [{ email }, { autoId }] };
    }

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

    const user = new User({
      name,
      email,
      password,
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
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log("🔐 Login attempt:", { email, role });

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.role !== role) {
      console.log("❌ Role mismatch:", user.role, "!=", role);
      return res.status(400).json({
        success: false,
        message: `Invalid credentials for ${role} role`,
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log("❌ Invalid password for:", email);
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

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
    Object.keys(rideRequests).forEach((point) => {
      rideRequests[point] = [];
    });
    res.json({ success: true, message: "All users and ride requests cleared" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's current ride status
app.get("/api/user/ride-status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const activeRequest = await RideRequest.findOne({
      student: userId,
      status: { $in: ["pending", "accepted"] },
    }).populate("driver", "name");

    const driver = await User.findById(userId);
    let driverStatus = null;
    if (driver && driver.role === "driver") {
      driverStatus = {
        availableSeats: driver.availableSeats,
        capacity: driver.capacity,
        currentRides: driver.currentRides.length,
      };
    }

    res.json({
      success: true,
      activeRequest: activeRequest
        ? {
            id: activeRequest._id,
            point: activeRequest.point,
            status: activeRequest.status,
            driverName: activeRequest.driver?.name,
            acceptedAt: activeRequest.acceptedAt,
          }
        : null,
      driverStatus,
    });
  } catch (error) {
    console.error("Error fetching ride status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get driver's current state
app.get("/api/driver/status/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== "driver") {
      return res
        .status(404)
        .json({ success: false, message: "Driver not found" });
    }

    const currentRides = await RideRequest.find({
      driver: driverId,
      status: "accepted",
    }).populate("student", "name");

    res.json({
      success: true,
      driver: {
        id: driver._id,
        name: driver.name,
        availableSeats: driver.availableSeats,
        capacity: driver.capacity,
        currentRides: currentRides.map((ride) => ({
          id: ride._id,
          studentName: ride.student.name,
          point: ride.point,
          acceptedAt: ride.acceptedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching driver status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all active ride requests for points
app.get("/api/ride-requests/active", async (req, res) => {
  try {
    const activeRequests = await RideRequest.aggregate([
      { $match: { status: "pending" } },
      {
        $group: {
          _id: "$point",
          count: { $sum: 1 },
          requests: {
            $push: {
              studentId: "$student",
              requestId: "$_id",
              requestOrder: "$requestOrder",
            },
          },
        },
      },
    ]);

    const formattedRequests = {};
    activeRequests.forEach((item) => {
      formattedRequests[item._id] = item.count;
    });

    res.json({
      success: true,
      requests: formattedRequests,
      detailed: activeRequests,
    });
  } catch (error) {
    console.error("Error fetching active requests:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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

        // Get FRESH driver data including current seat count
        const driver = await User.findById(permanentID);
        const availableSeats = driver?.availableSeats || 6;
        const capacity = driver?.capacity || 6;

        console.log(
          `🛰️ Location from ${name}: ${latitude}, ${longitude}, Seats: ${availableSeats}/${capacity}`
        );

        // Broadcast to all clients with current capacity info
        io.emit("driver-location", {
          driverId: permanentID,
          name: name,
          latitude,
          longitude,
          availableSeats: availableSeats,
          capacity: capacity,
        });
      } catch (error) {
        console.error("Error updating location:", error);
      }
    }
  );

  // Enhanced ride request with database
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

      // Get request order for this point
      const lastRequest = await RideRequest.findOne({
        point,
        status: "pending",
      }).sort({ requestOrder: -1 });

      const requestOrder = (lastRequest?.requestOrder || 0) + 1;

      // Create ride request in database
      const rideRequest = new RideRequest({
        student: studentId,
        point: point,
        status: "pending",
        requestOrder: requestOrder,
      });

      await rideRequest.save();

      // Update in-memory storage for real-time updates
      if (!rideRequests[point].includes(studentId)) {
        rideRequests[point].push(studentId);
      }

      console.log(
        `✅ Request stored - Student: ${studentId}, Point: ${point}, Order: ${requestOrder}`
      );
      console.log(`📊 Current requests at ${point}:`, rideRequests[point]);

      // Notify student of success
      socket.emit("request-success", {
        point,
        requestId: rideRequest._id,
        requestOrder,
      });

      // Notify all drivers
      io.emit("new-ride-request", {
        studentId,
        point,
        requestId: rideRequest._id,
        requestsCount: rideRequests[point].length,
        requestOrder,
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

  // Update the cancel-ride-request handler
  socket.on("cancel-ride-request", async ({ studentId, point }) => {
    try {
      console.log(
        `❌ Cancelling ride request for student ${studentId} at ${point}`
      );

      // Find the ride request
      const rideRequest = await RideRequest.findOne({
        student: studentId,
        point: point,
        status: "pending",
      });

      if (rideRequest) {
        // DELETE the ride request document
        await RideRequest.findByIdAndDelete(rideRequest._id);

        // 🔥 FIX: Properly update in-memory storage
        const pointRequests = rideRequests[point] || [];
        const updatedRequests = pointRequests.filter((id) => id !== studentId);
        rideRequests[point] = updatedRequests;

        console.log(
          `✅ Ride request cancelled and deleted for student ${studentId} at ${point}`
        );
        console.log(`📊 Updated requests at ${point}:`, updatedRequests);

        // Notify student
        socket.emit("request-cancelled", {
          message: "Ride request cancelled successfully",
          canBookAgain: true,
        });

        // 🔥 FIX: Notify all about the update with proper count
        io.emit("ride-request-cancelled", {
          studentId,
          point,
          requestsCount: updatedRequests.length,
        });

        // Update point marker tooltip
        io.emit("update-point-requests", {
          point,
          requestsCount: updatedRequests.length,
        });
      } else {
        console.log(`❌ No pending ride request found to cancel`);
        socket.emit("request-cancelled", {
          message: "No active ride request found",
          canBookAgain: true,
        });
      }
    } catch (error) {
      console.error("Error cancelling ride request:", error);
      socket.emit("request-error", {
        message: "Failed to cancel ride request",
      });
    }
  });

  // Update the complete-ride handler to also update ride requests
  socket.on("complete-ride", async ({ studentId, requestId }) => {
    try {
      console.log(
        `🔚 Completing ride for student ${studentId}, request ${requestId}`
      );

      const rideRequest = await RideRequest.findOne({
        _id: requestId,
        student: studentId,
        status: "accepted",
      }).populate("driver");

      if (rideRequest && rideRequest.driver) {
        // Get current driver data
        const driver = await User.findById(rideRequest.driver._id);

        console.log(
          `📊 Driver ${driver.name} seats before completion: ${driver.availableSeats}`
        );

        // Free up a seat for the driver
        const newAvailableSeats = driver.availableSeats + 1;
        await User.findByIdAndUpdate(rideRequest.driver._id, {
          availableSeats: newAvailableSeats,
        });

        console.log(
          `📊 Driver ${driver.name} seats after completion: ${newAvailableSeats}`
        );
        console.log(`✅ Ride completed for student ${studentId}`);

        // DELETE the ride request document
        await RideRequest.findByIdAndDelete(requestId);

        // Notify student
        socket.emit("ride-completed", {
          message: "Ride completed successfully!",
          canBookAgain: true,
        });

        // Notify driver about seat availability with fresh data
        const driverSocket = activeSockets[rideRequest.driver._id];
        if (driverSocket) {
          const updatedDriver = await User.findById(rideRequest.driver._id);
          io.to(driverSocket).emit("seat-freed", {
            availableSeats: updatedDriver.availableSeats,
          });

          // Also update driver location with new seat count
          if (updatedDriver.lastLocation) {
            io.to(driverSocket).emit("driver-location", {
              driverId: updatedDriver._id,
              name: updatedDriver.name,
              latitude: updatedDriver.lastLocation.latitude,
              longitude: updatedDriver.lastLocation.longitude,
              availableSeats: updatedDriver.availableSeats,
              capacity: updatedDriver.capacity,
            });
          }
        }

        console.log(`🗑️ Ride request ${requestId} deleted from database`);
      } else {
        console.log(`❌ Ride request not found or already completed`);
        socket.emit("ride-completion-error", {
          message: "Ride request not found",
        });
      }
    } catch (error) {
      console.error("Error completing ride:", error);
      socket.emit("ride-completion-error", {
        message: "Failed to complete ride",
      });
    }
  });

  // Add a new socket event to handle point request updates
  socket.on("update-point-requests-manual", async ({ point }) => {
    try {
      // Get current count from database
      const pendingCount = await RideRequest.countDocuments({
        point: point,
        status: "pending",
      });

      // Update in-memory storage
      rideRequests[point] = Array(pendingCount)
        .fill()
        .map((_, i) => `temp_${i}`); // Temporary IDs for count

      console.log(`🔄 Manually updated requests for ${point}: ${pendingCount}`);

      // Notify all clients
      io.emit("update-point-requests", {
        point,
        requestsCount: pendingCount,
      });
    } catch (error) {
      console.error("Error updating point requests:", error);
    }
  });

  // Enhanced accept-ride handler with proper seat calculation
  socket.on("accept-ride", async ({ driverId, point }) => {
    try {
      console.log(
        `🚗 Driver ${driverId} attempting to accept rides at ${point}`
      );

      const driver = await User.findById(driverId);

      if (!driver) {
        console.log(`❌ Driver not found: ${driverId}`);
        return;
      }

      console.log(
        `📊 Driver ${driver.name} current seats: ${driver.availableSeats}/${driver.capacity}`
      );

      // Check if driver has available seats
      if (driver.availableSeats <= 0) {
        console.log(`🚫 Driver ${driverId} has no available seats`);
        socket.emit("no-seats-available", {
          message: "No available seats. Please complete current rides first.",
        });
        return;
      }

      // Get pending requests for this point, ordered by request order
      const pendingRequests = await RideRequest.find({
        point: point,
        status: "pending",
      })
        .populate("student")
        .sort({ requestOrder: 1 })
        .limit(driver.availableSeats);

      const students = pendingRequests.map((req) => req.student._id.toString());
      const acceptedRequestIds = pendingRequests.map((req) =>
        req._id.toString()
      );

      console.log(
        `✅ Driver ${driver.name} accepting ${acceptedRequestIds.length} requests at ${point}`
      );
      console.log(`📊 Available seats before: ${driver.availableSeats}`);

      if (acceptedRequestIds.length > 0) {
        // Calculate new available seats
        const newAvailableSeats =
          driver.availableSeats - acceptedRequestIds.length;
        console.log(`📊 Available seats after: ${newAvailableSeats}`);

        // Update accepted requests status
        const updateResult = await RideRequest.updateMany(
          {
            _id: { $in: acceptedRequestIds },
          },
          {
            status: "accepted",
            driver: driverId,
            acceptedAt: new Date(),
          }
        );

        console.log(`📝 Updated ${updateResult.modifiedCount} ride requests`);

        // Update driver's available seats
        const updatedDriver = await User.findByIdAndUpdate(
          driverId,
          {
            availableSeats: newAvailableSeats,
            $push: { currentRides: { $each: acceptedRequestIds } },
          },
          { new: true } // Return the updated document
        );

        console.log(
          `🔄 Driver ${driver.name} seats updated to: ${updatedDriver.availableSeats}`
        );

        // Notify accepted students
        acceptedRequestIds.forEach((requestId, index) => {
          const studentReq = pendingRequests[index];
          const studentSocket = activeSockets[studentReq.student._id];
          if (studentSocket) {
            io.to(studentSocket).emit("ride-accepted", {
              driverName: driver.name,
              point,
              requestId: requestId,
              seatNumber: driver.capacity - newAvailableSeats + index,
            });
          }
        });

        // Update in-memory storage
        rideRequests[point] = rideRequests[point].filter(
          (id) => !students.includes(id)
        );

        // Get fresh driver data for broadcast
        const currentDriver = await User.findById(driverId);

        // Notify all about the update with CORRECT seat count
        io.emit("ride-requests-updated", {
          point,
          requestsCount: rideRequests[point].length,
          acceptedCount: acceptedRequestIds.length,
          driverId: driverId,
          driverSeats: currentDriver.availableSeats,
        });

        // Broadcast updated driver location with correct seat count
        if (driver.lastLocation) {
          io.emit("driver-location", {
            driverId: driverId,
            name: driver.name,
            latitude: driver.lastLocation.latitude,
            longitude: driver.lastLocation.longitude,
            availableSeats: currentDriver.availableSeats,
            capacity: driver.capacity,
          });
        }

        console.log(
          `✅ Accepted ${acceptedRequestIds.length} rides for driver ${driverId}`
        );
        console.log(
          `📊 Final driver seats: ${currentDriver.availableSeats}/${driver.capacity}`
        );
      } else {
        console.log(`ℹ️ No pending requests to accept at ${point}`);
        socket.emit("no-requests-available", {
          message: "No pending ride requests at this point.",
        });
      }
    } catch (error) {
      console.error("❌ Error accepting ride:", error);
      socket.emit("accept-ride-error", {
        message: "Failed to accept rides",
      });
    }
  });

  // Get driver locations with capacity info
  socket.on("get-driver-locations", async () => {
    try {
      // Get online drivers with recent locations
      const onlineDrivers = await User.find({
        role: "driver",
        isOnline: true,
        "lastLocation.lastUpdated": {
          $gte: new Date(Date.now() - 5 * 60 * 1000),
        },
      });

      onlineDrivers.forEach((driver) => {
        if (driver.lastLocation) {
          socket.emit("driver-location", {
            driverId: driver._id,
            name: driver.name,
            latitude: driver.lastLocation.latitude,
            longitude: driver.lastLocation.longitude,
            availableSeats: driver.availableSeats,
            capacity: driver.capacity,
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

// Production settings
const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 5500;

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    server.listen(PORT, () => {
      console.log(`🚀 Backend Server running at http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready for connections`);
      console.log(`🗄️  MongoDB connected: ✅`);
      console.log(
        `🌐 Environment: ${isProduction ? "Production" : "Development"}`
      );
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// sudo kill -9 $(sudo lsof -t -i:5500)
{/* <svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 640 640"
     style="transform: rotate(300deg); fill: red;">
  <path d="M541.9 139.5C546.4 127.7 543.6 114.3 534.7 105.4C525.8 96.5 512.4 93.6 500.6 98.2L84.6 258.2C71.9 263 63.7 275.2 64 288.7C64.3 302.2 73.1 314.1 85.9 318.3L262.7 377.2L321.6 554C325.9 566.8 337.7 575.6 351.2 575.9C364.7 576.2 376.9 568 381.8 555.4L541.8 139.4z"/>
</svg> */}
