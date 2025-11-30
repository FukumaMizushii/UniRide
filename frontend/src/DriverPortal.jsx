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
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5500";
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
  const [isLoading, setIsLoading] = useState(true);

  // Direction tracking state
  const [direction, setDirection] = useState(null); // null, 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'
  const [confidence, setConfidence] = useState(0); // 0-100, how confident we are about the direction
  const [locationHistory, setLocationHistory] = useState([]); // Store recent locations for direction calculation
  const [speed, setSpeed] = useState(0); // km/h

  const allPoints = [
    { title: "SUST Gate", point: "Sust Gate", category: "gate" },
    { title: "IICT", point: "IICT", category: "academic" },
    { title: "Chetona 71", point: "Chetona 71", category: "landmark" },
    { title: "E-Building", point: "E Building", category: "academic" },
    {
      title: "Central Auditorium",
      point: "Central Auditorium",
      category: "auditorium",
    },
    { title: "Shah Paran Hall", point: "Shah Paran Hall", category: "hall" },
    { title: "Mujtoba Ali Hall", point: "Mujtoba Ali Hall", category: "hall" },
    { title: "Ladies Hall", point: "Ladies Hall", category: "hall" },
  ];

  // Calculate direction from location history
  const calculateDirection = (currentLocation, history) => {
    if (history.length < 2) return { direction: null, confidence: 0, speed: 0 };

    // Get the two most recent locations
    const recentLocations = [...history].slice(-3); // Use last 3 points for better accuracy
    const directions = [];

    // Calculate direction between consecutive points
    for (let i = 1; i < recentLocations.length; i++) {
      const prev = recentLocations[i - 1];
      const curr = recentLocations[i];

      const dx = curr.longitude - prev.longitude;
      const dy = curr.latitude - prev.latitude;

      // Calculate bearing in degrees (0 = North, 90 = East, etc.)
      const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      const normalizedBearing = (bearing + 360) % 360;

      // Calculate distance and time for speed
      const distance = calculateDistance(prev, curr);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      const currentSpeed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h

      directions.push({
        bearing: normalizedBearing,
        speed: currentSpeed,
        distance,
        timeDiff,
      });
    }

    // Filter out stationary or very slow movements
    const validDirections = directions.filter(
      (dir) => dir.speed > 1 && dir.distance > 0.0001
    );

    if (validDirections.length === 0) {
      return { direction: null, confidence: 0, speed: 0 };
    }

    // Calculate average direction and speed
    const avgBearing =
      validDirections.reduce((sum, dir) => sum + dir.bearing, 0) /
      validDirections.length;
    const avgSpeed =
      validDirections.reduce((sum, dir) => sum + dir.speed, 0) /
      validDirections.length;

    // Convert bearing to compass direction
    const compassDirection = bearingToCompass(avgBearing);

    // Calculate confidence based on consistency and speed
    const bearingVariance = Math.sqrt(
      validDirections.reduce(
        (sum, dir) => sum + Math.pow(dir.bearing - avgBearing, 2),
        0
      ) / validDirections.length
    );

    let confidence = 100;

    // Reduce confidence based on variance
    confidence -= Math.min(bearingVariance * 2, 50);

    // Increase confidence with speed (up to a point)
    confidence += Math.min(avgSpeed * 2, 20);

    // Increase confidence with more data points
    confidence += Math.min(validDirections.length * 10, 30);

    confidence = Math.max(0, Math.min(100, confidence));

    return {
      direction: compassDirection,
      confidence: Math.round(confidence),
      speed: Math.round(avgSpeed * 10) / 10,
    };
  };

  // Helper function to calculate distance between two coordinates in kilometers
  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Convert bearing in degrees to compass direction
  const bearingToCompass = (bearing) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  // Get arrow rotation based on direction
  const getArrowRotation = (direction) => {
    const rotations = {
      N: 0,
      NE: 45,
      E: 90,
      SE: 135,
      S: 180,
      SW: 225,
      W: 270,
      NW: 315,
    };
    return rotations[direction] || 0;
  };

  // Get confidence color and intensity
  const getConfidenceStyle = (confidence) => {
    if (confidence < 30) {
      return { color: "text-gray-400", glow: "filter-none" };
    } else if (confidence < 60) {
      return {
        color: "text-yellow-500",
        glow: "filter drop-shadow(0 0 2px yellow)",
      };
    } else if (confidence < 80) {
      return {
        color: "text-orange-500",
        glow: "filter drop-shadow(0 0 4px orange)",
      };
    } else {
      return {
        color: "text-green-500",
        glow: "filter drop-shadow(0 0 6px green)",
      };
    }
  };

  // Fetch driver status from database
  const fetchDriverStatus = async (driverId) => {
    try {
      console.log("🔄 Fetching driver status from database...");
      const response = await fetch(
        `${API_BASE_URL}/api/driver/status/${driverId}`
      );
      const data = await response.json();

      if (data.success) {
        console.log("✅ Driver status from DB:", data.driver);
        setAvailableSeats(data.driver.availableSeats);
        return data.driver;
      } else {
        console.error("❌ Failed to fetch driver status");
        return null;
      }
    } catch (error) {
      console.error("❌ Error fetching driver status:", error);
      return null;
    }
  };

  // Fetch active ride requests from database
  const fetchActiveRequests = async () => {
    try {
      console.log("🔄 Fetching active ride requests from database...");
      const response = await fetch(`${API_BASE_URL}/api/ride-requests/active`);
      const data = await response.json();

      if (data.success) {
        console.log("✅ Active requests from DB:", data.requests);
        setRideRequests(data.requests);
        return data.requests;
      } else {
        console.error("❌ Failed to fetch active requests");
        return {};
      }
    } catch (error) {
      console.error("❌ Error fetching active requests:", error);
      return {};
    }
  };

  // Check authentication and sync with database
  useEffect(() => {
    const initializeDriver = async () => {
      const userData = {
        id: localStorage.getItem("user_id"),
        name: localStorage.getItem("user_name"),
        role: localStorage.getItem("user_role"),
        autoId: localStorage.getItem("auto_id"),
      };

      if (!userData.id || userData.role !== "driver") {
        navigate("/driver");
        return;
      }

      setUser(userData);
      setIsLoading(true);

      try {
        // Fetch current state from database
        const [driverStatus, activeRequests] = await Promise.all([
          fetchDriverStatus(userData.id),
          fetchActiveRequests(),
        ]);

        if (driverStatus) {
          setAvailableSeats(driverStatus.availableSeats);
        }

        // Register with socket using database ID
        socket.emit("register-user", {
          id: userData.id,
          name: userData.name,
          role: userData.role,
        });

        console.log("🚗 Driver fully initialized from database:", userData);
      } catch (error) {
        console.error("❌ Error initializing driver:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDriver();
  }, [navigate]);

  // Sync with database on component focus or route change
  useEffect(() => {
    const handleFocus = async () => {
      if (user?.id) {
        console.log("🔄 Syncing driver state on focus...");
        await fetchDriverStatus(user.id);
        await fetchActiveRequests();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  // Initialize user and location tracking with direction calculation
  useEffect(() => {
    if (!user) return;

    // Start location tracking
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const timestamp = Date.now();

          const newLocation = { latitude, longitude, timestamp };
          setDriverLocation(newLocation);

          // Update location history (keep last 10 locations)
          setLocationHistory((prev) => {
            const updatedHistory = [...prev, newLocation].slice(-10);

            // Calculate direction when we have enough history
            if (updatedHistory.length >= 2) {
              const directionData = calculateDirection(
                newLocation,
                updatedHistory
              );
              setDirection(directionData.direction);
              setConfidence(directionData.confidence);
              setSpeed(directionData.speed);
            }

            return updatedHistory;
          });

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
          maximumAge: 2000, // Use cached positions for better direction calculation
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user]);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;
    let mapInitialized = false;

    const initMap = async () => {
      if (!isMounted || !mapRef.current || mapInitialized) return;

      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Check if map container still exists
        if (!mapRef.current) return;

        const topLeft = [24.948398100077377, 91.79677963256837];
        const bottomRight = [24.896402266558727, 91.86355590820314];
        const center = [24.921079669610492, 91.83162689208986];

        const bounds = L.latLngBounds([topLeft, bottomRight]);

        // Initialize map with error handling
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView(center, 16);

        // L.tileLayer("https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png", {
        //   attribution: "© Wikimedia",
        // }).addTo(mapInstance.current);

        
        const tileLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
            subdomains: ["a", "b", "c"],
          }
        ).addTo(mapInstance.current);


// Alternative tile providers as fallback (uncomment if needed)
/*
// Fallback 1: OpenStreetMap Hot
const osmHot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
  maxZoom: 19
});

// Fallback 2: CartoDB Voyager
const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap contributors, © CartoDB',
  maxZoom: 20
});

// Create layer group with multiple options
const baseMaps = {
  "OpenStreetMap": tileLayer,
  "OSM Hot": osmHot,
  "CartoDB Voyager": cartoVoyager
};

// Add the default one
tileLayer.addTo(mapInstance.current);
*/


        // Use setTimeout to avoid animation conflicts
        setTimeout(() => {
          if (mapInstance.current && isMounted) {
            mapInstance.current.fitBounds(bounds, {
              animate: false,
              padding: [10, 10],
            });
          }
        }, 100);

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

          pointMarkersRef.current[pt.name] = L.marker(pt.coords, {
            icon: customIcon,
          })
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

        // Update with actual data from database
        Object.keys(rideRequests).forEach((point) => {
          if (pointMarkersRef.current[point]) {
            pointMarkersRef.current[point].setTooltipContent(`
            <div style="color:red; text-align:center; font-weight:bold;">
              <strong>${point}</strong><br>
              📍 Requests: <b>${rideRequests[point]}</b>
            </div>
          `);
          }
        });

        mapInitialized = true;
        console.log("✅ Map initialized successfully");
      } catch (error) {
        console.error("❌ Error initializing map:", error);
      }
    };

    if (!isLoading) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initMap();
      }, 100);
    }

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        console.log("🧹 Cleaning up map instance");
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      // Clear all markers
      Object.keys(pointMarkersRef.current).forEach((key) => {
        pointMarkersRef.current[key] = null;
      });
      Object.keys(markersRef.current).forEach((key) => {
        markersRef.current[key] = null;
      });
    };
  }, [isLoading, rideRequests]);

  // Enhanced driver location with capacity info and direction
  useEffect(() => {
    if (!driverLocation || !window.L || !mapInstance.current || isLoading)
      return;

    const L = window.L;

    const rotation = direction ? getArrowRotation(direction) : 0;
    const confidenceStyle = getConfidenceStyle(confidence);

    const currentDriverIcon = L.divIcon({
      html: `
      <div style="position: relative; width: 60px; height: 60px;">
        <!-- Main vehicle icon -->
        <div style="display: flex; align-items: end; justify-content: center; font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: rgba(59, 130, 246, 0.9); border-radius: 50%; width: 45px; height: 45px; border: 3px solid white; position: absolute; top: 0; left: 7.5px;">
          🚗
        </div>
        <!-- Direction arrow -->
        ${
          direction && confidence > 20
            ? `
        <div style="position: absolute; top: -15px; left: 22.5px; transform: rotate(${rotation}deg); ${
                confidenceStyle.glow
              }">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${
            confidence < 60
              ? "#fbbf24"
              : confidence < 80
              ? "#f97316"
              : "#22c55e"
          }" opacity="${confidence / 100}">
            <path d="M12 2L4 10H8V22H16V10H20L12 2Z"/>
          </svg>
        </div>
        `
            : ""
        }
      </div>
    `,
      className: "current-driver-marker",
      iconSize: [60, 60],
      iconAnchor: [30, 45],
      popupAnchor: [0, -45],
    });

    if (markersRef.current.currentDriver) {
      mapInstance.current.removeLayer(markersRef.current.currentDriver);
    }

    const popupContent = `
      <div style="text-align: center; min-width: 200px;">
        <strong>🚗 You (Driver)</strong><br>
        Name: ${user?.name}<br>
        Auto ID: ${user?.autoId}<br>
        Seats: ${availableSeats}/6 available<br>
        ${
          direction && confidence > 30
            ? `
        <div style="margin-top: 8px; padding: 4px; background: #f8f9fa; border-radius: 4px;">
          <strong>Direction:</strong> ${direction}<br>
          <strong>Confidence:</strong> ${confidence}%<br>
          <strong>Speed:</strong> ${speed} km/h
        </div>
        `
            : confidence > 0
            ? `<div style="margin-top: 8px; color: #6c757d;">Calculating direction...</div>`
            : `<div style="margin-top: 8px; color: #6c757d;">Stationary</div>`
        }
      </div>
    `;

    markersRef.current.currentDriver = L.marker(
      [driverLocation.latitude, driverLocation.longitude],
      { icon: currentDriverIcon }
    )
      .addTo(mapInstance.current)
      .bindPopup(popupContent)
      .openPopup();

    mapInstance.current.setView(
      [driverLocation.latitude, driverLocation.longitude],
      16
    );
  }, [
    driverLocation,
    user,
    availableSeats,
    isLoading,
    direction,
    confidence,
    speed,
  ]);

  // Socket Event Handlers with database sync
  useEffect(() => {
    const handleDriverLocation = (data) => {
      const { driverId, latitude, longitude, name, availableSeats, capacity } =
        data;

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
        markersRef.current[driverId] = L.marker([latitude, longitude], {
          icon: otherDriverIcon,
        }).addTo(mapInstance.current).bindPopup(`
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

    const handleRideRequestsUpdated = async (data) => {
      const { point, requestsCount, acceptedCount, driverId, driverSeats } =
        data;

      if (driverId === user?.id) {
        setAvailableSeats(driverSeats);
        alert(
          `✅ Accepted ${acceptedCount} rides! ${driverSeats} seats remaining.`
        );

        // Sync with database to ensure consistency
        await fetchDriverStatus(user.id);
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

    const handleSeatFreed = async (data) => {
      setAvailableSeats(data.availableSeats);
      console.log(`🔄 Seat freed. Available: ${data.availableSeats}`);

      // Sync with database
      if (user?.id) {
        await fetchDriverStatus(user.id);
      }
    };

    const handleNoSeatsAvailable = (data) => {
      alert(`❌ ${data.message}`);
    };

    const handleUpdatePointRequests = (data) => {
      const { point, requestsCount } = data;
      console.log(`🔄 Updating point requests for ${point}: ${requestsCount}`);

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

    const handleRideRequestCancelled = (data) => {
      const { point, requestsCount } = data;
      console.log(
        `🔄 Ride request cancelled at ${point}, new count: ${requestsCount}`
      );

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

    socket.on("driver-location", handleDriverLocation);
    socket.on("new-ride-request", handleRideRequest);
    socket.on("ride-requests-updated", handleRideRequestsUpdated);
    socket.on("seat-freed", handleSeatFreed);
    socket.on("no-seats-available", handleNoSeatsAvailable);
    socket.on("update-point-requests", handleUpdatePointRequests);
    socket.on("ride-request-cancelled", handleRideRequestCancelled);

    socket.emit("get-driver-locations");

    return () => {
      socket.off("driver-location", handleDriverLocation);
      socket.off("new-ride-request", handleRideRequest);
      socket.off("ride-requests-updated", handleRideRequestsUpdated);
      socket.off("seat-freed", handleSeatFreed);
      socket.off("no-seats-available", handleNoSeatsAvailable);
      socket.off("update-point-requests", handleUpdatePointRequests);
      socket.off("ride-request-cancelled", handleRideRequestCancelled);
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

  // Manual sync via navbar
  useEffect(() => {
    const handleManualSyncRequest = async (event) => {
      const { userId, role } = event.detail;

      if (user && user.id === userId && role === "driver") {
        console.log("🔄 Manual sync triggered from navbar");
        setIsLoading(true);
        await fetchDriverStatus(user.id);
        await fetchActiveRequests();
        setIsLoading(false);
        alert("✅ Driver state synced with database!");
      }
    };

    window.addEventListener("manualSyncRequest", handleManualSyncRequest);

    return () => {
      window.removeEventListener("manualSyncRequest", handleManualSyncRequest);
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading driver data from database...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const confidenceStyle = getConfidenceStyle(confidence);

  return (
    <div className="mt-5 flex flex-col rounded-2xl items-center gap-4">
      <div className="w-full max-w-7xl grid md:grid-cols-[80%_20%] grid-cols-1 gap-6">
        {/* Map Section */}
        <div className="flex flex-col justify-center items-center gap-4 bg-amber-100 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-4xl font-bold font-serif text-center pt-4">
            Driver Portal - {user.name}
          </h1>

          {/* Direction Indicator Panel */}
          <div className="w-full max-w-md bg-white rounded-xl p-4 shadow-lg border">
            <h3 className="text-lg font-bold text-center mb-3">
              Vehicle Direction
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Direction Arrow Display */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                    {direction && confidence > 20 ? (
                      <div
                        className="transition-transform duration-500 ease-out"
                        style={{
                          transform: `rotate(${getArrowRotation(
                            direction
                          )}deg)`,
                        }}
                      >
                        <div className={confidenceStyle.color}>
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2L4 10H8V22H16V10H20L12 2Z" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {direction && confidence > 20 && (
                    <div className="absolute -top-2 -right-2 bg-white rounded-full border shadow-sm px-2 py-1 text-xs font-bold">
                      {direction}
                    </div>
                  )}
                </div>

                {/* Direction Info */}
                <div>
                  <div className="text-sm text-gray-600">
                    {direction && confidence > 30 ? (
                      <>
                        <div className="font-semibold">
                          Heading: {direction}
                        </div>
                        <div>Speed: {speed} km/h</div>
                        <div className="flex items-center space-x-2">
                          <span>Confidence:</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                confidence < 30
                                  ? "bg-gray-400"
                                  : confidence < 60
                                  ? "bg-yellow-500"
                                  : confidence < 80
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{confidence}%</span>
                        </div>
                      </>
                    ) : confidence > 0 ? (
                      <div className="text-blue-600">
                        Calculating direction...
                      </div>
                    ) : (
                      <div className="text-gray-500">Stationary</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-100 p-3 rounded-lg">
            <p className="text-lg font-semibold">
              Available Seats:{" "}
              <span className="text-blue-600">{availableSeats}/6</span>
            </p>
          </div>

          <div
            ref={mapRef}
            className="w-full h-96 rounded-2xl border-2 border-gray-300"
            style={{ minHeight: "600px" }}
          />
          <p className="text-sm text-gray-600">
            📍 Red points = Ride requests | ✅ Select destination to accept
            rides | 🚗 Green = Other drivers
            {direction &&
              confidence > 30 &&
              ` | 🧭 Direction: ${direction} (${confidence}% confidence)`}
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
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <span>🚗 Accept Rides</span>
              <span
                className={`transform transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              >
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
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-2 border-transparent hover:border-green-300"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">
                            {item.title}
                          </span>
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
            <p className="font-bold mb-2">Driver Status (Live from DB):</p>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Auto ID:</strong> {user.autoId}
            </p>
            <p>
              <strong>Available Seats:</strong> {availableSeats}/6
            </p>
            <p>
              <strong>Occupied Seats:</strong> {6 - availableSeats}/6
            </p>
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
