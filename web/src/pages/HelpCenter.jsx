import Navbar from "../components/Navbar";

export default function HelpCenter() {
  const helpCards = [
    {
      icon: "🧳",
      title: "Booking help",
      desc: "Change dates, cancel reservations, and contact hosts.",
    },
    {
      icon: "🏠",
      title: "Hosting help",
      desc: "Manage listings, pricing, availability, and guests.",
    },
    {
      icon: "💳",
      title: "Payments",
      desc: "Payment methods, refunds, payouts, and invoices.",
    },
    {
      icon: "⚙️",
      title: "Account",
      desc: "Profile, login, security, and notification settings.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="max-w-3xl mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Hi, how can we help?
          </h1>

          <p className="text-gray-500 mt-4 text-lg">
            Find answers about bookings, hosting, payments, and account settings.
          </p>
        </div>

        <div className="relative max-w-3xl mb-10">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>

          <input
            placeholder="Search help articles"
            className="w-full h-16 pl-14 pr-5 rounded-2xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[3b71e6] focus:border-[3b71e6]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {helpCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 hover:shadow-lg hover:-translate-y-1 transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#F4F1FF] flex items-center justify-center text-3xl mb-5">
                {card.icon}
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                {card.title}
              </h3>

              <p className="text-gray-500 mt-2 leading-7">
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Still need help?
            </h2>

            <p className="text-gray-500 mt-2">
              Contact our support team and we'll help you quickly.
            </p>
          </div>

          <button className="px-8 h-14 rounded-xl bg-[3b71e6] hover:bg-[#7152E8] text-white font-semibold transition shadow-lg">
            Contact Support
          </button>
        </div>
      </main>
    </div>
  );
}