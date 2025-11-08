const Button = ({ messeage, onClick, disabled = false }) => {
  return (
    <button 
      className={`mb-5 px-6 py-2 rounded-2xl font-semibold transition-transform duration-300 hover:-translate-y-1 ${
        disabled 
          ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
          : 'bg-[#023e8a] text-white hover:bg-[#03045e] hover:shadow-lg'
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {messeage}
    </button>
  );
}
 
export default Button;