import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

const filters = ["All", "Published", "Pending", "Rejected", "Needs Changes", "Suspended", "Archived"];

export default function AdminProperties() {
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/properties");
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Properties load failed");
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (property) => {
    try {
      setDetailsLoading(true);
      setSelected({
        property,
        images: [],
        stats: {},
      });
      setReason(property.rejection_reason || property.admin_note || "");

      const { data } = await api.get(`/admin/properties/${property.id}/details`);
      setSelected(data);
      setReason(data.property?.rejection_reason || data.property?.admin_note || "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Property details failed");
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (status) => {
    if (!selected?.property?.id) return;

    if (["Rejected", "Needs Changes", "Suspended"].includes(status) && !reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    try {
      setActionLoading(true);

      await api.put(`/admin/properties/${selected.property.id}/moderation`, {
        status,
        reason,
      });

      toast.success(`Property marked as ${status}`);
      await loadProperties();
      await openDetails({ ...selected.property, status });
    } catch (err) {
      toast.error(err.response?.data?.message || "Moderation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return properties.filter((item) => {
      const statusOk = filter === "All" || (item.status || "Published") === filter;
      const q = query.trim().toLowerCase();

      const searchOk =
        !q ||
        `${item.title || ""} ${item.location || ""} ${item.host_name || ""} ${item.host_email || ""}`
          .toLowerCase()
          .includes(q);

      return statusOk && searchOk;
    });
  }, [properties, filter, query]);

  const stats = useMemo(
    () => ({
      all: properties.length,
      published: properties.filter((p) => (p.status || "Published") === "Published").length,
      pending: properties.filter((p) => p.status === "Pending").length,
      rejected: properties.filter((p) => p.status === "Rejected").length,
    }),
    [properties]
  );

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">Property Moderation</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Listings Review Center</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review listings, verify host details, inspect images, and approve or request changes.
            </p>
          </div>

          <button
            onClick={loadProperties}
            className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Total" value={stats.all} icon={<Building2 />} />
        <Stat title="Published" value={stats.published} icon={<BadgeCheck />} />
        <Stat title="Pending" value={stats.pending} icon={<ShieldCheck />} />
        <Stat title="Rejected" value={stats.rejected} icon={<X />} />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, location, host..."
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
            No properties found.
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => openDetails(item)}
                className="rounded-[24px] border border-gray-200 bg-white p-4 text-left transition hover:border-[#3b71e6] hover:bg-blue-50/30"
              >
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt=""
                    className="h-24 w-28 shrink-0 rounded-2xl object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h3 className="truncate text-lg font-semibold">{item.title}</h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <MapPin size={14} />
                          <span className="truncate">{item.location}</span>
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Host: {item.host_name || "Unknown"}
                        </p>
                      </div>

                      <StatusBadge status={item.status || "Published"} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>₹{Number(item.price || 0).toLocaleString("en-IN")}/night</span>
                      <span>★ {item.rating || "5.0"}</span>
                      <span>{item.guests || 1} guests</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <Drawer
          data={selected}
          loading={detailsLoading}
          reason={reason}
          setReason={setReason}
          actionLoading={actionLoading}
          onClose={() => setSelected(null)}
          onStatus={updateStatus}
        />
      )}
    </main>
  );
}

