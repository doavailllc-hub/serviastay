import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Search, XCircle, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

const filters = ["All", "Pending", "active", "Rejected", "Suspended"];

const normalizeStatus = (status) => String(status || "").trim() || "Pending";

const allowedActions = {
  Pending: ["active", "Rejected"],
  active: ["Suspended"],
  Rejected: ["Pending"],
  Suspended: ["active"],
};

export default function AdminTrips() {
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [homeDrafts, setHomeDrafts] = useState({});

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/trip-packages");
      const list = Array.isArray(data) ? data : [];
      setTrips(list);
      setHomeDrafts(
        Object.fromEntries(
          list.map((trip) => [
            trip.id,
            {
              is_top_spot: Boolean(Number(trip.is_top_spot)),
              show_brand_on_home: Boolean(Number(trip.show_brand_on_home)),
              brand_name: trip.brand_name || "",
              home_display_order: Number(trip.home_display_order || 0),
            },
          ])
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Trips load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateHomeDraft = (id, field, value) => {
    setHomeDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };

  const saveHomePlacement = async (trip) => {
    try {
      setActionLoading(true);
      const { data } = await api.put(
        `/admin/trip-packages/${trip.id}/home-placement`,
        homeDrafts[trip.id]
      );
      toast.success(data?.message || "Home placement updated");
      await loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || "Home placement update failed");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadTrips, 0);
    return () => window.clearTimeout(timeout);
  }, [loadTrips]);

  const updateStatus = async (id, status) => {
    try {
      setActionLoading(true);

      await api.put(`/admin/trip-packages/${id}/status`, {
        status,
        admin_note:
          status === "active"
            ? "Approved by admin"
            : status === "Rejected"
            ? "Rejected by admin"
            : status === "Suspended"
            ? "Suspended by admin"
            : null,
      });

      toast.success(status === "active" ? "Trip approved" : `Trip ${status}`);
      await loadTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return trips.filter((trip) => {
      const statusOk = filter === "All" || normalizeStatus(trip.status) === filter;
      const q = search.toLowerCase().trim();

      const searchOk =
        !q ||
        `${trip.title || ""} ${trip.location || ""} ${trip.city || ""} ${
          trip.category || ""
        }`
          .toLowerCase()
          .includes(q);

      return statusOk && searchOk;
    });
  }, [trips, filter, search]);

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">
              Trip Package Moderation
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Trip Approval Center
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Review trip packages and approve them before they appear publicly.
            </p>
          </div>

          <button
            onClick={loadTrips}
            className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trip title, city, category..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
          >
            {filters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-12 text-center text-sm text-gray-500">
            No trip packages found.
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((trip) => {
              const currentStatus = normalizeStatus(trip.status);
              const permitted = allowedActions[currentStatus] || [];
              const homeDraft = homeDrafts[trip.id] || {
                is_top_spot: false,
                show_brand_on_home: false,
                brand_name: "",
                home_display_order: 0,
              };

              return (
              <article
                key={trip.id}
                className="rounded-[24px] border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row">
                  <img
                    src={trip.image}
                    alt=""
                    className="h-36 w-full rounded-2xl object-cover md:w-44"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <h3 className="text-lg font-semibold">{trip.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {trip.location} · {trip.category}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          ₹{Number(trip.price || 0).toLocaleString("en-IN")} /
                          person
                        </p>
                      </div>

                      <StatusBadge status={currentStatus} />
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-gray-500">
                      {trip.description || "No description provided."}
                    </p>

                    <div className="mt-4 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={homeDraft.is_top_spot}
                          onChange={(e) =>
                            updateHomeDraft(trip.id, "is_top_spot", e.target.checked)
                          }
                          className="h-5 w-5 accent-[#2DB281]"
                        />
                        Top destination
                      </label>

                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={homeDraft.show_brand_on_home}
                          onChange={(e) =>
                            updateHomeDraft(trip.id, "show_brand_on_home", e.target.checked)
                          }
                          className="h-5 w-5 accent-[#2DB281]"
                        />
                        Show brand
                      </label>

                      <input
                        value={homeDraft.brand_name}
                        onChange={(e) =>
                          updateHomeDraft(trip.id, "brand_name", e.target.value)
                        }
                        placeholder="Brand name"
                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#2DB281]"
                      />

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="9999"
                          value={homeDraft.home_display_order}
                          onChange={(e) =>
                            updateHomeDraft(
                              trip.id,
                              "home_display_order",
                              Number(e.target.value || 0)
                            )
                          }
                          aria-label="Home display order"
                          className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#2DB281]"
                        />
                        <button
                          disabled={actionLoading}
                          onClick={() => saveHomePlacement(trip)}
                          className="rounded-xl bg-[#2DB281] px-4 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        disabled={actionLoading || !permitted.includes("active")}
                        onClick={() => updateStatus(trip.id, "active")}
                        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>

                      <button
                        disabled={actionLoading || !permitted.includes("Rejected")}
                        onClick={() => updateStatus(trip.id, "Rejected")}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>

                      <button
                        disabled={actionLoading || !permitted.includes("Suspended")}
                        onClick={() => updateStatus(trip.id, "Suspended")}
                        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: "border-green-200 bg-green-50 text-green-700",
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    Suspended: "border-gray-300 bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex h-fit rounded-full border px-3 py-1 text-xs font-semibold ${
        map[status] || map.Pending
      }`}
    >
      {status === "active" ? "Published" : status || "Pending"}
    </span>
  );
}
