import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../api/api";

const BRAND = "#7E4FF5";
const statusOptions = ["Available", "Sold Out", "Closed"];

export default function HostPackageDepartures() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState(null);
  const [departures, setDepartures] = useState([]);
  const [form, setForm] = useState({
    departure_date: "",
    total_seats: 20,
    status: "Available",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
  }, [id]);

  const stats = useMemo(() => {
    const totalDepartures = departures.length;
    const available = departures.filter((d) => d.status === "Available").length;
    const soldOut = departures.filter((d) => d.status === "Sold Out").length;
    const totalSeats = departures.reduce(
      (sum, d) => sum + Number(d.total_seats || 0),
      0
    );
    const bookedSeats = departures.reduce(
      (sum, d) => sum + Number(d.booked_seats || 0),
      0
    );

    return {
      totalDepartures,
      available,
      soldOut,
      totalSeats,
      bookedSeats,
    };
  }, [departures]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const [packageRes, departureRes] = await Promise.all([
        api.get(`/experiences/${id}`),
        api.get(`/trip-packages/${id}/departures`),
      ]);

      setPkg(packageRes.data);
      setDepartures(Array.isArray(departureRes.data) ? departureRes.data : []);
    } catch (err) {
      console.error("Departure page load failed:", err);
      setError("Unable to load package departures.");
    } finally {
      setLoading(false);
    }
  };

  const addDeparture = async () => {
    try {
      setError("");

      const token = localStorage.getItem("token");

      if (!form.departure_date) {
        setError("Please select departure date.");
        return;
      }

      setSaving(true);

      await api.post(`/trip-packages/${id}/departures`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setForm({
        departure_date: "",
        total_seats: 20,
        status: "Available",
      });

      await loadPage();
    } catch (err) {
      console.error("Add departure failed:", err);
      setError(
        err.response?.data?.message || "Unable to add departure date."
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (departure) => {
    setEditingId(departure.id);
    setEditForm({
      departure_date: formatInputDate(departure.departure_date),
      total_seats: departure.total_seats || 20,
      booked_seats: departure.booked_seats || 0,
      status: departure.status || "Available",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (departureId) => {
    try {
      setSaving(true);
      setError("");

      const token = localStorage.getItem("token");

      await api.put(`/departures/${departureId}`, editForm, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setEditingId(null);
      setEditForm({});
      await loadPage();
    } catch (err) {
      console.error("Update departure failed:", err);
      setError(
        err.response?.data?.message || "Unable to update departure."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteDeparture = async (departureId) => {
    const ok = window.confirm("Delete this departure date?");
    if (!ok) return;

    try {
      setDeletingId(departureId);

      const token = localStorage.getItem("token");

      await api.delete(`/departures/${departureId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDepartures((prev) => prev.filter((item) => item.id !== departureId));
    } catch (err) {
      console.error("Delete departure failed:", err);
      alert(err.response?.data?.message || "Unable to delete departure.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateEditField = (name, value) => {
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-semibold">Loading departures...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">
              Package Availability
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              Departure dates
            </h1>

            <p className="mt-3 max-w-2xl text-gray-500">
              Manage available travel dates, seats, sold out dates and closed
              departures for this trip package.
            </p>
          </div>

          <button
            onClick={() => navigate(`/experiences/${id}`)}
            className="w-fit rounded-full border border-gray-300 px-6 py-3 text-sm font-black transition hover:border-gray-900"
          >
            View package
          </button>
        </div>

        {pkg && (
          <div className="mt-8 rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-gray-900">{pkg.title}</h2>
            <p className="mt-2 text-gray-500">
              {pkg.location || pkg.city || "Destination"} ·{" "}
              {pkg.package_days || 1} Days /{" "}
              {pkg.package_nights || 0} Nights
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Departures" value={stats.totalDepartures} />
          <StatCard label="Available" value={stats.available} />
          <StatCard label="Sold out" value={stats.soldOut} />
          <StatCard label="Total seats" value={stats.totalSeats} />
          <StatCard label="Booked seats" value={stats.bookedSeats} />
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">
                Add departure
              </h2>

              <div className="mt-5 space-y-4">
                <Input
                  label="Departure date"
                  type="date"
                  value={form.departure_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      departure_date: e.target.value,
                    }))
                  }
                />

                <Input
                  label="Total seats"
                  type="number"
                  value={form.total_seats}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      total_seats: e.target.value,
                    }))
                  }
                />

                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  options={statusOptions}
                />

                <button
                  onClick={addDeparture}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: BRAND }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Add departure
                    </>
                  )}
                </button>
              </div>
            </div>
          </aside>

          <section>
            {departures.length === 0 ? (
              <StateBox>
                <CalendarDays size={34} className="text-gray-400" />
                <h2 className="mt-4 text-2xl font-black text-gray-900">
                  No departures added
                </h2>
                <p className="mt-2 text-gray-500">
                  Add the first available departure date for this package.
                </p>
              </StateBox>
            ) : (
              <div className="grid gap-5">
                {departures.map((departure) => (
                  <DepartureCard
                    key={departure.id}
                    departure={departure}
                    editing={editingId === departure.id}
                    editForm={editForm}
                    updateEditField={updateEditField}
                    onEdit={() => startEdit(departure)}
                    onCancel={cancelEdit}
                    onSave={() => saveEdit(departure.id)}
                    onDelete={() => deleteDeparture(departure.id)}
                    saving={saving}
                    deleting={deletingId === departure.id}
                  />
                ))}
              </div>
            )}
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function DepartureCard({
  departure,
  editing,
  editForm,
  updateEditField,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  saving,
  deleting,
}) {
  const totalSeats = Number(departure.total_seats || 0);
  const bookedSeats = Number(departure.booked_seats || 0);
  const remainingSeats = Math.max(totalSeats - bookedSeats, 0);

  if (editing) {
    return (
      <article className="rounded-[28px] border border-[#E8E0FF] bg-[#F7F5FF] p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            label="Departure date"
            type="date"
            value={editForm.departure_date || ""}
            onChange={(e) =>
              updateEditField("departure_date", e.target.value)
            }
          />

          <Input
            label="Total seats"
            type="number"
            value={editForm.total_seats || 0}
            onChange={(e) => updateEditField("total_seats", e.target.value)}
          />

          <Input
            label="Booked seats"
            type="number"
            value={editForm.booked_seats || 0}
            onChange={(e) => updateEditField("booked_seats", e.target.value)}
          />

          <Select
            label="Status"
            value={editForm.status || "Available"}
            onChange={(e) => updateEditField("status", e.target.value)}
            options={statusOptions}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white"
            style={{ backgroundColor: BRAND }}
          >
            <Save size={17} />
            Save
          </button>

          <button
            onClick={onCancel}
            className="rounded-full border border-gray-300 px-5 py-3 text-sm font-black"
          >
            Cancel
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-xl">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge status={departure.status} />

            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
              {remainingSeats} seats left
            </span>
          </div>

          <h3 className="text-2xl font-black text-gray-900">
            {formatDate(departure.departure_date)}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            Departure ID #{departure.id}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:min-w-[420px]">
          <MiniInfo
            icon={<Users size={17} />}
            label="Total seats"
            value={totalSeats}
          />

          <MiniInfo
            icon={<Users size={17} />}
            label="Booked"
            value={bookedSeats}
          />

          <MiniInfo
            icon={<Users size={17} />}
            label="Remaining"
            value={remainingSeats}
          />
        </div>

        <div className="flex flex-wrap gap-2 md:flex-col">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 px-5 py-3 text-sm font-black transition hover:border-gray-900"
          >
            <Edit size={17} />
            Edit
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-2 rounded-full bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={17} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const styles =
    normalized === "available"
      ? "bg-green-50 text-green-700 border-green-100"
      : normalized === "sold out"
      ? "bg-red-50 text-red-700 border-red-100"
      : normalized === "closed"
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : "bg-yellow-50 text-yellow-700 border-yellow-100";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${styles}`}
    >
      {status || "Available"}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[26px] border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="mb-2 text-[#7E4FF5]">{icon}</div>
      <p className="text-xs font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StateBox({ children }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-gray-200 bg-white p-8 text-center text-gray-500">
      {children}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <input
        {...props}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#7E4FF5]"
      />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <select
        {...props}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#7E4FF5]"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatDate(value) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatInputDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return "";
  }
}