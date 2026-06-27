
import Navbar from "../components/Navbar";

export default function Reviews() {
  const reviews = [
    {
      name: "Sarah Johnson",
      rating: 5.0,
      date: "May 2026",
      comment:
        "Clean villa, great host, beautiful location. One of the best stays we've had!",
    },
    {
      name: "Ahmed Ali",
      rating: 4.8,
      date: "April 2026",
      comment:
        "Easy check-in, excellent service, and very comfortable rooms. Highly recommended.",
    },
    {
      name: "Emily Brown",
      rating: 5.0,
      date: "March 2026",
      comment:
        "Amazing experience! The property looked exactly like the photos and the host was very friendly.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Reviews
          </h1>

          <p className="text-gray-500 mt-2">
            Guest feedback and ratings.
          </p>
        </div>

        {/* Rating Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h2 className="text-5xl font-bold text-[3b71e6]">
                4.9 ★
              </h2>

              <p className="text-gray-500 mt-2">
                Based on 248 verified reviews
              </p>
            </div>

            <div className="mt-6 md:mt-0">
              <button className="px-6 py-3 rounded-xl bg-[3b71e6] hover:bg-[#7152E8] text-white font-semibold transition">
                View All Reviews
              </button>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[3b71e6] text-white flex items-center justify-center font-bold text-lg">
                    {review.name.charAt(0)}
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {review.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {review.date}
                    </p>
                  </div>
                </div>

                <span className="font-bold text-[3b71e6]">
                  ★ {review.rating}
                </span>
              </div>

              <p className="text-gray-600 mt-5 leading-7">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

