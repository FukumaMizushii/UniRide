import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";
import Button from "./button";
import { FaCarSide } from "react-icons/fa";

const StudentLg = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.email || !formData.password) {
      alert("Please fill all fields!");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5500/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: "student",
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user info
        localStorage.setItem("user_id", data.user.id);
        localStorage.setItem("user_name", data.user.name);
        localStorage.setItem("user_role", data.user.role);

        // Register with socket
        socket.emit("register-user", {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
        });

        console.log("✅ Student logged in:", data.user.name);
        navigate("/points");
      } else {
        alert(data.message || "Login failed!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed! Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-[#cbbfc1] p-10 rounded-2xl m-5 shadow-2xl">
      <div className="flex flex-col justify-center items-center mb-4">
        <FaCarSide className="font-bold text-9xl text-[#ff006e]" />
        <section className="text-3xl font-bold text-[#ff006e]">UniRide</section>
        <h2 className="text-4xl font-bold mb-4 text-[#2b2d42] pt-5">Student Login</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-84 bg-white border-black px-4 py-2 border-2 border-dashed rounded-lg focus:outline-none shadow-2xl"
          required 
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-84 bg-white border-black px-4 py-2 border-2 border-dashed rounded-lg focus:outline-none shadow-2xl"
          required
        />
        <Button 
          messeage={loading ? "Logging in..." : "Log in"} 
          disabled={loading}
        />
      </form>
    </div>
  );
};

export default StudentLg;