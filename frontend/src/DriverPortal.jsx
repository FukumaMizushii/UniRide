import { useEffect, useRef, useState } from "react";
import socket from "./socket";
import Button from "./button";

const DriverPortal = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const pointMarkersRef = useRef({});
  const [userRole, setUserRole] = useState("driver");
  const [userName, setUserName] = useState("Driver");
  const [savedID, setSavedID] = useState("");
  const [rideRequests, setRideRequests] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);

  const data1 = [
    { title: "IICT", point: "Gate A" },
    { title: "Shah poran Hall", point: "Gate B" },
    { title: "Mujtoba Ali Hall", point: "Library" },
    { title: "Ladies Hall", point: "Hall" },
  ];

  const data2 = [
    { title: "Cafetaria", point: "Gate A" },
    { title: "D-Building", point: "Gate B" },
    { title: "UC Building", point: "Library" },
    { title: "SUST Gate", point: "Hall" },
  ];

  // Initialize user from localStorage
  // Initialize user and location tracking
  useEffect(() => {
    const savedID = localStorage.getItem("user_id") || "driver_" + Date.now();
    const userName = localStorage.getItem("user_name") || "Driver";
    setSavedID(savedID);
    setUserName(userName);
    setUserRole("driver");

    // Register with socket
    socket.emit("register-user", {
      id: savedID,
      name: userName,
      role: "driver",
    });

    console.log("🚗 Driver registered:", { id: savedID, name: userName });

    // Start location tracking
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ latitude, longitude });

          console.log("📍 Sending driver location:", { latitude, longitude });

          socket.emit("send-location", {
            permanentID: savedID,
            latitude: latitude,
            longitude: longitude,
            name: userName,
          });
        },
        (err) => console.error("❌ Location error:", err),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );

      // Cleanup watchPosition on unmount
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

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

      // Initialize ride requests and point markers
      const initialRequests = {};
      fixedPoints.forEach((pt) => {
        initialRequests[pt.name] = 0;

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

  // Add current driver's own marker to map
  useEffect(() => {
    if (!driverLocation || !window.L || !mapInstance.current) return;

    const L = window.L;

    // Create car icon for current driver (blue)
    const currentDriverIcon = L.divIcon({
      html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        background: rgba(59, 130, 246, 0.9);
        border-radius: 50%;
        width: 45px;
        height: 45px;
        border: 3px solid white;
      ">
        🚗
      </div>
    `,
      className: "current-driver-marker",
      iconSize: [45, 45],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });

    // Remove existing current driver marker if any
    if (markersRef.current.currentDriver) {
      mapInstance.current.removeLayer(markersRef.current.currentDriver);
    }

    // Add current driver marker
    markersRef.current.currentDriver = L.marker(
      [driverLocation.latitude, driverLocation.longitude],
      {
        icon: currentDriverIcon,
      }
    )
      .addTo(mapInstance.current)
      .bindPopup(
        `
    <div style="text-align: center;">
      <strong>🚗 You (Driver)</strong><br>
      <b>${userName}</b><br>
      ID: ${savedID}
    </div>
  `
      )
      .openPopup();

    // Center map on current driver
    mapInstance.current.setView(
      [driverLocation.latitude, driverLocation.longitude],
      16
    );
  }, [driverLocation, userName, savedID]);

  // Socket Event Handlers
  useEffect(() => {
    // Receive OTHER drivers' locations
    const handleDriverLocation = (data) => {
      const { driverId, latitude, longitude, name } = data;

      // Don't show current driver's own marker
      if (driverId === savedID) return;

      console.log("📍 Received OTHER driver location:", { driverId, name });

      if (!window.L || !mapInstance.current) return;
      const L = window.L;

      // Create car icon for other drivers (different color)
      const otherDriverIcon = L.divIcon({
        html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          background: rgba(34, 197, 94, 0.8);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          border: 3px solid white;
        ">
          🚗
        </div>
      `,
        className: "other-driver-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      if (markersRef.current[driverId]) {
        // Update existing marker
        markersRef.current[driverId].setLatLng([latitude, longitude]);
        console.log("🔄 Updated other driver marker:", driverId);
      } else {
        // Create new marker for other driver
        markersRef.current[driverId] = L.marker([latitude, longitude], {
          icon: otherDriverIcon,
        }).addTo(mapInstance.current).bindPopup(`
        <div style="text-align: center;">
          <strong>🚗 Other Driver</strong><br>
          <b>${name}</b><br>
          ID: ${driverId}
        </div>
      `);

        console.log("✅ Added other driver marker:", driverId);
      }
    };

    // Receive ride requests
    const handleRideRequest = (data) => {
      const { point } = data;
      setRideRequests((prev) => ({
        ...prev,
        [point]: (prev[point] || 0) + 1,
      }));

      // Update tooltip with color coding
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

    // Clear ride requests
    const handleClearRequests = (point) => {
      setRideRequests((prev) => ({
        ...prev,
        [point]: 0,
      }));

      if (pointMarkersRef.current[point]) {
        pointMarkersRef.current[point].setTooltipContent(`
        <div style="color:#000; text-align:center;">
          <strong>${point}</strong><br>
          📍 Requests: <b>0</b>
        </div>
      `);
      }
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
    socket.on("clear-ride-requests", handleClearRequests);
    socket.on("user-disconnected", handleUserDisconnected);

    // Request existing driver locations when component mounts
    socket.emit("get-driver-locations");

    return () => {
      socket.off("driver-location", handleDriverLocation);
      socket.off("new-ride-request", handleRideRequest);
      socket.off("clear-ride-requests", handleClearRequests);
      socket.off("user-disconnected", handleUserDisconnected);
    };
  }, [rideRequests, savedID]);

  // Accept ride function
  const acceptRide = (pointName) => {
    socket.emit("accept-ride", {
      driverId: savedID,
      point: pointName,
    });
    console.log(`Accepted requests at ${pointName}`);
    alert(`✅ You accepted ride requests at ${pointName}`);
  };

  return (
    <div className="mt-5 grid md:grid-cols-[2fr_.5fr_.5fr] grid-cols-1 justify-center rounded-2xl items-center gap-4">
      {/* Stopage points - Left Side */}
      <div className="m-2 grid grid-cols-2 md:grid-cols-1 gap-4 space-y-2 justify-center items-center order-1 md: order-2">
        {data2.map((item, index) => (
          <div
            key={index}
            className="bg-[#00b4d8] p-6 rounded-2xl shadow-blue-400 shadow-2xl flex flex-col justify-center items-center sm:space-y-6 space-y-5"
          >
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <p className="text-sm">
              Requests: <b>{rideRequests[item.point] || 0}</b>
            </p>
            <Button
              messeage="Accept Ride"
              onClick={() => acceptRide(item.point)}
            />
          </div>
        ))}
      </div>

      {/* Interactive Map Section */}
      <div className="flex flex-col justify-center items-center gap-4 m-2 bg-amber-100 h-full rounded-2xl p-6 shadow-2xl order-2 md:order-1">
        <h1 className="text-4xl font-bold font-serif text-center pt-4">
          Driver Portal
        </h1>
        <div
          ref={mapRef}
          className="w-full h-96 rounded-2xl border-2 border-gray-300"
          style={{ minHeight: "700px" }}
        />
        <p className="text-sm text-gray-600">
          📍 Red/Orange points = Ride requests | ✅ Click accept to take rides
        </p>
        <div className="text-sm">
          <p>Driver ID: {savedID}</p>
          <p>Role: {userRole}</p>
          {driverLocation && (
            <p>
              Location: {driverLocation.latitude.toFixed(6)},{" "}
              {driverLocation.longitude.toFixed(6)}
            </p>
          )}
        </div>
      </div>

      {/* Stopage points - Right Side */}
      <div className=' m-2 grid grid-cols-2 md:grid-cols-1 gap-4 space-y-2 justify-center items-center order-3 '>
        {data1.map((item, index) => (
          <div key={index} className="bg-[#00b4d8] p-6 rounded-2xl shadow-blue-400 shadow-2xl flex flex-col justify-center items-center sm:space-y-6 space-y-5">
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <p className="text-sm">
              Requests: <b>{rideRequests[item.point] || 0}</b>
            </p>
            <Button 
              messeage="Accept Ride" 
              onClick={() => acceptRide(item.point)}
            />
          </div>
        ))}
      </div> 
    </div>
  );
};

export default DriverPortal;
