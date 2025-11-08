import image from './assets/cng.jpg';
import { FaLocationDot } from "react-icons/fa6";
import { FaLocationCrosshairs } from "react-icons/fa6";
import Button from './button'


const OrderSec = () => {
  return ( 
     
  
      <div className=" mt-5 sm:flex sm:justify-between rounded-2xl items-center ">
           
          <div className="flex flex-col justify-center items-center sm:w-[50%] bg-amber-300 rounded-2xl m-4"> 
             <h1 className='font-bold text-center font-serif p-5 text-xl sm:text-2xl'> UniRide is a ride sharing App for the Teacher & students of SUST  </h1>
              <img src={image} alt="Order Illustration" className="w-96 p-4 rounded-2xl object-fill bg-inherit"/>  
          </div>

              <div className="sm:w-[50%] flex flex-col justify-center items-center m-2 space-y-2 shadow-2xl rounded-3xl bg-[#48cae4]">
                  <h2 className="text-4xl font-bold mb-4 text-black pt-5">Call Your Ride Now!</h2>
                  <div className='w-[80%] rounded-2xl flex justify-center items-center border flex-row bg-[#caf0f8]'>
                     <input type="text" placeholder='Your Location'  className="w-[60%]  pl-10 shadow-2xl pr-4 py-2  rounded-lg focus:outline-none   "  required/>
                        <FaLocationDot className='text-4xl shadow-2xl text-[#b81e61] p-0.5 '/>
                  </div>
                  
                  <div className='w-[80%] flex justify-center items-center border mb-5 bg-[#caf0f8] rounded-2xl '> 
                       <input type="text" placeholder='Destination'  className="w-[60%] pl-10 pr-4 py-2 rounded-lg focus:outline-none  shadow-2xl  "  required/>
                        <FaLocationCrosshairs className='text-4xl shadow-2xl text-[#b81e61] p-0.5 '/>
                  </div>
                   <Button messeage ={"Book Now!"} /> 
              </div>

      </div>


   );
}
 
export default OrderSec;