import Navbar from "../components/Navbar";

export default function Earnings() {
  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Earnings
          </h1>

          <p className="text-gray-500 mt-2">
            Track your hosting revenue and upcoming payouts.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition">
            <p className="text-gray-500 text-sm font-medium">
              This Month
            </p>

            <h2 className="text-4xl font-bold text-[#8363F5] mt-3">
              $2,420
            </h2>

            <p className="text-green-600 mt-4 font-medium">
              ↑ 12% from last month
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition">
            <p className="text-gray-500 text-sm font-medium">
              Total Earned
            </p>

            <h2 className="text-4xl font-bold text-gray-900 mt-3">
              $18,900
            </h2>

            <p className="text-gray-500 mt-4">
              Lifetime hosting revenue
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition">
            <p className="text-gray-500 text-sm font-medium">
              Upcoming Payout
            </p>

            <h2 className="text-4xl font-bold text-gray-900 mt-3">
              $780
            </h2>

            <p className="text-gray-500 mt-4">
              Expected in 2 days
            </p>
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="mt-10 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-semibold">
              Recent Payouts
            </h2>
          </div>

          <div className="divide-y">
            <div className="flex justify-between items-center p-6 hover:bg-gray-50 transition">
              <div>
                <h3 className="font-semibold">
                  Luxury Beach Villa
                </h3>
                <p className="text-gray-500 text-sm">
                  June 12 • Completed
                </p>
              </div>

              <span className="font-bold text-[#8363F5]">
                +$440
              </span>
            </div>

            <div className="flex justify-between items-center p-6 hover:bg-gray-50 transition">
              <div>
                <h3 className="font-semibold">
                  Modern Apartment
                </h3>
                <p className="text-gray-500 text-sm">
                  July 5 • Completed
                </p>
              </div>

              <span className="font-bold text-[#8363F5]">
                +$620
              </span>
            </div>

            <div className="flex justify-between items-center p-6 hover:bg-gray-50 transition">
              <div>
                <h3 className="font-semibold">
                  Downtown Loft
                </h3>
                <p className="text-gray-500 text-sm">
                  August 1 • Completed
                </p>
              </div>

              <span className="font-bold text-[#8363F5]">
                +$780
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold">
            Great job! 🎉
          </h2>

          <p className="mt-3 text-white/90 max-w-2xl">
            Your properties are performing well this month.
            Keep hosting amazing experiences to increase your
            earnings and receive Super Host benefits.
          </p>
        </div>
      </main>
    </div>
  );
}