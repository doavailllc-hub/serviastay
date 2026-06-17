import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, CheckCircle, XCircle, Trash2, Eye } from "lucide-react";
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
    await api.put(`/admin/properties/${id}/status`, { status: newStatus });
    loadProperties();
  };

  const deleteProperty = async (id) => {
    if (!confirm("Delete this property?")) return;
    await api.delete(`/admin/properties/${id}`);
    loadProperties();
  };

  return (
    <div>
      <Header title="Properties Management" subtitle="Approve, reject, search, filter and manage all listings." onRefresh={loadProperties} />

      <div className="mb-6 grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-4">
        <SearchBox value={search} setValue={setSearch} placeholder="Search property..." />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-12 rounded-xl border px-4">
          <option value="all">All Categories</option>
          <option value="Apartment">Apartment</option>
          <option value="House">House</option>
          <option value="Villa">Villa</option>
          <option value="Hotel">Hotel</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 rounded-xl border px-4">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <div className="rounded-xl bg-[#F4F1FF] px-4 py-3 font-bold text-[#8363F5]">
          {filtered.length} Listings
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm">
        {loading ? (
          <Empty text="Loading properties..." />
        ) : filtered.length === 0 ? (
          <Empty text="No properties found." />
        ) : (
          <div className="divide-y">
            {filtered.map((p) => (
              <div key={p.id} className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                  <img src={p.image || "/placeholder.jpg"} alt={p.title} className="h-24 w-24 rounded-2xl object-cover" />

                  <div>
                    <h3 className="text-lg font-black">{p.title}</h3>
                    <p className="text-sm text-gray-500">{p.location}</p>
                    <p className="text-sm text-gray-500">Host: {p.host_name || "Unknown"} · {p.host_email || "-"}</p>
                    <p className="mt-2 font-bold text-[#8363F5]">₹{Number(p.price || 0).toLocaleString("en-IN")} / night</p>
                    <StatusBadge status={p.status || "pending"} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => window.open(`/reserve/${p.id}`, "_blank")} className="btn-gray"><Eye size={16} /> View</button>
                  <button onClick={() => updateStatus(p.id, "approved")} className="btn-green"><CheckCircle size={16} /> Approve</button>
                  <button onClick={() => updateStatus(p.id, "rejected")} className="btn-yellow"><XCircle size={16} /> Reject</button>
                  <button onClick={() => deleteProperty(p.id)} className="btn-red"><Trash2 size={16} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onRefresh }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-4xl font-black text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500">{subtitle}</p>
      </div>
      <button onClick={onRefresh} className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-5 py-3 font-bold text-white">
        <RefreshCw size={18} /> Refresh
      </button>
    </div>
  );
}

function SearchBox({ value, setValue, placeholder }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4">
      <Search size={18} className="text-gray-400" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="h-12 w-full outline-none" />
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
      ? "bg-red-100 text-red-600"
      : "bg-yellow-100 text-yellow-700";

  return <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${style}`}>{status}</span>;
}

function Empty({ text }) {
  return <div className="p-12 text-center text-gray-500">{text}</div>;
}