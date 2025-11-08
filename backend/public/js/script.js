const socket = io();

// Grab user info passed from server via ejs rendering
const userRole = USER_ROLE;  // injected from navigation.ejs
const userName = USER_NAME;  // injected
const userId = USER_ID;      // injected (studentId or driverId)

// ---------- Setup Permanent ID ----------
let savedID = localStorage.getItem("user_id");
if (!savedID) {
  savedID = userId; // Use the server-assigned ID for first-time login
  localStorage.setItem("user_id", savedID);
}
console.log("Permanent User ID:", savedID);

// ---------- MAP SETUP ----------
// const map = L.map("map").setView([0, 0], 16);
// Define boundary points
const topLeft = [24.912361403380515, 91.83300018310548];
const bottomRight = [24.90477133957499, 91.84327840805054];
const center = [24.9085384, 91.8374471];

// Create bounds and initialize map
const bounds = L.latLngBounds([topLeft, bottomRight]);
var map = L.map("map").setView(center, 16);

// Add tile layer
// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}/png", {
//   attribution: "OpenStreetMap"
// }).addTo(map);

// Create a polygon with a hole (donut shape)
const outerBounds = [
  [-90, -180],  // SW world
  [-90, 180],   // SE world  
  [90, 180],    // NE world
  [90, -180]    // NW world
];

const innerBounds = [
  [topLeft[0], topLeft[1]],      // NW allowed
  [topLeft[0], bottomRight[1]],  // NE allowed
  [bottomRight[0], bottomRight[1]], // SE allowed
  [bottomRight[0], topLeft[1]]   // SW allowed
];

// Create polygon with hole
// L.polygon([outerBounds, innerBounds], {
  // color: 'black',
  // fillColor: 'black',
  // fillOpacity: 1,
  // weight: 0,
  // interactive: false
  // }).addTo(map);
  
  // Apply map restrictions
map.fitBounds(bounds);
map.setMaxBounds(bounds);
map.setMinZoom(15);
  
  
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "OpenStreetMap",
}).addTo(map);
  
  // Fixed points (example)
const fixedPoints = [
  { 
    name: "Gate A", 
    coords: [24.912361403380515, 91.83300018310548],
    iconUrl: "/images/gate-icon.png"  // Custom image for Gate A
  },
  { 
    name: "Gate B", 
    coords: [24.904868651039813, 91.83233499526979],
    iconUrl: "/images/gate-b-icon.png"  // Custom image for Gate B
  },
  { 
    name: "Library", 
    coords: [24.912147331056858, 91.84336423873903],
    iconUrl: "/images/library-icon.png"  // Custom image for Library
  },
  { 
    name: "Hall", 
    coords: [24.90477133957499, 91.84327840805054],
    iconUrl: "/images/hall-icon.png"  // Custom image for Hall
  },
];
  
  // Add markers for fixed points
const pointMarkers = {};
fixedPoints.forEach(pt => {
  const customIcon = L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 60px;
        height: 60px;
      ">
        <!-- Marker shape -->
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
          <!-- Image inside marker -->
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
    className: 'custom-marker-icon',
    iconSize: [60, 60],
    iconAnchor: [30, 10],
    popupAnchor: [0, -40]
  });
  
  pointMarkers[pt.name] = L.marker(pt.coords, { 
    icon: customIcon 
  }).addTo(map)
  .bindTooltip(`${pt.name}<br>Requests: 0`, {
    permanent: true,
    direction: "top",
    offset: [0, -10]
  })
  .openTooltip();
});
  
  // ---------- DATA STRUCTURES ----------
  const markers = {}; // driverId → marker
  const rideRequests = {}; // pointName → array of student IDs
  
  fixedPoints.forEach(pt => rideRequests[pt.name] = []);
  
  // ---------- SOCKET CONNECTION ----------
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    socket.emit("register-user", { id: savedID, role: userRole, name: userName });
  });
  
// ---------- STUDENT LOGIC ----------
if (userRole === "student") {
  console.log("Logged in as STUDENT");
      
  // Request ride from a fixed point
  document.querySelectorAll(".request-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pointName = btn.dataset.point;
      socket.emit("request-ride", { studentId: savedID, point: pointName });
      console.log(`Requested ride at ${pointName}`);
    });
  });
}
      
