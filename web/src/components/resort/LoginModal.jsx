import { Lock, X } from "lucide-react";

export default function LoginModal({ onClose, onLogin, onSignup }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 transition hover:bg-gray-100"
          aria-label="Close login modal"
        >
          <X size={20} />
        </button>

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
          <Lock size={24} />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
          Log in to continue
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Please log in or create an account to reserve this stay, message the
          host, or save it to your wishlist.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onLogin}
            className="h-11 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Continue with email
          </button>

          <button
            type="button"
            onClick={onSignup}
            className="h-11 w-full rounded-xl border border-gray-200 text-sm font-medium transition hover:bg-gray-50"
          >
            Create account
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl text-sm text-gray-500 transition hover:bg-gray-50"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}