function Drawer({ data, loading, reason, setReason, actionLoading, onClose, onStatus }) {
  const property = data.property || {};
  const images = data.images || [];
  const stats = data.stats || {};

  return (
    <div className="fixed inset-0 z-[100] bg-black/40">
      <aside className="ml-auto h-full w-full max-w-6xl overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">Property Review</p>
            <h2 className="text-2xl font-semibold">{property.title || "Listing"}</h2>
          </div>

          <button onClick={onClose} className="rounded-full border border-gray-200 p-2 hover:bg-gray-50">
            <X size={22} />
          </button>
        </header>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : (
          <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
            <section className="space-y-5">
              <Card>
                <img
                  src={property.image}
                  alt=""
                  className="mb-4 h-52 w-full rounded-2xl object-cover"
                />

                <StatusBadge status={property.status || "Published"} />

                <div className="mt-5 space-y-3 text-sm">
                  <Info label="Property ID" value={property.id} />
                  <Info label="Price" value={formatINR(property.price)} />
                  <Info label="Guests" value={property.guests} />
                  <Info label="Bedrooms" value={property.bedrooms} />
                  <Info label="Bathrooms" value={property.bathrooms} />
                  <Info label="Rating" value={`★ ${stats.rating || property.rating || 0}`} />
                </div>
              </Card>

              <Card title="Host">
                <Info label="Name" value={property.host_name} />
                <Info label="Email" value={property.host_email} />
                <Info label="Phone" value={property.host_phone || "-"} />
                <Info label="KYC" value={<StatusBadge status={property.host_kyc_status || "Not Submitted"} />} />
              </Card>

              <Card title="Performance">
                <Info label="Bookings" value={stats.bookings || 0} />
                <Info label="Revenue" value={formatINR(stats.revenue || 0)} />
                <Info label="Reviews" value={stats.reviews || 0} />
              </Card>
            </section>

            <section className="space-y-5">
              <Card title="Description">
                <p className="text-sm leading-6 text-gray-600">
                  {property.description || "No description provided."}
                </p>
              </Card>

              <Card title="Location">
                <p className="mb-3 text-sm text-gray-600">{property.location}</p>
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                  Latitude: {property.latitude || "-"} · Longitude: {property.longitude || "-"}
                </div>
              </Card>

              <Card title="Images">
                {images.length === 0 ? (
                  <p className="text-sm text-gray-500">No gallery images.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {images.map((img) => (
                      <a key={img.id} href={img.image_url} target="_blank" rel="noreferrer">
                        <img
                          src={img.image_url}
                          alt=""
                          className="h-36 w-full rounded-2xl object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Quality Checks">
                <Check ok={Boolean(property.image)} text="Cover image exists" />
                <Check ok={images.length >= 5} text="Minimum 5 photos uploaded" />
                <Check ok={Boolean(property.description)} text="Description completed" />
                <Check ok={Boolean(property.price)} text="Price added" />
                <Check ok={property.host_kyc_status === "Approved"} text="Host KYC approved" />
                <Check ok={Boolean(property.latitude && property.longitude)} text="Location coordinates added" />
              </Card>

              <Card title="Admin Decision">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Reason for rejection, suspension, or changes..."
                  className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-[#3b71e6]"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <Action disabled={actionLoading} onClick={() => onStatus("Published")} className="bg-green-600 text-white">
                    Approve / Publish
                  </Action>
                  <Action disabled={actionLoading} onClick={() => onStatus("Needs Changes")} className="bg-yellow-500 text-white">
                    Request Changes
                  </Action>
                  <Action disabled={actionLoading} onClick={() => onStatus("Rejected")} className="bg-red-600 text-white">
                    Reject
                  </Action>
                  <Action disabled={actionLoading} onClick={() => onStatus("Suspended")} className="bg-gray-900 text-white">
                    Suspend
                  </Action>
                </div>
              </Card>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

function Stat({ title, value, icon }) {
  return (
    <article className="rounded-[22px] border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-900">{value || "-"}</span>
    </div>
  );
}

function Check({ ok, text }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-sm">
      <span className={ok ? "text-green-600" : "text-yellow-600"}>
        {ok ? "✓" : "⚠"}
      </span>
      <span className={ok ? "text-gray-700" : "text-yellow-700"}>{text}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Published: "border-green-200 bg-green-50 text-green-700",
    Approved: "border-green-200 bg-green-50 text-green-700",
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    "Needs Changes": "border-orange-200 bg-orange-50 text-orange-700",
    Suspended: "border-gray-300 bg-gray-100 text-gray-700",
    Archived: "border-gray-300 bg-gray-50 text-gray-500",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || styles.Published}`}>
      {status || "Published"}
    </span>
  );
}

function Action({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}