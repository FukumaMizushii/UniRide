import { Link, useNavigate, useLocation } from "react-router-dom";
import sustLogo from "./assets/sust.png";
import { GiHamburgerMenu } from "react-icons/gi";
import { useState, useRef, useEffect } from "react";
import socket from "./socket";

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [optionMenu, setOptionMenu] = useState(false);
  const [helpDropdownOpen, setHelpDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const hambarger = useRef(null);
  const btn = useRef(null);
  const helpRef = useRef(null);

  // Enhanced authentication check with location dependency
  useEffect(() => {
    const checkAuth = () => {
      const userData = {
        id: localStorage.getItem("user_id"),
        name: localStorage.getItem("user_name"),
        role: localStorage.getItem("user_role"),
        studentId: localStorage.getItem("student_id"),
        autoId: localStorage.getItem("auto_id")
      };
      
      console.log("🔄 Navbar auth check:", userData);
      
      if (userData.id && userData.name && userData.role) {
        setUser(userData);
      } else {
        setUser(null);
      }
    };

    checkAuth();
    
    // Listen for storage changes and custom login events
    const handleStorageChange = () => {
      console.log("📦 Storage changed, updating navbar...");
      checkAuth();
    };
    
    const handleLoginEvent = () => {
      console.log("🔑 Login event received, updating navbar...");
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogin', handleLoginEvent);
    window.addEventListener('userLogout', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogin', handleLoginEvent);
      window.removeEventListener('userLogout', handleStorageChange);
    };
  }, [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Close hamburger menu
      if (
        btn.current &&
        !btn.current.contains(e.target) &&
        hambarger.current &&
        !hambarger.current.contains(e.target)
      ) {
        setOptionMenu(false);
      }

      // Close help dropdown
      if (
        helpRef.current &&
        !helpRef.current.contains(e.target)
      ) {
        setHelpDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const optionChange = () => {
    setOptionMenu(!optionMenu);
  };

  const toggleHelpDropdown = () => {
    setHelpDropdownOpen(!helpDropdownOpen);
  };

  const handleLogout = () => {
    console.log("🚪 Logging out user:", user);
    
    // Clear all user data from localStorage
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    localStorage.removeItem("student_id");
    localStorage.removeItem("auto_id");
    
    setUser(null);
    setOptionMenu(false);
    setHelpDropdownOpen(false);
    
    // Dispatch logout event
    window.dispatchEvent(new Event('userLogout'));
    
    // Redirect to home page
    navigate("/");
    
    // Show logout message
    alert("Successfully logged out!");
  };

  // Sync with database function
  const handleSyncWithDatabase = async () => {
    if (!user) {
      alert("Please login first!");
      return;
    }

    try {
      console.log("🔄 Manual sync requested by user:", user.name);
      
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('manualSyncRequest', { 
        detail: { userId: user.id, role: user.role } 
      }));
      
      setHelpDropdownOpen(false);
      alert("🔄 Sync request sent! Your data will be updated shortly.");
    } catch (error) {
      console.error("❌ Error triggering sync:", error);
      alert("❌ Failed to sync with database. Please try again.");
    }
  };

  // Debug function to check current state
  const handleDebugInfo = () => {
    if (!user) {
      alert("Please login first!");
      return;
    }

    const debugInfo = {
      user: user,
      localStorage: {
        userId: localStorage.getItem("user_id"),
        userName: localStorage.getItem("user_name"),
        userRole: localStorage.getItem("user_role")
      },
      socket: {
        connected: socket.connected,
        id: socket.id
      },
      currentTime: new Date().toLocaleString()
    };

    console.log("🐛 Debug Info:", debugInfo);
    alert(`🔍 Debug Info:\n\nUser: ${user.name} (${user.role})\nSocket: ${socket.connected ? 'Connected' : 'Disconnected'}\nTime: ${debugInfo.currentTime}`);
    setHelpDropdownOpen(false);
  };

  // Clear local data (for testing)
  const handleClearLocalData = () => {
    if (confirm("⚠️ This will clear all local data. Continue?")) {
      localStorage.clear();
      window.dispatchEvent(new Event('userLogout'));
      alert("🧹 Local data cleared! Please refresh the page.");
      setHelpDropdownOpen(false);
    }
  };

  return (
    <nav className="h-16 bg-[#023e8a] flex justify-between items-center m-0.5 mr-0 rounded-2xl pr-3 relative">
      {/* Logo Section */}
      <div className="flex items-center justify-between space-x-5 bg-red-400 w-[60%] md:w-[40%] rounded-2xl p-3">
        <h1 className="text-white font-bold text-3xl">UniRide</h1>
        <img src={sustLogo} alt="Logo" className="w-10 h-10 rounded-3xl" />
      </div>

      {/* Desktop Links + User Info */}
      <div className="hidden md:flex items-center justify-end space-x-4 w-[60%]">
        <Link
          to="/"
          className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Home
        </Link>
        
        {/* Show Student/Driver links only if not logged in */}
        {!user && (
          <>
            <Link
              to="/student"
              className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
            >
              Student
            </Link>
            <Link
              to="/driver"
              className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
            >
              Driver
            </Link>
          </>
        )}
        
        {/* Show appropriate portal link based on role */}
        {user && (
          <Link
            to={user.role === 'student' ? '/points' : '/driverPortal'}
            className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
          >
            {user.role === 'student' ? 'Student Portal' : 'Driver Portal'}
          </Link>
        )}
        
        {/* Help Dropdown */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={toggleHelpDropdown}
            className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
          >
            Help & Tools
          </button>
          
          {helpDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
              <div className="p-2">
                {/* Sync Option */}
                <button
                  onClick={handleSyncWithDatabase}
                  className="w-full text-left px-4 py-3 text-green-700 font-semibold hover:bg-green-50 rounded-xl transition-colors flex items-center"
                >
                  <span className="mr-2">🔄</span>
                  Sync with Database
                </button>
                
                {/* Debug Info */}
                <button
                  onClick={handleDebugInfo}
                  className="w-full text-left px-4 py-3 text-blue-700 font-semibold hover:bg-blue-50 rounded-xl transition-colors flex items-center"
                >
                  <span className="mr-2">🐛</span>
                  Debug Information
                </button>
                
                {/* Clear Data (for testing) */}
                <button
                  onClick={handleClearLocalData}
                  className="w-full text-left px-4 py-3 text-red-700 font-semibold hover:bg-red-50 rounded-xl transition-colors flex items-center"
                >
                  <span className="mr-2">🧹</span>
                  Clear Local Data
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-1"></div>
                
                {/* Regular Help Links */}
                <Link
                  to="/help"
                  onClick={() => setHelpDropdownOpen(false)}
                  className="block px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  📖 User Guide
                </Link>
                <a
                  href="mailto:support@uniride.com"
                  className="block px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  📧 Contact Support
                </a>
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Login - SINGLE SET OF BUTTONS */}
        {user ? (
          <div className="flex items-center space-x-3 ml-4">
            <span className="text-white font-semibold">
              {user.name} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 font-bold text-white bg-red-500 rounded-2xl hover:bg-red-600 transition-all duration-300"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 ml-4">
            <Link
              to="/student"
              className="px-4 py-2 font-bold text-white bg-blue-500 rounded-2xl hover:bg-blue-600 transition-all duration-300"
            >
              Student Login
            </Link>
            <Link
              to="/driver"
              className="px-4 py-2 font-bold text-white bg-green-500 rounded-2xl hover:bg-green-600 transition-all duration-300"
            >
              Driver Login
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Hamburger */}
      <div className="md:hidden flex items-center">
        <button
          ref={btn}
          onClick={optionChange}
          className="p-2 rounded-lg text-[#fefae0] hover:bg-blue-700 shadow-lg"
        >
          <GiHamburgerMenu className="text-4xl" />
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      <div
        ref={hambarger}
        className={`absolute right-4 top-16 bg-blue-400 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 font-bold text-lg transition-all duration-500 ease-in-out overflow-hidden z-50
        ${optionMenu ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <Link
          to="/"
          onClick={() => setOptionMenu(false)}
          className="text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Home
        </Link>
        
        {/* Show Student/Driver links only if not logged in */}
        {!user && (
          <>
            <Link
              to="/student"
              onClick={() => setOptionMenu(false)}
              className="text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
            >
              Student
            </Link>
            <Link
              to="/driver"
              onClick={() => setOptionMenu(false)}
              className="text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
            >
              Driver
            </Link>
          </>
        )}
        
        {/* Show appropriate portal link based on role */}
        {user && (
          <Link
            to={user.role === 'student' ? '/points' : '/driverPortal'}
            onClick={() => setOptionMenu(false)}
            className="text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
          >
            {user.role === 'student' ? 'Student Portal' : 'Driver Portal'}
          </Link>
        )}
        
        {/* Mobile Help Section */}
        <div className="border-t border-blue-300 pt-2">
          <div className="text-[#f2e8cf] font-bold mb-2">Help & Tools:</div>
          
          {user && (
            <>
              <button
                onClick={() => {
                  handleSyncWithDatabase();
                  setOptionMenu(false);
                }}
                className="w-full text-left text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-green-500"
              >
                🔄 Sync with Database
              </button>
              
              <button
                onClick={() => {
                  handleDebugInfo();
                  setOptionMenu(false);
                }}
                className="w-full text-left text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-blue-500"
              >
                🐛 Debug Info
              </button>
            </>
          )}
          
          <Link
            to="/help"
            onClick={() => setOptionMenu(false)}
            className="block text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
          >
            📖 User Guide
          </Link>
        </div>

        {/* Mobile Login/Logout - SINGLE SET */}
        {user ? (
          <div className="flex flex-col space-y-2 mt-2">
            <div className="text-white text-center py-2">
              Welcome, {user.name}!
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 font-bold text-white bg-red-500 rounded-2xl hover:bg-red-600 transition-all duration-300"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2 mt-2">
            <Link
              to="/student"
              onClick={() => setOptionMenu(false)}
              className="px-4 py-2 font-bold text-white bg-blue-500 rounded-2xl hover:bg-blue-600 transition-all duration-300 text-center"
            >
              Student Login
            </Link>
            <Link
              to="/driver"
              onClick={() => setOptionMenu(false)}
              className="px-4 py-2 font-bold text-white bg-green-500 rounded-2xl hover:bg-green-600 transition-all duration-300 text-center"
            >
              Driver Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;