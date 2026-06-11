import Navbar from "../components/Navbar";

export default function Experiences() {
  const experiences = [
    {
      title: "Desert Safari Adventure",
      location: "Riyadh, Saudi Arabia",
      price: 95,
      rating: "4.96",
      image:
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=80",
      tag: "Guest favorite",
    },
    {
      title: "Saudi Coffee Tasting",
      location: "Diriyah",
      price: 45,
      rating: "4.91",
      image:
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80",
      tag: "Cultural",
    },
    {
      title: "Private City Night Tour",
      location: "Riyadh",
      price: 70,
      rating: "4.88",
      image:
        "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
      tag: "Popular",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <section className="rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] text-white p-8 md:p-12 mb-10">
          <p className="uppercase tracking-[0.2em] text-sm font-bold text-white/80">
            Staybnb Experiences
          </p>

          <h1 className="text-4xl md:text-6xl font-bold mt-4">
            Discover unforgettable experiences
          </h1>

          <p className="text-white/85 mt-5 max-w-2xl text-lg">
            Book local tours, food tastings, adventures, and unique activities
            hosted by experts.
          </p>

          <div className="mt-8 bg-white rounded-2xl p-3 max-w-3xl flex flex-col md:flex-row gap-3">
            <input
              placeholder="Where are you going?"
              className="flex-1 h-12 px-4 rounded-xl text-gray-900 outline-none bg-gray-50"
            />

            <input
              placeholder="Date"
              className="flex-1 h-12 px-4 rounded-xl text-gray-900 outline-none bg-gray-50"
            />

            <button className="h-12 px-8 rounded-xl bg-[#8363F5] text-white font-semibold hover:bg-[#7152E8] transition">
              Search
            </button>
          </div>
        </section>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Popular experiences
          </h2>
          <p className="text-gray-500 mt-2">
            Handpicked activities loved by guests.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition"
            >
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-72 object-cover"
                />

                <span className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold shadow">
                  {item.tag}
                </span>

                <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center">
                  ♡
                </button>
              </div>

              <div className="p-5">
                <div className="flex justify-between gap-4">
                  <h3 className="font-bold text-lg text-gray-900">
                    {item.title}
                  </h3>
                  <span className="text-sm font-semibold">
                    ⭐ {item.rating}
                  </span>
                </div>

                <p className="text-gray-500 mt-2">
                  {item.location}
                </p>

                <p className="mt-4">
                  <span className="font-bold text-[#8363F5]">
                    ${item.price}
                  </span>{" "}
                  <span className="text-gray-500">/ person</span>
                </p>

                <button className="w-full mt-5 h-12 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold transition">
                  View experience
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}