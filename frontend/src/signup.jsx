import { Link } from "react-router-dom";
import { useState } from "react";



const SignUp = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row justify-between items-center bg-[#023e8a] rounded-2xl p-5 m-2 space-y-4 md:space-y-0 relative">
      
      {/* PickUp Points Link */}
      <div>
        <Link
          to="/points"
          className="inline-block font-bold text-2xl font-sans text-white px-6 py-3 rounded-xl
                     transition-transform duration-300 transform hover:-translate-y-2 hover:scale-105 
                     hover:shadow-lg active:translate-y-1 active:scale-95 bg-blue-700"
        >
          PickUp Points
        </Link>
      </div>

      {/* Sign Up Dropdown */}
      <div className="relative">
        {/* Sign Up Button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-block font-bold text-2xl font-serif text-white px-6 py-3 rounded-xl
                     transition-transform duration-300 transform hover:-translate-y-1 hover:scale-105
                     hover:shadow-lg active:translate-y-1 active:scale-95 bg-green-700"
        >
          Sign Up
        </button>

        {/* Dropdown Options */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg overflow-hidden z-50
                          transition-all duration-300 transform origin-top scale-95 animate-fadeIn">
            <Link
              to="/studentsu"
              className="block px-4 py-3 text-green-700 font-semibold hover:bg-green-100 transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              Student Sign Up
            </Link>
            <Link
              to="/driversu"
              className="block px-4 py-3 text-green-700 font-semibold hover:bg-green-100 transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              Driver Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;
