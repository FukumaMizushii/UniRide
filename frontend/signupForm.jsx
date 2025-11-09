import Button from "./button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";



const SignupForm = () => {
 
  const navigate = useNavigate();
  const [studentID, setStudentID] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (studentID && password && email) {
     
        alert("Sign Up Successful!");
        navigate('/');
      } 
     
     else {
      alert("Please fill the form!");
    }
  };

 
 
 
 
 
 
 
  return (  

    <div className="bg-cyan-300 p-8 rounded-3xl shadow-lg max-w-md mx-auto mt-10 ">
      <h1 className="text-3xl font-bold mb-6 text-center">Student Sign Up</h1>
        
         <form  onSubmit={handleSubmit} className="flex flex-col space-y-2">
           
            <h2 className="font-bold ">Enter Email :</h2>
            <input className="border-2 rounded-xl p-3" type="email" placeholder="abc@gmail.com" value={email} onChange={(e)=> setEmail(e.target.value)} required /><br />
           
           
              <h2 className="font-bold"> Student ID :</h2>
              <input className="border-2 rounded-xl p-3" type="text" placeholder="20223310.." value={studentID} onChange={(e)=> setStudentID(e.target.value)} required/><br />
            
            
                <h2 className="font-bold">Confirm Student ID :</h2>
                <input className="border-2 rounded-xl p-3" type="text" placeholder="20223310.." value={studentID} onChange={(e)=> setStudentID(e.target.value)} required/><br />
              
                  <h2 className="font-bold">Create Password :</h2>
                  <input className="border-2 rounded-xl p-3" type="password" placeholder="password:" value={password} onChange={(e)=> setPassword(e.target.value)} required/><br />
                
                  <h2 className="font-bold">Confirm Password :</h2>
                  <input className="border-2 rounded-xl p-3" type="password" placeholder="Confirm password:" value={password} onChange={(e)=> setPassword(e.target.value)} required/><br />
                
           
            <Button messeage={"Sign Up"} />

   </form>


    </div>
   
     


  );
}
 
export default SignupForm;