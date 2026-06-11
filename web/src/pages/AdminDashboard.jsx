import Navbar from "../components/Navbar";

export default function AdminDashboard() {
  const stats = [
    { title: "Users", value: "1,248", icon: "👥", change: "+12%" },
    { title: "Listings", value: "342", icon: "🏠", change: "+8%" },
    { title: "Bookings", value: "890", icon: "📅", change: "+18%" },
    { title: "Revenue", value: "$82k", icon: "💰", change: "+24%" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="text-gray-500 mt-2">
            Control users, listings, bookings, and reports.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#F4F1FF] flex items-center justify-center text-3xl mb-5">
                {item.icon}
              </div>

              <p className="text-gray-500 font-medium">{item.title}</p>

              <h2 className="text-4xl font-bold text-gray-900 mt-2">
                {item.value}
              </h2>

              <p className="text-green-600 font-semibold mt-4">
                {item.change} this month
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 mt-10">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-semibold">
                Recent Bookings
              </h2>
            </div>

            <div className="divide-y">
              {[
                ["Luxury Beach Villa", "Jmc", "$440", "Confirmed"],
                ["Modern Apartment", "Ahmed", "$620", "Completed"],
                ["Downtown Loft", "Sara", "$780", "Pending"],
              ].map(([listing, user, price, status]) => (
                <div
                  key={listing}
                  className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-gray-50 transition"
                >
                  <div>
                    <h3 className="font-semibold">{listing}</h3>
                    <p className="text-gray-500 text-sm">Guest: {user}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#8363F5]">
                      {price}
                    </span>

                    <span className="px-3 py-1 rounded-full bg-[#F4F1FF] text-[#8363F5] text-sm font-semibold">
                      {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-2xl font-semibold mb-6">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <button className="w-full h-12 rounded-xl bg-[#8363F5] text-white font-semibold hover:bg-[#7152E8] transition">
                Manage Users
              </button>

              <button className="w-full h-12 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition">
                Review Listings
              </button>

              <button className="w-full h-12 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition">
                View Reports
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}