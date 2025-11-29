import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";
import Button from "./button";
import gate from "./assets/sust-gate.jpg";
import audi from "./assets/audi.jpg";
import iict from "./assets/iict.jpg";
import chetona71 from "./assets/chetona71.jpg";
import eBuilding from "./assets/e-building.jpg";
import shahHall from "./assets/shah-paran-hall.jpg";
import mujtobaHall from "./assets/mujtoba-hall.jpg";
import ladiesHall from "./assets/ladies-hall.jpg";

const DriverPortal = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const pointMarkersRef = useRef({});
  
  // State from database
  const [user, setUser] = useState(null);
  const [rideRequests, setRideRequests] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(6);

  const allPoints = [
    { title: "SUST Gate", point: "Sust Gate", category: "gate" },
    { title: "IICT", point: "IICT", category: "academic" },
    { title: "Chetona 71", point: "Chetona 71", category: "landmark" },
    { title: "E-Building", point: "E Building", category: "academic" },
    { title: "Central Auditorium", point: "Central Auditorium", category: "auditorium" },
    { title: "Shah Paran Hall", point: "Shah Paran Hall", category: "hall" },
    { title: "Mujtoba Ali Hall", point: "Mujtoba Ali Hall", category: "hall" },
    { title: "Ladies Hall", point: "Ladies Hall", category: "hall" },
  ];

  // Check authentication and redirect if not logged in
  useEffect(() => {
    const userData = {
      id: localStorage.getItem("user_id"),
      name: localStorage.getItem("user_name"),
      role: localStorage.getItem("user_role"),
      autoId: localStorage.getItem("auto_id")
    };

    if (!userData.id || userData.role !== 'driver') {
      navigate("/driver");
      return;
    }

    setUser(userData);

    // Register with socket using database ID
    socket.emit("register-user", {
      id: userData.id,
      name: userData.name,
      role: userData.role,
    });

    console.log("🚗 Driver registered from database:", userData);
  }, [navigate]);

  // Initialize user and location tracking
  useEffect(() => {
    if (!user) return;

    // Start location tracking
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ latitude, longitude });

          socket.emit("send-location", {
            permanentID: user.id,
            latitude: latitude,
            longitude: longitude,
            name: user.name,
          });
        },
        (err) => console.error("❌ Location error:", err),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user]);

  // Initialize Map (same as before, but with enhanced tooltips)
  useEffect(() => {
    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const topLeft = [24.948398100077377, 91.79677963256837];
      const bottomRight = [24.896402266558727, 91.86355590820314];
      const center = [24.921079669610492, 91.83162689208986];

      const bounds = L.latLngBounds([topLeft, bottomRight]);
      mapInstance.current = L.map(mapRef.current).setView(center, 16);

      L.tileLayer("https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png", {
        attribution: "© Wikimedia",
      }).addTo(mapInstance.current);

      mapInstance.current.fitBounds(bounds);

      const fixedPoints = [
        { name: "Sust Gate", coords: [24.911135347770895, 91.83223843574525], iconUrl: gate },
        { name: "IICT", coords: [24.91813148559637, 91.83094024658205], iconUrl: iict },
        { name: "Chetona 71", coords: [24.92066614969974, 91.8324798345566], iconUrl: chetona71 },
        { name: "E Building", coords: [24.92036938749737, 91.83409452438356], iconUrl: eBuilding },
        { name: "Central Auditorium", coords: [24.924105620167428, 91.83254957199098], iconUrl: audi },
        { name: "Shah Paran Hall", coords: [24.924747773756355, 91.83506011962892], iconUrl: shahHall },
        { name: "Mujtoba Ali Hall", coords: [24.92650881416285, 91.83562874794006], iconUrl: mujtobaHall },
        { name: "Ladies Hall", coords: [24.92236400496206, 91.8292772769928], iconUrl: ladiesHall },
      ];

      const initialRequests = {};
      fixedPoints.forEach((pt) => {
        initialRequests[pt.name] = 0;

        const customIcon = L.divIcon({
          html: `
            <div style="position: relative; width: 60px; height: 60px;">
              <div style="position: absolute; width: 60px; height: 60px; background: #dc2626; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); top: 0; left: 0; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background-image: url('${pt.iconUrl}'); background-size: cover; background-position: center;"></div>
              </div>
            </div>
          `,
          className: "custom-marker-icon",
          iconSize: [60, 60],
          iconAnchor: [30, 60],
          popupAnchor: [0, -40],
        });

        pointMarkersRef.current[pt.name] = L.marker(pt.coords, { icon: customIcon })
          .addTo(mapInstance.current)
          .bindTooltip(
            `<div style="font-weight: bold; text-align: center;">
              <span style="color: red">${pt.name}</span><br>
              <span style="color: black">Requests: 0</span>
            </div>`,
            { permanent: true, direction: "top", offset: [0, -60] }
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

  // Enhanced driver location with capacity info
  useEffect(() => {
    if (!driverLocation || !window.L || !mapInstance.current) return;

    const L = window.L;

    const currentDriverIcon = L.divIcon({
      html: `
      <div style="display: flex; align-items: end; justify-content: center; font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: rgba(59, 130, 246, 0.9); border-radius: 50%; width: 45px; height: 45px; border: 3px solid white;">
        🚗
      </div>
    `,
      className: "current-driver-marker",
      iconSize: [45, 45],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });

    if (markersRef.current.currentDriver) {
      mapInstance.current.removeLayer(markersRef.current.currentDriver);
    }

    markersRef.current.currentDriver = L.marker(
      [driverLocation.latitude, driverLocation.longitude],
      { icon: currentDriverIcon }
    )
      .addTo(mapInstance.current)
      .bindPopup(`
        <div style="text-align: center;">
          <strong>🚗 You (Driver)</strong><br>
          Name: ${user?.name}<br>
          Auto ID: ${user?.autoId}<br>
          Seats: ${availableSeats}/6 available
        </div>
      `)
      .openPopup();

    mapInstance.current.setView([driverLocation.latitude, driverLocation.longitude], 16);
  }, [driverLocation, user, availableSeats]);

  // Socket Event Handlers with capacity management
  useEffect(() => {
    const handleDriverLocation = (data) => {
      const { driverId, latitude, longitude, name, availableSeats, capacity } = data;

      if (driverId === user?.id) return;

      if (!window.L || !mapInstance.current) return;
      const L = window.L;

      const otherDriverIcon = L.divIcon({
        html: `
        <div style="display: flex; align-items: end; justify-content: center; font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: rgba(34, 197, 94, 0.8); border-radius: 50%; width: 40px; height: 40px; border: 3px solid white;">
          🚗
        </div>
      `,
        className: "other-driver-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      if (markersRef.current[driverId]) {
        markersRef.current[driverId].setLatLng([latitude, longitude]);
        markersRef.current[driverId].setPopupContent(`
          <div style="text-align: center;">
            <strong>🚗 Other Driver</strong><br>
            Name: ${name}<br>
            Seats: ${availableSeats}/${capacity} available
          </div>
        `);
      } else {
        markersRef.current[driverId] = L.marker([latitude, longitude], { icon: otherDriverIcon })
          .addTo(mapInstance.current)
          .bindPopup(`
            <div style="text-align: center;">
              <strong>🚗 Other Driver</strong><br>
              Name: ${name}<br>
              Seats: ${availableSeats}/${capacity} available
            </div>
          `);
      }
    };

    const handleRideRequest = (data) => {
      const { point } = data;
      setRideRequests((prev) => ({
        ...prev,
        [point]: (prev[point] || 0) + 1,
      }));

      if (pointMarkersRef.current[point]) {
        const requestsCount = (rideRequests[point] || 0) + 1;
        pointMarkersRef.current[point].setTooltipContent(`
          <div style="color:red; text-align:center; font-weight:bold;">
            <strong>${point}</strong><br>
            📍 Requests: <b>${requestsCount}</b>
          </div>
        `);
      }
    };

    const handleRideRequestsUpdated = (data) => {
      const { point, requestsCount, acceptedCount, driverId, driverSeats } = data;
      
      if (driverId === user?.id) {
        setAvailableSeats(driverSeats);
        alert(`✅ Accepted ${acceptedCount} rides! ${driverSeats} seats remaining.`);
      }

      setRideRequests((prev) => ({
        ...prev,
        [point]: requestsCount,
      }));

      if (pointMarkersRef.current[point]) {
        pointMarkersRef.current[point].setTooltipContent(`
          <div style="color:red; text-align:center; font-weight:bold;">
            <strong>${point}</strong><br>
            📍 Requests: <b>${requestsCount}</b>
          </div>
        `);
      }
    };

    const handleSeatFreed = (data) => {
      setAvailableSeats(data.availableSeats);
      console.log(`🔄 Seat freed. Available: ${data.availableSeats}`);
    };

    const handleNoSeatsAvailable = (data) => {
      alert(`❌ ${data.message}`);
    };

    socket.on("driver-location", handleDriverLocation);
    socket.on("new-ride-request", handleRideRequest);
    socket.on("ride-requests-updated", handleRideRequestsUpdated);
    socket.on("seat-freed", handleSeatFreed);
    socket.on("no-seats-available", handleNoSeatsAvailable);

    socket.emit("get-driver-locations");

    return () => {
      socket.off("driver-location", handleDriverLocation);
      socket.off("new-ride-request", handleRideRequest);
      socket.off("ride-requests-updated", handleRideRequestsUpdated);
      socket.off("seat-freed", handleSeatFreed);
      socket.off("no-seats-available", handleNoSeatsAvailable);
    };
  }, [rideRequests, user]);

  // Accept ride function
  const acceptRide = (pointName) => {
    if (!user) return;
    
    socket.emit("accept-ride", {
      driverId: user.id,
      point: pointName,
    });
    
    setIsDropdownOpen(false);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col rounded-2xl items-center gap-4">
      <div className="w-full max-w-7xl grid md:grid-cols-[80%_20%] grid-cols-1 gap-6">
        
        {/* Map Section */}
        <div className="flex flex-col justify-center items-center gap-4 bg-amber-100 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-4xl font-bold font-serif text-center pt-4">
            Driver Portal - {user.name}
          </h1>
          <div className="bg-green-100 p-3 rounded-lg">
            <p className="text-lg font-semibold">
              Available Seats: <span className="text-blue-600">{availableSeats}/6</span>
            </p>
          </div>
          
          <div
            ref={mapRef}
            className="w-full h-96 rounded-2xl border-2 border-gray-300"
            style={{ minHeight: "700px" }}
          />
          <p className="text-sm text-gray-600">
            📍 Red points = Ride requests | ✅ Select destination to accept rides | 🚗 Green = Other drivers
          </p>
        </div>

        {/* Dropdown Section */}
        <div className="flex flex-col gap-4">
          <div className="relative bg-white rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={availableSeats === 0}
              className={`w-full px-6 py-4 rounded-2xl shadow-lg font-bold text-lg transition-colors flex justify-between items-center ${
                availableSeats === 0 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <span>🚗 Accept Rides</span>
              <span className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
                    Set Next Stopage ({availableSeats} seats available)
                  </h3>
                  <div className="space-y-2">
                    {allPoints.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => acceptRide(item.point)}
                        disabled={availableSeats === 0}
                        className={`w-full text-left p-4 rounded-xl transition-all ${
                          availableSeats === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-2 border-transparent hover:border-green-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{item.title}</span>
                          <span className="text-xs font-medium text-green-600">
                            Accept →
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Requests: <b>{rideRequests[item.point] || 0}</b>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Driver Info */}
          <div className="text-sm bg-white p-4 rounded-2xl border shadow-lg">
            <p className="font-bold mb-2">Driver Status:</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Auto ID:</strong> {user.autoId}</p>
            <p><strong>Available Seats:</strong> {availableSeats}/6</p>
            {driverLocation && (
              <p>
                <strong>Location:</strong> {driverLocation.latitude.toFixed(6)},{" "}
                {driverLocation.longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverPortal;