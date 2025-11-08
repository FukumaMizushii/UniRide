import { Link } from "react-router-dom";
import MapSec from "./mapSec";

const SignUp = () => {
  return ( 

              <div className="text-[#415a77] font-bold m-2 p-5 rounded-2xl  w-full justify-between  items-center bg-[#023e8a] flex flex-row space-y-2">
                   
                <div>
                   <Link to ="/points"
                           className="font-bold text-2xl font-sans p-10 text-white  transition-transform duration-300 hover:-translate-y-2">PickUp Points</Link>   
                 </div>
                   <div>
                   <a href="#" className=' transition-transform duration-300 p-5 hover:-translate-y-2 hover: text-2xl font-serif font-bold  text-white'>sign up</a>
                   </div>
                   
               </div>

    );
}
 
export default SignUp;