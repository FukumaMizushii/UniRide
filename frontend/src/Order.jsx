import image from './assets/cng.jpg';
import { FaLocationDot } from "react-icons/fa6";
import { FaLocationCrosshairs } from "react-icons/fa6";
import Button from './button'


const OrderSec = () => {
  return ( 
     
  
      <div className=" mt-5 sm:flex sm:justify-center rounded-2xl items-center ">
           
          <div className="flex flex-col justify-center items-center  bg-amber-300 rounded-2xl m-4"> 
             <h1 className='font-bold text-center font-serif p-5 text-xl sm:text-2xl'> UniRide is a ride sharing App for the Teacher & students of SUST  </h1>
              <img src={image} alt="Order Illustration" className="w-96 p-4 rounded-2xl object-fill bg-inherit"/>  
          </div>

             

      </div>


   );
}
 
export default OrderSec;