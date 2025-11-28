import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";
import Button from "./button";
import { FaCarSide } from "react-icons/fa";

const DriverLg = () => {
  const navigate = useNavigate();
  const [AutoNo, setAutoNo] = useState("");
  const [pin, setPin] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (AutoNo && pin) {
      // Register with backend
      socket.emit("register-user", {
        id: AutoNo,
        name: `Driver_${AutoNo}`,
        role: "driver",
      });

      navigate("/driverPortal");
    } else {
      alert("Please fill the form!");
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-[#cbbfc1] p-10 rounded-2xl m-5 shadow-2xl">
      <div className="flex flex-col justify-center items-center mb-4">
        <FaCarSide className="font-bold text-9xl  text-[#ff006e]" />
        <section className="text-3xl font-bold text-[#ff006e]">
          {" "}
          UniRide
        </section>

        <h2 className="text-4xl font-bold mb-4 text-[#2b2d42] pt-5">
          Driver Login
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col justify-center items-center space-y-4"
      >
        <input
          type="text"
          placeholder="Auto No"
          value={AutoNo}
          onChange={(e) => setAutoNo(e.target.value)}
          className="w-84 bg-white border-black px-4 py-2 border-2 border-dashed rounded-lg focus:outline-none shadow-2xl"
          required
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPin(e.target.value)}
          className="w-84 bg-white border-black px-4 py-2 border-2 border-dashed rounded-lg focus:outline-none shadow-2xl"
          required
        />
        <Button messeage={"Log in"} />
      </form>
    </div>
  );
};

export default DriverLg;
