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

// -- add near the top (below your imports) --
function deg2rad(d) {
  return (d * Math.PI) / 180;
}
function rad2deg(r) {
  return (r * 180) / Math.PI;
}

/** calculateBearing(lat1, lon1, lat2, lon2)
 * returns bearing in degrees 0..360 where 0 = North, 90 = East
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  )
    return 0;

  const φ1 = deg2rad(lat1);
  const φ2 = deg2rad(lat2);
  const Δλ = deg2rad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  let θ = Math.atan2(y, x); // radians -π..+π
  θ = rad2deg(θ); // degrees -180..+180
  console.log(lat1, lon1, lat2, lon2);
  console.log(`Calculated bearing: ${θ}°`);

  return (θ + 360) % 360;
}

// create a divIcon that rotates its inner SVG/emoji by `bearing` degrees.
// labelHtml: optional inner HTML (svg, emoji, etc)
// size: [w,h] and anchor default to center
function createRotatedDivIcon({
  bearing = 0,
  labelHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" 
         style="transform: rotate(315deg); fill: red;">
      <path d="M541.9 139.5C546.4 127.7 543.6 114.3 534.7 105.4C525.8 96.5 512.4 93.6 500.6 98.2L84.6 258.2C71.9 263 63.7 275.2 64 288.7C64.3 302.2 73.1 314.1 85.9 318.3L262.7 377.2L321.6 554C325.9 566.8 337.7 575.6 351.2 575.9C364.7 576.2 376.9 568 381.8 555.4L541.8 139.4z"/>
    </svg>
  `,
  size = [45, 45],
  className = "",
} = {}) {
  const [w, h] = size;
  // We rotate the inner element so 'iconAnchor' and map markers remain stable.
  const html = `
    <div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;">
      <div style="transform: rotate(${bearing}deg); transition: transform 200ms linear; display:flex; align-items:center; justify-content:center; width:${w}px; height:${h}px;">
        ${labelHtml}
      </div>
    </div>
  `;
  return window.L?.divIcon({
    html,
    className: `rotated-marker smooth-marker ${className}`,
    iconSize: [w, h],
    iconAnchor: [Math.round(w / 2), Math.round(h / 2)],
    popupAnchor: [0, -Math.round(h / 2)],
  });
}

const DriverPortal = () => {
  const navigate = useNavigate();
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5500";
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const pointMarkersRef = useRef({});
  const prevDriverLocationRef = useRef(null); // stores { latitude, longitude }
  const lastBearingUpdateRef = useRef(0);
  const lastBearingRef = useRef(0); // stores the last calculated bearing
  const availableSeatsRef = useRef(6); // stores current available seats
  const BEARING_UPDATE_INTERVAL = 1000; // Update bearing every 1 second max

  // State from database
  const [user, setUser] = useState(null);
  const [rideRequests, setRideRequests] = useState({});
  const [driverLocation, setDriverLocation] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(6);
  const [isLoading, setIsLoading] = useState(true);

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

  // Reusable function for driver popup content
  const getDriverPopupContent = (driverName, autoId, seats, isCurrentDriver = false) => `
    <div style="text-align: center;">
      <strong>🚗 ${isCurrentDriver ? 'You (Driver)' : 'Other Driver'}</strong><br>
      Name: ${driverName}<br>
      ${autoId ? `Auto ID: ${autoId}<br>` : ''}
      Seats: ${seats}/6 available
    </div>
  `;

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

  // Sync availableSeats state with ref
  useEffect(() => {
    availableSeatsRef.current = availableSeats;
  }, [availableSeats]);
  

  // Initialize user and location tracking - SINGLE SOURCE OF TRUTH for current driver marker
useEffect(() => {
  if (!user) return;

  // Helper function to update driver marker
  const updateDriverMarker = (latitude, longitude, bearing) => {
    if (!window.L || !mapInstance.current) return;
    const L = window.L;
    
    // Current driver icon HTML
    const currentDriverHtml = `
      <div style="display:flex;align-items:center;justify-content:center;font-size:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: rgba(59, 130, 246, 0.9); border-radius: 50%; width:45px; height:45px; border:3px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            style="transform: rotate(315deg); fill: red;">
          <path d="M541.9 139.5C546.4 127.7 543.6 114.3 534.7 105.4C525.8 96.5 512.4 93.6 500.6 98.2L84.6 258.2C71.9 263 63.7 275.2 64 288.7C64.3 302.2 73.1 314.1 85.9 318.3L262.7 377.2L321.6 554C325.9 566.8 337.7 575.6 351.2 575.9C364.7 576.2 376.9 568 381.8 555.4L541.8 139.4z"/>
        </svg>
      </div>
    `;

    const icon = createRotatedDivIcon({
      bearing: bearing,
      labelHtml: currentDriverHtml,
      size: [45, 45],
      className: "current-driver-marker",
    });

    // Update or create marker
    if (markersRef.current.currentDriver) {
      try {
        markersRef.current.currentDriver.setIcon(icon);
        markersRef.current.currentDriver.setLatLng([latitude, longitude]);
      } catch (e) {
        // If anything odd, recreate marker
        mapInstance.current.removeLayer(markersRef.current.currentDriver);
        markersRef.current.currentDriver = L.marker([latitude, longitude], { icon })
          .addTo(mapInstance.current)
          .bindPopup(getDriverPopupContent(user.name, user.autoId, availableSeatsRef.current, true))
          .openPopup();
      }
    } else {
      // Initial creation
      markersRef.current.currentDriver = L.marker([latitude, longitude], { icon })
        .addTo(mapInstance.current)
        .bindPopup(getDriverPopupContent(user.name, user.autoId, availableSeatsRef.current, true))
        .openPopup();
    }

    // Auto-zoom disabled - use "Zoom to Me" button instead
    // mapInstance.current.setView([latitude, longitude], 16);
  };

  // ============================================
  // OPTION 1: LIVE LOCATION TRACKING (REAL GPS)
  // ============================================
  // UNCOMMENT THIS SECTION for real GPS tracking
  // COMMENT OUT the TEST LOCATION SECTION below
  // /*
  // Start location tracking
  if (navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLoc = { latitude, longitude };

        // compute bearing using previous position if exists
        const prev = prevDriverLocationRef.current;
        let bearing = lastBearingRef.current; // Start with last known bearing instead of 0
        
        const now = Date.now();
        if (prev && now - lastBearingUpdateRef.current >= BEARING_UPDATE_INTERVAL) {
          bearing = calculateBearing(
            prev.latitude,
            prev.longitude,
            latitude,
            longitude
          );
          lastBearingUpdateRef.current = now;
          lastBearingRef.current = bearing; // Store the new bearing
        }

        // update prev for next watch tick
        prevDriverLocationRef.current = newLoc;

        // update state
        setDriverLocation(newLoc);

        // emit to server
        socket.emit("send-location", {
          permanentID: user.id,
          latitude,
          longitude,
          name: user.name,
        });

        // Update marker icon rotation
        updateDriverMarker(latitude, longitude, bearing);
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
  // */

  // ============================================
  // OPTION 2: TEST LOCATION SEQUENCE
  // ============================================
  // UNCOMMENT THIS SECTION for test locations
  // COMMENT OUT the LIVE LOCATION SECTION above
  /*
  const testLocations = [
    { latitude: 24.905822, longitude: 91.839995 },
    { latitude: 24.907146, longitude: 91.837721 },
    { latitude: 24.908742, longitude: 91.840339 },
    { latitude: 24.909287, longitude: 91.837678 },
    { latitude: 24.909287, longitude: 91.836133 },
    { latitude: 24.910221, longitude: 91.833429 },
    { latitude: 24.911778, longitude: 91.834631 },
    { latitude: 24.913062, longitude: 91.836734 },
    { latitude: 24.914736, longitude: 91.837635 },
    { latitude: 24.917304, longitude: 91.838408 },
    { latitude: 24.916448, longitude: 91.839910 },
    { latitude: 24.915242, longitude: 91.840296 },
    { latitude: 24.913724, longitude: 91.841326 },
    { latitude: 24.912906, longitude: 91.841841 },
    { latitude: 24.911544, longitude: 91.842613 },
    { latitude: 24.910805, longitude: 91.842742 },
  ];

  let currentTestIndex = 0;
  const TEST_INTERVAL = 1000; // 1 second between locations

  const updateTestLocation = () => {
    const location = testLocations[currentTestIndex];
    const newLoc = { latitude: location.latitude, longitude: location.longitude };

    // compute bearing using previous position if exists
    const prev = prevDriverLocationRef.current;
    let bearing = lastBearingRef.current; // Start with last known bearing instead of 0
    
    const now = Date.now();
    if (prev && now - lastBearingUpdateRef.current >= BEARING_UPDATE_INTERVAL) {
      bearing = calculateBearing(
        prev.latitude,
        prev.longitude,
        location.latitude,
        location.longitude
      );
      lastBearingUpdateRef.current = now;
      lastBearingRef.current = bearing; // Store the new bearing
    }

    // update prev for next tick
    prevDriverLocationRef.current = newLoc;

    // update state
    setDriverLocation(newLoc);

    // emit to server
    socket.emit("send-location", {
      permanentID: user.id,
      latitude: location.latitude,
      longitude: location.longitude,
      name: user.name,
    });

    // Update marker icon rotation
    updateDriverMarker(location.latitude, location.longitude, bearing);

    // Move to next location (loop back to start)
    currentTestIndex = (currentTestIndex + 1) % testLocations.length;
  };

  // Start test sequence
  const testInterval = setInterval(updateTestLocation, TEST_INTERVAL);

  // Initial update
  updateTestLocation();

  return () => {
    clearInterval(testInterval);
  };
  */
}, [user]); // Removed availableSeats - it should not restart location tracking

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

        const tileLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
            subdomains: ["a", "b", "c"],
          }
        ).addTo(mapInstance.current);

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
        const marker = pointMarkersRef.current[key];
        if (marker && marker.remove) marker.remove();
        pointMarkersRef.current[key] = null;
      });
      
      Object.keys(markersRef.current).forEach((key) => {
        const obj = markersRef.current[key];
        // Handle both shapes: { marker, lastPos } or plain marker
        const marker = obj?.marker || obj;
        if (marker && marker.remove) marker.remove();
        markersRef.current[key] = null;
      });
    };
  }, [isLoading, rideRequests]);

  // Socket Event Handlers with database sync
  useEffect(() => {
    const handleDriverLocation = (data) => {
      const { driverId, latitude, longitude, name, availableSeats, capacity } =
        data;

      if (driverId === user?.id) return;

      if (!window.L || !mapInstance.current) return;
      const L = window.L;

      // compute bearing from the last known location for this driver
      const existing = markersRef.current[driverId];
      const lastPos = existing?.lastPos; // { latitude, longitude } or undefined
      let bearing = 0;
      
      // Only calculate bearing if we have previous position and enough time has passed
      if (lastPos) {
        bearing = calculateBearing(
          lastPos.latitude,
          lastPos.longitude,
          latitude,
          longitude
        );
      }

      const otherDriverHtml = `
        <div style="display:flex;align-items:center;justify-content:center;font-size:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: rgba(34, 197, 94, 0.8); border-radius: 50%; width:40px; height:40px; border: 3px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 640 640"
     style="transform: rotate(315deg); fill: red;">
  <path d="M541.9 139.5C546.4 127.7 543.6 114.3 534.7 105.4C525.8 96.5 512.4 93.6 500.6 98.2L84.6 258.2C71.9 263 63.7 275.2 64 288.7C64.3 302.2 73.1 314.1 85.9 318.3L262.7 377.2L321.6 554C325.9 566.8 337.7 575.6 351.2 575.9C364.7 576.2 376.9 568 381.8 555.4L541.8 139.4z"/>
</svg>
        </div>
      `;

      const icon = createRotatedDivIcon({
        bearing: bearing,
        labelHtml: otherDriverHtml,
        size: [40, 40],
        className: "other-driver-marker",
      });

      if (existing && existing.marker) {
        try {
          // update position and icon
          existing.marker.setLatLng([latitude, longitude]);
          existing.marker.setIcon(icon);
          existing.marker.setPopupContent(
            getDriverPopupContent(name, null, availableSeats, false)
          );
          // store new lastPos
          existing.lastPos = { latitude, longitude };
        } catch (e) {
          // fallback: remove and recreate marker
          try {
            mapInstance.current.removeLayer(existing.marker);
          } catch (err) {}
          const m = L.marker([latitude, longitude], { icon }).addTo(
            mapInstance.current
          ).bindPopup(
            getDriverPopupContent(name, null, availableSeats, false)
          );
          markersRef.current[driverId] = {
            marker: m,
            lastPos: { latitude, longitude },
          };
        }
      } else {
        // new marker
        const m = L.marker([latitude, longitude], { icon }).addTo(
          mapInstance.current
        ).bindPopup(
          getDriverPopupContent(name, null, availableSeats, false)
        );
        markersRef.current[driverId] = {
          marker: m,
          lastPos: { latitude, longitude },
        };
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
  }, [rideRequests, user, availableSeats]);

  // Accept ride function
  const acceptRide = (pointName) => {
    if (!user) return;
    
    if (availableSeats === 0) {
      alert("❌ No available seats! Please complete existing rides first.");
      return;
    }

    socket.emit("accept-ride", {
      driverId: user.id,
      point: pointName,
    });

    setIsDropdownOpen(false);
  };

  // Manual sync button
  useEffect(() => {
    const handleManualSyncRequest = async (event) => {
      const { userId, role } = event.detail;

      if (user && user.id === userId && role === "driver") {
        console.log("🔄 Manual sync triggered from navbar");
        setIsLoading(true);
        await fetchDriverStatus(user.id);
        await fetchActiveRequests();
        setIsLoading(false);
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

  return (
    <div className="mt-5 flex flex-col rounded-2xl items-center gap-4">
      <div className="w-full max-w-7xl grid md:grid-cols-[80%_20%] grid-cols-1 gap-6">
        {/* Map Section */}
        <div className="flex flex-col justify-center items-center gap-4 bg-amber-100 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-center gap-4 w-full">
            <h1 className="text-4xl font-bold font-serif text-center pt-4">
              Driver Portal - {user.name}
            </h1>
            {driverLocation && (
              <button
                onClick={() => {
                  if (mapInstance.current && driverLocation) {
                    mapInstance.current.setView(
                      [driverLocation.latitude, driverLocation.longitude],
                      16,
                      { animate: true, duration: 0.5 }
                    );
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors font-semibold text-sm whitespace-nowrap"
                title="Zoom to my location"
              >
                📍 Zoom to Me
              </button>
            )}
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
            style={{ minHeight: "700px" }}
          />
          <p className="text-sm text-gray-600">
            📍 Red points = Ride requests | ✅ Select destination to accept
            rides | 🚗 Green = Other drivers (with rotation based on movement)
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