// ---------- DRIVER LOGIC ----------
if (userRole === "driver") {
  console.log("Logged in as DRIVER");
  
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        socket.emit("send-location", {
          permanentID: savedID,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        console.log(`Driver location sent: ${position.coords.latitude}, ${position.coords.longitude}`);
      },
      (err) => console.error("Location error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }
}
      
      
// ---------- RECEIVE LOCATION UPDATES ----------
socket.on("driver-location", data => {
const { driverId, latitude, longitude, name } = data;

// Create car emoji icon for drivers
const carIcon = L.divIcon({
  html: `
    <div style="
      // background: #3b82f6;
      // width: 40px;
      // height: 40px;
      // border-radius: 50%;
      // border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.8);
    ">
      🚗
    </div>
  `,
  className: 'car-marker-icon',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, 10]
});

if (markers[driverId]) {
  markers[driverId].setLatLng([latitude, longitude]);
} else {
  markers[driverId] = L.marker([latitude, longitude], { 
    icon: carIcon 
  }).addTo(map)
  .bindPopup(`Driver: ${name}`).openPopup();
}
});

// ---------- RECEIVE RIDE REQUESTS ----------
socket.on("new-ride-request", data => {
  const { studentId, point } = data;
  rideRequests[point].push(studentId);
  
  const requestsCount = rideRequests[point].length;
  
  // Color code based on request count
  let color = '#000';
  if (requestsCount >= 3) color = '#dc2626'; // red for high demand
  else if (requestsCount >= 1) color = '#ea580c'; // orange for medium
  
  // pointMarkers[point]
  // .bindPopup(`
  //   <div style="color: ${color}; text-align: center;">
  //   <strong>${point}</strong><br>
  //   📍 Requests: <b>${requestsCount}</b>
  //   </div>
  //   `)
  //   .openPopup();
    
    // Auto-close after 3 seconds
    // setTimeout(() => {
    //   pointMarkers[point].closePopup();
    // }, 3000);
    pointMarkers[point]
    .setTooltipContent(`
      <div style="color:${color}; text-align:center;">
        <strong>${point}</strong><br>
        📍 Requests: <b>${requestsCount}</b>
      </div>
    `);
    
    console.log(`New request at ${point} from student ${studentId}`);
  });
  
  // ---------- DRIVER ACCEPTS REQUEST ----------
  document.querySelectorAll(".accept-btn")?.forEach(btn => {
    btn.addEventListener("click", () => {
      const pointName = btn.dataset.point;
      socket.emit("accept-ride", { driverId: savedID, point: pointName });
      console.log(`Accepted requests at ${pointName}`);
    });
  });
  
  // ---------- RIDE ACCEPTED NOTIFICATION ----------
  socket.on("ride-accepted", data => {
    const { driverName, point } = data;
    alert(`Driver ${driverName} accepted your ride at ${point}`);
  });
  
  
  
  // Receive & update markers on map
  socket.on("receive-location", (data) => {
    const { savedID, username, latitude, longitude } = data;

    if (!markers[savedID]) {
      markers[savedID] = L.marker([latitude, longitude]).addTo(map)
      .bindPopup(`${username}`).openPopup();
    } else {
      markers[savedID].setLatLng([latitude, longitude]);
    }
    
    if (savedID === savedID) {
      map.setView([latitude, longitude], 16);
    }
  });
  
  // Optional disconnect cleanup
  socket.on("user-disconnected", (savedID) => {
    if (markers[savedID]) {
      map.removeLayer(markers[savedID]);
      delete markers[savedID];
    }
  });
        










        
// // Initialize map click handler
// map.on('click', function(e) {
  //     const lat = e.latlng.lat;
  //     const lng = e.latlng.lng;
  
  //     console.log('📍 Coordinates:', {
    //         latitude: lat,
    //         longitude: lng,
    //         coordinates: `[${lat}, ${lng}]`
    //     });
    
    //     // Add marker
    //     L.marker([lat, lng])
    //         .addTo(map)
    //         .bindPopup(`Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
    //         .openPopup();
    // });
    
    //  Coordinates: {latitude: 24.912361403380515, longitude: 91.83300018310548, coordinates: '[24.912361403380515, 91.83300018310548]'}
    //  Coordinates: {latitude: 24.904868651039813, longitude: 91.83233499526979, coordinates: '[24.904868651039813, 91.83233499526979]'}
    //  Coordinates: {latitude: 24.912147331056858, longitude: 91.84336423873903, coordinates: '[24.912147331056858, 91.84336423873903]'}
    //  Coordinates: {latitude: 24.90477133957499, longitude: 91.84327840805054, coordinates: '[24.90477133957499, 91.84327840805054]'
    // // Send location updates
    // if (navigator.geolocation) {
      //   navigator.geolocation.watchPosition(
        //     (position) => {
          //       socket.emit("send-location", {
            //         savedID,
            //         latitude: position.coords.latitude,
            //         longitude: position.coords.longitude,
            //       });
            //     },
            //     (err) => console.error("Location Error:", err),
            //     { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            //   );
            // }












// "use strict";
// const socket = io();



// if (navigator.geolocation) {
//   navigator.geolocation.watchPosition(
//     (position) => {
//       const { latitude, longitude } = position.coords;
//       socket.emit("send-location", { latitude, longitude });
//     },
//     (error) => {
//       console.error(error);
//     },
//     {
//       enableHighAccuracy: true,
//       timeout: 5000,
//       maximumAge: 0,
//     }
//   );
// }

// const map = L.map("map").setView([0, 0], 16);

// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   attribution: "OpenstreetMap",
// }).addTo(map);

// const markers = {};

// socket.on("receive-location", (data) => {
//   const { id, latitude, longitude } = data;
//     console.log(latitude);
//     console.log(longitude);
//     console.log('id :>> ', id);
//     if (id === socket.id) {
//     // only follow your own location
//     map.setView([latitude, longitude], 16);
//     }
//     if (markers[id]) {
//       markers[id].setLatLng([latitude, longitude]);
//     } else {
//     markers[id] = L.marker([latitude, longitude]).addTo(map);
//   }
  
// });


// socket.on("user-disconnected", (id) => {
//     if(markers[id]) {
//         map.removeLayer(markers[id]);
//         delete markers[id];
//     }
// });


        // {
        //     // // Define fixed points (rectangle corners)
        //     // const points = [
        //     // [24.93, -268.1751], // top-left
        //     // [24.93, -268.1596], // top-right
        //     // [24.90, -268.1757], // bottom-left
        //     // [24.90, -268.1589]  // bottom-right
        //     // ];
        //     // const bounds = L.latLngBounds(points);
        
        //     // var map = L.map("map").setView([24.93, -268.1754], 15.5);
        //     // // Fit the map to the rectangle area (bounds) initially
        //     // // map.fitBounds(bounds);
        
        //     // // Prevent user from panning outside the rectangle
        //     // map.setMaxBounds(bounds);
        
        //     // // lock zoom to avoid seeing outside
        //     // map.setMinZoom(map.getZoom());
        //     // // map.setMaxZoom(map.getZoom());
        // }