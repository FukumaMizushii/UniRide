import { Link } from "react-router-dom";
import sustLogo from "./assets/sust.png";
import { GiHamburgerMenu } from "react-icons/gi";
import { useState, useRef, useEffect } from "react";

const NavBar = () => {

  const [optionMenu, setOptionMenu] = useState(false);
  const hambarger = useRef(null);
  const btn = useRef(null);
  


    const optionChange = () => {
      setOptionMenu(!optionMenu);
        
     }

      useEffect (() => {
      const handleClickOutside = (e) => {
        if (btn.current && !btn.current.contains(e.target) && hambarger.current && !hambarger.current.contains(e.target)) {
          setOptionMenu(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    },[]); 

  return ( 

    
     <nav className="h-16 bg-[#023e8a] flex justify-between  m-0.5 mr-0 rounded-2xl align-center"> 
         {/* This is NavBar Section */}

          <div className="flex flex-row justify-around  bg-red-400 w-[60%] md:w-[40%] rounded-2xl ">
            <h1 className="text-white  font-bold text-3xl ml-6 mt-3 rounded-3xl">UniRide</h1>
            <img src={sustLogo} alt="" className="w-10 h-10  mt-3 mr-1 rounded-3xl" />
          </div>
         
           {/* Desktop or large screen  */}

          <div  className="md:w-[60%]  flex items-center justify-end mr-5 pr-5 rounded-2xl ">
                  <div className="hidden  flex-row md:flex space-x-4 font-bold text-lg  rounded-3xl  justify-between items-center ">
                        <Link to  = '/'  className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                        hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Home</Link>
                        <Link to  = '/'  className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                        hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Service</Link>
                        <Link to = '/student'   className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                          hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Student</Link>
                        <Link to = '/driver'  className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                          hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Driver</Link>
                        <Link to  = '/help'  className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                          hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400 " href="#">Help</Link>
                        
                  </div> 


       {/* For mobile and Tab device */}
         
      <button ref={btn} onClick={optionChange}
        className="md:hidden p-2 rounded-lg text-[#fefae0]  flex justify-end hover:bg-blue-700  shadow-lg ">
        <GiHamburgerMenu className="text-4xl" />
      </button>

            {optionMenu &&  (
              <div ref={hambarger} className="options absolute right-0 top-14 flex-col flex space-y-4 sm:text-black font-bold text-lg  bg-blue-400   w-40 h-60 rounded-3xl p-6 shadow-2xl z-50 ">
                <Link to  = '/' onClick={()=> setOptionMenu(false)} className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                 hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Home</Link>
                 <Link to  = '/' onClick={()=> setOptionMenu(false)} className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                 hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Service</Link>
                 <Link to = '/student' onClick={()=> setOptionMenu(false)}  className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                  hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400"  href="#">Student</Link>
                 <Link to = '/driver' onClick={()=> setOptionMenu(false)} className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                  hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" hover:rounded-2xl hover:p-2 hover:bg-red-400 href="#">Driver</Link>
                 <Link to  = '/help' onClick={()=> setOptionMenu(false)} className="none font-bold text-center text-[#f2e8cf]  transition-transform duration-300 
                                   hover:-translate-y-2 hover:shadow-lg text-xl hover:rounded-2xl hover:p-2 hover:bg-red-400" href="#">Help</Link>
                
                </div> 
          )}
          </div>
        
     </nav>



   );
}
 
export default NavBar;