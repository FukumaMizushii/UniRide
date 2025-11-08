import React, { useState, useEffect } from "react";
import image1 from "./assets/image1.jpg";
import image2 from "./assets/image2.jpg";
import image3 from "./assets/image3.jpg";
import image4 from "./assets/image4.jpg";
const Hero = () => {
 
   const photos = [image1 , image2 , image3 , image4 ];
   const [currentIndex, setCurrentIndex] = useState(0);

     {/* Hero section Photo rendering  */}

     useEffect(() => {
      const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, 3000); 

    return () => clearInterval(timer); 
  }, [photos.length]);
 


  return ( 

    <div className="w-full h-70 sm:h-84  rounded-2xl relative overflow-hidden">
      <img
        src={photos[currentIndex]}
        alt="Slideshow"
        className="w-full inset-0 h-full p-5 object-fit transition-all duration-700 ease-in"
      />
    </div>


   );
}
 
export default Hero;