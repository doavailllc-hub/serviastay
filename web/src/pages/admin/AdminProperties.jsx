import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Home,
  MapPin,
  User,
  Mail,
  IndianRupee,
} from "lucide-react";
import api from "../../api/api";

export default function AdminProperties() {
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/properties");
      setProperties(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Properties load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const text = `${p.title || ""} ${p.location || ""} ${p.host_name || ""}`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (category === "all" || p.category === category) &&
        (status === "all" || String(p.status || "pending") === status)
      );
    });
  }, [properties, search, category, status]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/properties/${id}/status`, { status: newStatus });
      loadProperties();
    } catch (err) {
      alert(err.response?.data?.message || "Status update failed");
    }
  };

  const deleteProperty = async (id) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      await api.delete(`/admin/properties/${id}`);
      loadProperties();
    } catch (err) {
      alert(err.response?.data?.message || "Property delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4 sm:p-6 lg:p-8">
      <Header onRefresh={loadProperties} />

      <Stats total={properties.length} filtered={filtered.length} />

      <Filters
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        status={status}
        setStatus={setStatus}
      />

      <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-black text-gray-900">All Listings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review property details, approve, reject or delete listings.
          </p>
        </div>

        {loading ? (
          <Empty text="Loading properties..." />
        ) : filtered.length === 0 ? (
          <Empty text="No properties found." />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <PropertyRow
                key={p.id}
                property={p}
                onApprove={() => updateStatus(p.id, "approved")}
                onReject={() => updateStatus(p.id, "rejected")}
                onDelete={() => deleteProperty(p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Header({ onRefresh }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EEE9FF] px-4 py-2 text-sm font-bold text-[3b71e6]">
          <Home size={16} />
          Admin Panel
        </div>

        <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          Properties Management
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
          Approve, reject, search, filter and manage all property listings from one place.
        </p>
      </div>

      <button
        onClick={onRefresh}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[3b71e6] px-6 font-bold text-white shadow-lg shadow-[3b71e6]/25 transition hover:bg-[#7152e8] active:scale-[0.98]"
      >
        <RefreshCw size={18} />
        Refresh
      </button>
    </div>
  );
}

function Stats({ total, filtered }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Listings" value={total} />
      <StatCard label="Showing Results" value={filtered} />
      <StatCard label="Active Filter" value={filtered === total ? "None" : "Applied"} />
      <StatCard label="Management" value="Live" />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <h3 className="mt-2 text-2xl font-black text-gray-950">{value}</h3>
    </div>
  );
}

function Filters({ search, setSearch, category, setCategory, status, setStatus }) {
  return (
    <div className="mb-6 grid gap-4 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm lg:grid-cols-4">
      <div className="lg:col-span-2">
        <SearchBox value={search} setValue={setSearch} placeholder="Search by property, location or host..." />
      </div>

      <SelectBox value={category} onChange={setCategory}>
        <option value="all">All Categories</option>
        <option value="Apartment">Apartment</option>
        <option value="House">House</option>
        <option value="Villa">Villa</option>
        <option value="Hotel">Hotel</option>
      </SelectBox>

      <SelectBox value={status} onChange={setStatus}>
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </SelectBox>
    </div>
  );
}

function SearchBox({ value, setValue, placeholder }) {
  return (
    <div className="flex h-13 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 transition focus-within:border-[3b71e6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[3b71e6]/10">
      <Search size={18} className="text-gray-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}

function SelectBox({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-13 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[3b71e6] focus:bg-white focus:ring-4 focus:ring-[3b71e6]/10"
    >
      {children}
    </select>
  );
}

function PropertyRow({ property: p, onApprove, onReject, onDelete }) {
  return (
    <div className="p-5 transition hover:bg-gray-50/70">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row">
          <img
            src={p.image || "/placeholder.jpg"}
            alt={p.title || "Property"}
            className="h-32 w-full rounded-3xl object-cover sm:h-28 sm:w-32"
          />

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-gray-950">{p.title || "Untitled Property"}</h3>
              <StatusBadge status={p.status || "pending"} />
            </div>

            <div className="space-y-1 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <MapPin size={15} />
                {p.location || "No location"}
              </p>

              <p className="flex items-center gap-2">
                <User size={15} />
                Host: {p.host_name || "Unknown"}
              </p>

              <p className="flex items-center gap-2">
                <Mail size={15} />
                {p.host_email || "-"}
              </p>
            </div>

            <p className="mt-3 flex items-center gap-1 text-lg font-black text-[3b71e6]">
              <IndianRupee size={18} />
              {Number(p.price || 0).toLocaleString("en-IN")}
              <span className="text-sm font-semibold text-gray-400">/ night</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => window.open(`/reserve/${p.id}`, "_blank")}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <Eye size={16} />
            View
          </ActionButton>

          <ActionButton
            onClick={onApprove}
            className="bg-green-100 text-green-700 hover:bg-green-200"
          >
            <CheckCircle size={16} />
            Approve
          </ActionButton>

          <ActionButton
            onClick={onReject}
            className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          >
            <XCircle size={16} />
            Reject
          </ActionButton>

          <ActionButton
            onClick={onDelete}
            className="bg-red-100 text-red-600 hover:bg-red-200"
          >
            <Trash2 size={16} />
            Delete
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    approved: "bg-green-100 text-green-700 ring-green-200",
    rejected: "bg-red-100 text-red-600 ring-red-200",
    pending: "bg-yellow-100 text-yellow-700 ring-yellow-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${
        styles[status] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center p-12 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEE9FF] text-[3b71e6]">
          <Home size={24} />
        </div>
        <p className="font-bold text-gray-500">{text}</p>
      </div>
    </div>
  );
}