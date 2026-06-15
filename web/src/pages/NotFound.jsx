import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFC] px-4">
      <div className="max-w-xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#F4F1FF] text-5xl">
          🏡
        </div>

        <h1 className="text-6xl font-black text-[#8363F5]">404</h1>

        <h2 className="mt-4 text-3xl font-bold text-gray-900">
          Page not found
        </h2>

        <p className="mt-3 text-gray-500">
          The page you are looking for may have been moved, deleted, or does not exist.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 font-semibold hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <button
            onClick={() => navigate("/home")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#8363F5] px-6 font-semibold text-white hover:bg-[#7152E8]"
          >
            <Home size={18} />
            Go Home
          </button>

          <button
            onClick={() => navigate("/search-results")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 px-6 font-semibold hover:bg-gray-50"
          >
            <Search size={18} />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}