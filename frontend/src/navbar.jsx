import { Link } from "react-router-dom";
import sustLogo from "./assets/sust.png";
import { GiHamburgerMenu } from "react-icons/gi";
import { useState, useRef, useEffect } from "react";

const NavBar = () => {
  const [optionMenu, setOptionMenu] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const hambarger = useRef(null);
  const btn = useRef(null);

  const optionChange = () => {
    setOptionMenu(!optionMenu);
  };

  const toggleLogin = () => {
    setLoggedIn(!loggedIn);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        btn.current &&
        !btn.current.contains(e.target) &&
        hambarger.current &&
        !hambarger.current.contains(e.target)
      ) {
        setOptionMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="h-16 bg-[#023e8a] flex justify-between items-center m-0.5 mr-0 rounded-2xl pr-3 relative">
      {/* Logo Section */}
      <div className="flex items-center justify-between space-x-5 bg-red-400 w-[60%] md:w-[40%] rounded-2xl p-3">
        <h1 className="text-white font-bold text-3xl">UniRide</h1>
        <img src={sustLogo} alt="Logo" className="w-10 h-10 rounded-3xl" />
      </div>

      {/* Desktop Links + Login */}
      <div className="hidden md:flex items-center justify-end space-x-4 w-[60%]">
        <Link
          to="/"
          className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Home
        </Link>
        <Link
          to="/"
          className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Service
        </Link>
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
        <Link
          to="/help"
          className="font-bold text-[#f2e8cf] text-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Help
        </Link>

        {/* Desktop Login */}
        <button
          onClick={toggleLogin}
          className={`ml-4 px-4 py-2 font-bold text-white transition-all duration-300 ${
            loggedIn
              ? "rounded-full bg-green-500 hover:bg-green-600"
              : "rounded-2xl bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loggedIn ? "U" : "Login"}
        </button>
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
        <Link
          to="/"
          onClick={() => setOptionMenu(false)}
          className="text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Service
        </Link>
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
        <Link
          to="/help"
          onClick={() => setOptionMenu(false)}
          className="text-[#f2e8cf] transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:rounded-2xl hover:p-2 hover:bg-red-400"
        >
          Help
        </Link>

        {/* Mobile Login inside Hamburger */}
        <button
          onClick={() => {
            toggleLogin();
            setOptionMenu(false);
          }}
          className={`mt-2 px-4 py-2 font-bold text-white transition-all duration-300 ${
            loggedIn
              ? "rounded-full bg-green-500 hover:bg-green-600"
              : "rounded-2xl bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loggedIn ? "U" : "Login"}
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
