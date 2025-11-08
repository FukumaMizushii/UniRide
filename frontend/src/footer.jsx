import { FaRegCopyright } from "react-icons/fa";

const Footer = () => {
  return ( 

  <div className="w-full bg-[#03045e] text-white py-10 px-6 rounded-2xl">
  <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
    <div className="flex flex-col space-y-3">
      <h2 className="text-2xl font-bold text-[#48cae4]">UniRide</h2>
      <p className="text-sm text-gray-300">
        Safe, fast, and reliable rides for SUST teachers and students. Your comfort is our priority.
      </p>
    </div>
    <div className="flex flex-col space-y-2">
      <h3 className="text-lg font-semibold text-[#48cae4]">Quick Links</h3>
      <a href="#" className="hover:text-[#90e0ef]">Home</a>
      <a href="#" className="hover:text-[#90e0ef]">About</a>
      <a href="#" className="hover:text-[#90e0ef]">Book Ride</a>
      <a href="#" className="hover:text-[#90e0ef]">Support</a>
    </div>
    <div className="flex flex-col space-y-3">
      <h3 className="text-lg font-semibold text-[#48cae4]">Contact</h3>
      <p>Email: support@uniride3573.com</p>
      <p>Phone: +8801889666533</p>
      <p>Location: Shahjalal University of Science & Technology, Sylhet</p>
      
    </div>
  </div>
  <div className="text-center flex justify-center items-center mt-8 text-gray-400 text-sm border-t border-gray-700 pt-4">
       <FaRegCopyright className="font-bold pr-1 text-2xl "/>2025 UniRide. All Rights Reserved.
  </div>
</div>




   );
}
 
export default Footer;