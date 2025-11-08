import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from './navbar';
import Hero from './Hero';
import OrderSec from './Order';
import SignUp from './signup';
import Footer from './footer';
import MapSec from './mapSec';
import StudentLg from "./Student_login";
import DriverLg from "./Driver_login";
import DriverPortal from "./DriverPortal";
import Help from "./help";
import Button from "./button";


function App() {
 
  return (
   <BrowserRouter>
      <NavBar />
      <Routes>  
        <Route path="/points" element={ <MapSec />} />
        <Route path="/student" element={ <StudentLg />} />
        <Route path="/driver" element={ <DriverLg />} />
        <Route path="/help" element={ <Help />} />   
        <Route path="/driverPortal" element={ <DriverPortal />} />


        <Route path="/" element={
          <>
            <Hero />
            <OrderSec />
            <SignUp />
            <Footer />
            
          </>
        } />
      </Routes>
   </BrowserRouter>
  )
}

export default App
