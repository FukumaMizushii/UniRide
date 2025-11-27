import { useEffect, useRef, useState } from "react";
import socket from "./socket";
import Button from "./button";
import { icon } from "leaflet";
import gate from "./assets/sust-gate.jpg";
import audi from "./assets/audi.jpg";
import iict from "./assets/iict.jpg";
import chetona71 from "./assets/chetona71.jpg";
import eBuilding from "./assets/e-building.jpg";
import shahHall from "./assets/shah-paran-hall.jpg";
import mujtobaHall from "./assets/mujtoba-hall.jpg";
import ladiesHall from "./assets/ladies-hall.jpg";

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
    {
      title: "Central Auditorium",
      point: "Central Auditorium", 
    },
    {
      title: "Shah Paran Hall",
      point: "Shah Paran Hall", 
    },
    {
      title: "Mujtoba Ali Hall",
      point: "Mujtoba Ali Hall", 
    },
    {
      title: "Ladies Hall",
      point: "Ladies Hall", 
    },
  ];

  const data2 = [
    {
      title: "SUST Gate",
      point: "Sust Gate", 
    },
    {
      title: "IICT",
      point: "IICT", 
    },
    {
      title: "Chetona 71",
      point: "Chetona 71", 
    },
    {
      title: "E-Building",
      point: "E Building", 
    },
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
      // const topLeft = [24.912361403380515, 91.83300018310548];
      // const topLeft = [24.932424169029986, 91.80828094482423];
      // const bottomRight = [24.90909189467807, 91.85707569122316];
      const topLeft = [24.948398100077377, 91.79677963256837];
      const bottomRight = [24.896402266558727, 91.86355590820314];
      const center = [24.921079669610492, 91.83162689208986];

      // Create bounds and initialize map
      const bounds = L.latLngBounds([topLeft, bottomRight]);
      mapInstance.current = L.map(mapRef.current).setView(center, 16);

      // Add tile layer
      // L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      //   attribution: "OpenStreetMap",
      // }).addTo(mapInstance.current);

      L.tileLayer("https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png", {
        attribution: "© Wikimedia",
      }).addTo(mapInstance.current);

      // Apply bounds restrictions
      mapInstance.current.fitBounds(bounds);
      // mapInstance.current.setMaxBounds(bounds);
      // mapInstance.current.setMinZoom(15);

      // Fixed points
      const fixedPoints = [
        {
          name: "Sust Gate",
          coords: [24.911135347770895, 91.83223843574525],
          iconUrl: gate,
        },
        {
          name: "IICT",
          coords: [24.91813148559637, 91.83094024658205],
          iconUrl: iict,
        },
        {
          name: "Chetona 71",
          coords: [24.92066614969974, 91.8324798345566],
          iconUrl: chetona71,
        },
        {
          name: "E Building",
          coords: [24.92036938749737, 91.83409452438356],
          iconUrl: eBuilding,
        },
        {
          name: "Central Auditorium",
          coords: [24.924105620167428, 91.83254957199098],
          iconUrl: audi,
        },
        {
          name: "Shah Paran Hall",
          coords: [24.924747773756355, 91.83506011962892],
          iconUrl: shahHall,
        },
        {
          name: "Mujtoba Ali Hall",
          coords: [24.92650881416285, 91.83562874794006],
          iconUrl: mujtobaHall,
        },
        {
          name: "Ladies Hall",
          coords: [24.92236400496206, 91.8292772769928],
          iconUrl: ladiesHall,
        },
      ];

      // Initialize ride requests and point markers
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
                background-image: url('${pt.iconUrl}');
                background-size: cover;
                background-position: center;
              "></div>
              </div>
            </div>
          `,
          className: "custom-marker-icon",
          iconSize: [60, 60],
          iconAnchor: [30, 60],
          popupAnchor: [0, -40],
        });

        pointMarkersRef.current[pt.name] = L.marker(pt.coords, {
          icon: customIcon,
        })
          .addTo(mapInstance.current)
          .bindTooltip(
            `              <div style="
                font-weight: bold;
                text-align: center;
              ">
                <span style="color: red">${pt.name}</span><br>
                <span style="color: black">Requests: 0</span>
              </div>`,
            {
              permanent: true,
              direction: "top",
              offset: [0, -60],
            }
          )
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
        align-items: end;
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
      ID: ${savedID}
      </div>
      `
      )
      .openPopup();
      // <b>${userName}</b><br>

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
          align-items: end;
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
          ID: ${driverId}
          </div>
          `);
          // <b>${name}</b><br>

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
        <div style="color:red; text-align:center; font-weight:bold;">
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
    alert(`✅ You set ${pointName} as your next stopage!`);
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
              messeage="Set as next stopage"
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
      <div className=" m-2 grid grid-cols-2 md:grid-cols-1 gap-4 space-y-2 justify-center items-center order-3 ">
        {data1.map((item, index) => (
          <div
            key={index}
            className="bg-[#00b4d8] p-6 rounded-2xl shadow-blue-400 shadow-2xl flex flex-col justify-center items-center sm:space-y-6 space-y-5"
          >
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <p className="text-sm">
              Requests: <b>{rideRequests[item.point] || 0}</b>
            </p>
            <Button
              messeage="Set as next stopage"
              onClick={() => acceptRide(item.point)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverPortal;
