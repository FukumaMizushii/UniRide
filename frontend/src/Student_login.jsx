import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";
import Button from "./button";
import { FaCarSide } from "react-icons/fa";

const StudentLg = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill all fields!");
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
        // Store user info from database
        localStorage.setItem("user_id", data.user.id);
        localStorage.setItem("user_name", data.user.name);
        localStorage.setItem("user_role", data.user.role);
        localStorage.setItem("student_id", data.user.studentId);

        // Register with socket using database ID
        socket.emit("register-user", {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
        });

        console.log("✅ Student logged in from database:", data.user.name);
        window.dispatchEvent(new Event("userLogin"));
        navigate("/points");
      } else {
        setError(data.message || "Login failed!");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed! Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center bg-[#cbbfc1] p-10 rounded-2xl m-5 shadow-2xl">
      <div className="flex flex-col justify-center items-center mb-4">
        <FaCarSide className="font-bold text-9xl text-[#ff006e]" />
        <section className="text-3xl font-bold text-[#ff006e]">UniRide</section>
        <h2 className="text-4xl font-bold mb-4 text-[#2b2d42] pt-5">
          Student Login
        </h2>
      </div>

      {error && (
        <div className="w-full max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="mr-2">❌</span>
            {error}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col justify-center items-center space-y-4 w-full max-w-md"
      >
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          className="w-full bg-white border-black px-4 py-3 border-2 border-dashed rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
          required
          disabled={loading}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full bg-white border-black px-4 py-3 border-2 border-dashed rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
          required
          disabled={loading}
        />

        <Button
          messeage={loading ? "Logging in..." : "Log in"}
          disabled={loading}
          onClick={handleSubmit}
        />
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-700">
          Don't have an account?{" "}
          <a
            href="/studentsu"
            className="text-blue-600 hover:text-blue-800 font-semibold underline"
          >
            Sign up as Student
          </a>
        </p>
      </div>
    </div>
  );
};

export default StudentLg;
