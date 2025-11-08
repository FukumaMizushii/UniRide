import { useEffect, useRef, useState } from "react";
import socket from "./socket";
import Button from "./button";

const MapSec = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const pointMarkersRef = useRef({});
  const [userRole, setUserRole] = useState("student");
  const [userName, setUserName] = useState("Student");
  const [savedID, setSavedID] = useState("");
  const [rideRequests, setRideRequests] = useState({});

  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [currentRequestPoint, setCurrentRequestPoint] = useState(null);
  const [requestError, setRequestError] = useState("");

  const data1 = [
    {
      title: "IICT",
      description: "Available Auto : 3",
      buttonText: "Book Now !",
      point: "Gate A",
    },
    {
      title: "Shah poran Hall",
      description: "Available Auto : 5",
      buttonText: "Book Now !",
      point: "Gate B",
    },
    {
      title: "Mujtoba Ali Hall",
      description: "Available Auto : 2",
      buttonText: "Book Now !",
      point: "Library",
    },
    {
      title: "Ladies Hall",
      description: "Available Auto : 4",
      buttonText: "Book Now !",
      point: "Hall",
    },
  ];

  const data2 = [
    {
      title: "Cafetaria",
      description: "Available Auto : 4",
      buttonText: "Book Now !",
      point: "Gate A",
    },
    {
      title: "D-Building",
      description: "Available Auto : 4",
      buttonText: "Book Now !",
      point: "Gate B",
    },
    {
      title: "UC Building",
      description: "Available Auto : 4",
      buttonText: "Book Now !",
      point: "Library",
    },
    {
      title: "SUST Gate",
      description: "Available Auto : 4",
      buttonText: "Book Now !",
      point: "Hall",
    },
  ];

  // Initialize user from localStorage
  // Initialize user from localStorage
  useEffect(() => {
    // 🆕 FIX: Use consistent student ID
    let savedID = localStorage.getItem("user_id");
    let userName = localStorage.getItem("user_name");

    if (!savedID) {
      // Only create new ID if it doesn't exist
      savedID = "student_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("user_id", savedID);
    }

    if (!userName) {
      userName = "Student";
      localStorage.setItem("user_name", userName);
    }

    setSavedID(savedID);
    setUserName(userName);
    setUserRole("student");

    console.log("🎯 Student initialized with ID:", savedID);

    // Register with socket
    socket.emit("register-user", {
      id: savedID,
      name: userName,
      role: "student",
    });
  }, []);

  // Request ride function
  const requestRide = (pointName) => {
    if (hasActiveRequest) {
      setRequestError(
        `You already have an active request at ${currentRequestPoint}`
      );
      return;
    }

    socket.emit("request-ride", {
      studentId: savedID,
      point: pointName,
    });
  };

  const cancelRequest = () => {
    if (hasActiveRequest && currentRequestPoint) {
      socket.emit("cancel-ride-request", {
        studentId: savedID,
        point: currentRequestPoint,
      });
    }
  };

  // Initialize Map
  useEffect(() => {
    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Define boundary points
      const topLeft = [24.912361403380515, 91.83300018310548];
      const bottomRight = [24.90477133957499, 91.84327840805054];
      const center = [24.9085384, 91.8374471];

      // Create bounds and initialize map
      const bounds = L.latLngBounds([topLeft, bottomRight]);
      mapInstance.current = L.map(mapRef.current).setView(center, 16);

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap",
      }).addTo(mapInstance.current);

      // Apply bounds restrictions
      mapInstance.current.fitBounds(bounds);
      mapInstance.current.setMaxBounds(bounds);
      mapInstance.current.setMinZoom(15);

      // Fixed points
      const fixedPoints = [
        { name: "Gate A", coords: [24.912361403380515, 91.83300018310548] },
        { name: "Gate B", coords: [24.904868651039813, 91.83233499526979] },
        { name: "Library", coords: [24.912147331056858, 91.84336423873903] },
        { name: "Hall", coords: [24.90477133957499, 91.84327840805054] },
      ];

      // Initialize ride requests
      const initialRequests = {};
      fixedPoints.forEach((pt) => {
        initialRequests[pt.name] = 0;

        // Create custom icon for points
        const customIcon = L.divIcon({
          html: `
            <div style="
              position: relative;
              width: 60px;
              height: 60px;
            ">
              <div style="
                position: absolute;
                width: 60px;
                height: 60px;
                background: #dc2626;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                top: 0;
                left: 0;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              ">
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(45deg);
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: #fbbf24;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: 12px;
                ">📍</div>
              </div>
            </div>
          `,
          className: "custom-marker-icon",
          iconSize: [60, 60],
          iconAnchor: [30, 60],
          popupAnchor: [0, -60],
        });

        pointMarkersRef.current[pt.name] = L.marker(pt.coords, {
          icon: customIcon,
        })
          .addTo(mapInstance.current)
          .bindTooltip(`${pt.name}<br>Requests: 0`, {
            permanent: true,
            direction: "top",
            offset: [0, -10],
          })
          .openTooltip();
      });

      setRideRequests(initialRequests);
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  // Socket Event Handlers
  useEffect(() => {
    // Receive driver locations
    const handleDriverLocation = (data) => {
      const { driverId, latitude, longitude, name } = data;
      console.log("📍 Received driver location:", {
        driverId,
        latitude,
        longitude,
        name,
      });

      if (!window.L || !mapInstance.current) return;

      const L = window.L;

      // Create car icon for drivers
      const carIcon = L.divIcon({
        html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          background: rgba(59, 130, 246, 0.8);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          border: 3px solid white;
        ">
          🚗
        </div>
      `,
        className: "car-marker-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      if (markersRef.current[driverId]) {
        // Update existing marker
        markersRef.current[driverId].setLatLng([latitude, longitude]);
        console.log("🔄 Updated driver marker:", driverId);
      } else {
        // Create new marker
        markersRef.current[driverId] = L.marker([latitude, longitude], {
          icon: carIcon,
        }).addTo(mapInstance.current).bindPopup(`
        <div style="text-align: center;">
          <strong>🚗 Driver</strong><br>
          <b>${name}</b><br>
          ID: ${driverId}
        </div>
      `);

        console.log("✅ Added new driver marker:", driverId);
      }
    };

    // Receive ride requests updates
    const handleRideRequest = (data) => {
      const { point } = data;
      setRideRequests((prev) => ({
        ...prev,
        [point]: (prev[point] || 0) + 1,
      }));

      // Update tooltip
      if (pointMarkersRef.current[point]) {
        const requestsCount = (rideRequests[point] || 0) + 1;
        let color = "#000";
        if (requestsCount >= 3) color = "#dc2626";
        else if (requestsCount >= 1) color = "#ea580c";

        pointMarkersRef.current[point].setTooltipContent(`
        <div style="color:${color}; text-align:center;">
          <strong>${point}</strong><br>
          📍 Requests: <b>${requestsCount}</b>
        </div>
      `);
      }
    };

    // NEW: Request successful
    const handleRequestSuccess = (data) => {
      setHasActiveRequest(true);
      setCurrentRequestPoint(data.point);
      setRequestError("");
      alert(`✅ Ride requested at ${data.point}! Waiting for driver...`);
    };

    // NEW: Request failed (already has active request)
    const handleRequestError = (data) => {
      setRequestError(data.message);
      alert(`❌ ${data.message}`);
    };

    // Ride accepted notification - UPDATED
    const handleRideAccepted = (data) => {
      setHasActiveRequest(false);
      setCurrentRequestPoint(null);
      setRequestError("");
      alert(`🚗 Driver ${data.driverName} accepted your ride at ${data.point}`);

      // Reset requests for that point
      setRideRequests((prev) => ({
        ...prev,
        [data.point]: 0,
      }));

      if (pointMarkersRef.current[data.point]) {
        pointMarkersRef.current[data.point].setTooltipContent(`
        <div style="color:#000; text-align:center;">
          <strong>${data.point}</strong><br>
          📍 Requests: <b>0</b>
        </div>
      `);
      }
    };

    // NEW: Request cancelled
    const handleRequestCancelled = () => {
      setHasActiveRequest(false);
      setCurrentRequestPoint(null);
      setRequestError("");
      alert("❌ Ride request cancelled");
    };

    // User disconnected
    const handleUserDisconnected = (userId) => {
      if (markersRef.current[userId] && mapInstance.current) {
        mapInstance.current.removeLayer(markersRef.current[userId]);
        delete markersRef.current[userId];
        console.log("🗑️ Removed driver marker:", userId);
      }
    };

    // Register event listeners
    socket.on("driver-location", handleDriverLocation);
    socket.on("new-ride-request", handleRideRequest);
    socket.on("ride-accepted", handleRideAccepted);
    socket.on("user-disconnected", handleUserDisconnected);

    // NEW: Register the new event listeners
    socket.on("request-success", handleRequestSuccess);
    socket.on("request-error", handleRequestError);
    socket.on("request-cancelled", handleRequestCancelled);

    // Request existing driver locations
    socket.emit("get-driver-locations");

    return () => {
      socket.off("driver-location", handleDriverLocation);
      socket.off("new-ride-request", handleRideRequest);
      socket.off("ride-accepted", handleRideAccepted);
      socket.on("user-disconnected", handleUserDisconnected);

      // NEW: Clean up the new event listeners
      socket.off("request-success", handleRequestSuccess);
      socket.off("request-error", handleRequestError);
      socket.off("request-cancelled", handleRequestCancelled);
    };
  }, [rideRequests]);

  // Add this useEffect to track socket connections
  useEffect(() => {
    const handleConnect = () => {
      console.log("🔗 Socket connected:", socket.id);
    };

    const handleDisconnect = () => {
      console.log("🔌 Socket disconnected");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return (
    <div className="mt-5 grid md:grid-cols-[2fr_0.5fr_0.5fr] grid-cols-1 justify-center rounded-2xl items-center gap-4">
      {/* NEW: Error Display - Full width at top */}
      {requestError && (
        <div className="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 mx-4">
          <div className="flex items-center">
            <span className="mr-2">❌</span>
            {requestError}
          </div>
        </div>
      )}

      {/* NEW: Active Request Banner - Full width at top */}
      {hasActiveRequest && (
        <div className="col-span-full bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 mx-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="mr-2">🚗</span>
              <span>
                Active ride request at <strong>{currentRequestPoint}</strong>
              </span>
            </div>
            <button
              onClick={cancelRequest}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}

       {/* Stopage points - Left Side */}
      <div className="m-2 grid grid-cols-2 md:grid-cols-1 gap-4 space-y-2 justify-center items-center order-1 md:order-2">
        {data2.map((item, index) => (
          <div
            key={index}
            className="bg-[#00b4d8] p-6 rounded-2xl shadow-blue-400 shadow-2xl flex flex-col justify-center items-center sm:space-y-6 space-y-5"
          >
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <p className="text-sm">{item.description}</p>
            <Button
              messeage={
                hasActiveRequest && currentRequestPoint === item.point
                  ? "Requested ✅"
                  : hasActiveRequest
                  ? "Already Requested"
                  : item.buttonText
              }
              onClick={() => requestRide(item.point)}
              disabled={hasActiveRequest}
            />
          </div>
        ))}
      </div>

      {/* Interactive Map Section */}
      <div className="flex flex-col justify-center items-center gap-4 m-2 bg-amber-100 h-full rounded-2xl p-6 shadow-2xl order-2 md:order-1">
        <h1 className="text-4xl font-bold font-serif text-center pt-4">
          Student Portal
        </h1>
        <div
          ref={mapRef}
          className="w-full h-96 rounded-2xl border-2 border-gray-300"
          style={{ minHeight: "600px" }}
        />
        <p className="text-sm text-gray-600">
          🚗 See driver locations in real-time | 📍 Click points to request
          rides
        </p>

        {/* NEW: Debug Info */}
        <div className="text-sm bg-white p-3 rounded-lg border w-full">
          <p>
            <strong>Status:</strong>
          </p>
          <p>Student ID: {savedID}</p>
          <p>Role: {userRole}</p>
          <p>
            Active Request:{" "}
            {hasActiveRequest ? `Yes (${currentRequestPoint})` : "No"}
          </p>
          <p>Socket: {socket.connected ? "✅ Connected" : "❌ Disconnected"}</p>
        </div>
      </div>

     

      {/* Stopage points - Right Side */}
      <div className="m-2 grid grid-cols-2 md:grid-cols-1 gap-4 space-y-2 justify-center items-center order-3">
        {data1.map((item, index) => (
          <div
            key={index}
            className="bg-[#00b4d8] p-6 rounded-2xl shadow-blue-400 shadow-2xl flex flex-col justify-center items-center sm:space-y-6 space-y-5"
          >
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <p className="text-sm">{item.description}</p>
            <Button
              messeage={
                hasActiveRequest && currentRequestPoint === item.point
                  ? "Requested ✅"
                  : hasActiveRequest
                  ? "Already Requested"
                  : item.buttonText
              }
              onClick={() => requestRide(item.point)}
              disabled={hasActiveRequest}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapSec;