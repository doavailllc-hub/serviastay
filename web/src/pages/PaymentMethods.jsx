import Navbar from "../components/Navbar";
import { CreditCard, Plus, ShieldCheck } from "lucide-react";

export default function PaymentMethods() {
  const cards = [
    {
      type: "Visa",
      number: "**** **** **** 4821",
      expiry: "08/28",
      default: true,
    },
    {
      type: "Mastercard",
      number: "**** **** **** 9124",
      expiry: "11/27",
      default: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Payment methods
            </h1>

            <p className="text-gray-500 mt-2">
              Manage your cards and payment preferences.
            </p>
          </div>

          <button className="mt-5 md:mt-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold transition shadow-lg">
            <Plus size={18} />
            Add Card
          </button>
        </div>

        {/* Saved Cards */}
        <div className="space-y-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-lg transition"
            >
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#F4F1FF] flex items-center justify-center">
                    <CreditCard
                      size={28}
                      className="text-[#8363F5]"
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold">
                      {card.type}
                    </h3>

                    <p className="text-gray-500">
                      {card.number}
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      Expires {card.expiry}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-5 md:mt-0">
                  {card.default && (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                      Default
                    </span>
                  )}

                  <button className="px-5 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition">
                    Edit
                  </button>

                  <button className="px-5 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 transition">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="mt-10 bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F4F1FF] flex items-center justify-center">
              <ShieldCheck
                size={30}
                className="text-[#8363F5]"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                Secure payments
              </h2>

              <p className="text-gray-500 mt-2">
                Your payment information is encrypted and securely
                processed. Staybnb never shares your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold">
            Fast & Secure Checkout 💳
          </h2>

          <p className="mt-3 text-white/90 max-w-2xl">
            Add multiple payment methods and choose your preferred card
            during booking for a seamless experience.
          </p>
        </div>
      </main>
    </div>
  );
}