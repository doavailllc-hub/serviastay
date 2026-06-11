import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center">
        {/* Illustration */}
        <div className="w-32 h-32 mx-auto rounded-full bg-[#F4F1FF] flex items-center justify-center text-7xl mb-8">
          🏡
        </div>

        {/* Error Code */}
        <p className="text-[#8363F5] font-bold text-lg tracking-widest uppercase">
          Error 404
        </p>

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-900 mt-3">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="text-gray-500 mt-5 leading-7">
          Sorry, the page you're looking for doesn't exist or has been moved.
          Let's get you back to exploring amazing places.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link to="/home">
            <button className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold transition shadow-lg">
              🏠 Go Home
            </button>
          </Link>

          <Link to="/help-center">
            <button className="w-full sm:w-auto px-8 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition">
              💬 Help Center
            </button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-400 mt-8">
          Staybnb • Find your next perfect stay
        </p>
      </div>
    </div>
  );
}