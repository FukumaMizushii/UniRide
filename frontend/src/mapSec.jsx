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

const MapSec = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const pointMarkersRef = useRef({});
  
  // State from database
  const [user, setUser] = useState(null);
  const [rideRequests, setRideRequests] = useState({});

  const [hasActiveRequest, setHasActiveRequest] = useState(false);
  const [currentRequestPoint, setCurrentRequestPoint] = useState(null);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [acceptedRide, setAcceptedRide] = useState(null);

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
      studentId: localStorage.getItem("student_id")
    };

    if (!userData.id || userData.role !== 'student') {
      navigate("/student");
      return;
    }

    setUser(userData);

    // Register with socket using database ID
    socket.emit("register-user", {
      id: userData.id,
      name: userData.name,
      role: userData.role,
    });

    console.log("🎯 Student registered from database:", userData);
  }, [navigate]);

  // Check for active ride requests on component mount
  useEffect(() => {
    if (!user) return;

    // In a real app, you'd fetch this from an API endpoint
    // For now, we'll rely on socket events to update the state
    console.log("Checking for active requests for student:", user.id);
  }, [user]);

  // Request ride function
  const requestRide = (pointName) => {
    if (hasActiveRequest || !user) {
      setRequestError("You already have an active request");
      return;
    }

    socket.emit("request-ride", {
      studentId: user.id,
      point: pointName,
    });
    
    setIsDropdownOpen(false);
  };

  const cancelRequest = () => {
    if (hasActiveRequest && currentRequestPoint && user) {
      socket.emit("cancel-ride-request", {
        studentId: user.id,
        point: currentRequestPoint,
      });
    }
  };

  const completeRide = () => {
    if (acceptedRide && user) {
      socket.emit("complete-ride", {
        studentId: user.id,
        requestId: acceptedRide.requestId,
      });
    }
  };

  // Initialize Map (similar to before)
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
          .bindTooltip(`
            <div style="font-weight: bold; text-align: center;">
              <span style="color: red">${pt.name}</span><br>
              <span style="color: black">Requests: 0</span>
            </div>
          `, { permanent: true, direction: "top", offset: [0, -60] })
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

  // Socket Event Handlers with enhanced functionality
  useEffect(() => {
    const handleDriverLocation = (data) => {
      const { driverId, latitude, longitude, name, availableSeats, capacity } = data;
      
      if (!window.L || !mapInstance.current) return;
      const L = window.L;

      const carIcon = L.divIcon({
        html: `
        <div style="display: flex; align-items: end; justify-content: center; font-size: 30px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: rgba(59, 130, 246, 0.8); border-radius: 50%; width: 40px; height: 40px; border: 3px solid white;">
          🚗
        </div>
      `,
        className: "car-marker-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      if (markersRef.current[driverId]) {
        markersRef.current[driverId].setLatLng([latitude, longitude]);
        markersRef.current[driverId].setPopupContent(`
          <div style="text-align: center;">
            <strong>🚗 Driver</strong><br>
            Name: ${name}<br>
            Seats: ${availableSeats}/${capacity} available
          </div>
        `);
      } else {
        markersRef.current[driverId] = L.marker([latitude, longitude], { icon: carIcon })
          .addTo(mapInstance.current)
          .bindPopup(`
            <div style="text-align: center;">
              <strong>🚗 Driver</strong><br>
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

    const handleRequestSuccess = (data) => {
      setHasActiveRequest(true);
      setCurrentRequestPoint(data.point);
      setCurrentRequestId(data.requestId);
      setRequestError("");
      alert(`✅ Ride requested at ${data.point}! Waiting for driver...`);
    };

    const handleRequestError = (data) => {
      setRequestError(data.message);
      alert(`❌ ${data.message}`);
    };

    const handleRideAccepted = (data) => {
      setHasActiveRequest(false);
      setAcceptedRide({
        driverName: data.driverName,
        point: data.point,
        requestId: data.requestId,
        seatNumber: data.seatNumber
      });
      setCurrentRequestPoint(null);
      setRequestError("");
      
      alert(`🚗 ${data.driverName} accepted your ride at ${data.point}! Seat: ${data.seatNumber}`);
    };

    const handleRequestCancelled = () => {
      setHasActiveRequest(false);
      setCurrentRequestPoint(null);
      setCurrentRequestId(null);
      setRequestError("");
      alert("❌ Ride request cancelled");
    };

    const handleRideCompleted = (data) => {
      setAcceptedRide(null);
      alert(`✅ ${data.message}`);
    };

    socket.on("driver-location", handleDriverLocation);
    socket.on("new-ride-request", handleRideRequest);
    socket.on("ride-accepted", handleRideAccepted);
    socket.on("request-success", handleRequestSuccess);
    socket.on("request-error", handleRequestError);
    socket.on("request-cancelled", handleRequestCancelled);
    socket.on("ride-completed", handleRideCompleted);

    socket.emit("get-driver-locations");

    return () => {
      socket.off("driver-location", handleDriverLocation);
      socket.off("new-ride-request", handleRideRequest);
      socket.off("ride-accepted", handleRideAccepted);
      socket.off("request-success", handleRequestSuccess);
      socket.off("request-error", handleRequestError);
      socket.off("request-cancelled", handleRequestCancelled);
      socket.off("ride-completed", handleRideCompleted);
    };
  }, [rideRequests]);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col rounded-2xl items-center gap-4">
      {/* Error Display */}
      {requestError && (
        <div className="w-full max-w-7xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="mr-2">❌</span>
            {requestError}
          </div>
        </div>
      )}

      {/* Active Request Banner */}
      {hasActiveRequest && (
        <div className="w-full max-w-7xl bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="mr-2">⏳</span>
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

      {/* Accepted Ride Banner */}
      {acceptedRide && (
        <div className="w-full max-w-7xl bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="mr-2">🚗</span>
              <span>
                Ride accepted by <strong>{acceptedRide.driverName}</strong> at{" "}
                <strong>{acceptedRide.point}</strong> (Seat: {acceptedRide.seatNumber})
              </span>
            </div>
            <button
              onClick={completeRide}
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              Complete Ride
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full max-w-7xl grid md:grid-cols-[80%_20%] grid-cols-1 gap-6">
        
        {/* Map Section */}
        <div className="flex flex-col justify-center items-center gap-4 bg-amber-100 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-4xl font-bold font-serif text-center pt-4">
            Student Portal - {user.name}
          </h1>
          
          <div
            ref={mapRef}
            className="w-full h-96 rounded-2xl border-2 border-gray-300"
            style={{ minHeight: "600px" }}
          />
          <p className="text-sm text-gray-600">
            🚗 See driver locations with seat availability | 📍 Select destination to request rides
          </p>
        </div>

        {/* Dropdown Section */}
        <div className="flex flex-col gap-4">
          {/* Ride Booking Dropdown */}
          <div className="relative bg-white rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={hasActiveRequest || acceptedRide}
              className={`w-full px-6 py-4 rounded-2xl shadow-lg font-bold text-lg transition-colors flex justify-between items-center ${
                hasActiveRequest || acceptedRide
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <span>🚗 Book a Ride</span>
              <span className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">
                    Select Your Destination
                  </h3>
                  <div className="space-y-2">
                    {allPoints.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => requestRide(item.point)}
                        disabled={hasActiveRequest || acceptedRide}
                        className={`w-full text-left p-4 rounded-xl transition-all ${
                          hasActiveRequest && currentRequestPoint === item.point
                            ? 'bg-green-100 border-2 border-green-500 text-green-700'
                            : hasActiveRequest || acceptedRide
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-2 border-transparent hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{item.title}</span>
                          <span className={`text-xs font-medium ${
                            hasActiveRequest && currentRequestPoint === item.point
                              ? 'text-green-600'
                              : hasActiveRequest || acceptedRide
                              ? 'text-gray-400'
                              : 'text-blue-600'
                          }`}>
                            {hasActiveRequest && currentRequestPoint === item.point
                              ? 'Requested ✅'
                              : hasActiveRequest || acceptedRide
                              ? 'Already Requested'
                              : 'Book Now →'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Requests: {rideRequests[item.point] || 0}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className="text-sm bg-white p-4 rounded-2xl border shadow-lg">
            <p className="font-bold mb-2">Student Status:</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Student ID:</strong> {user.studentId}</p>
            <p><strong>Status:</strong> {
              acceptedRide ? `Ride in progress (Seat ${acceptedRide.seatNumber})` :
              hasActiveRequest ? `Waiting at ${currentRequestPoint}` :
              'Available for booking'
            }</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSec;