import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, ShieldCheck, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

const roles = [
  "Super Admin",
  "Finance Admin",
  "Support Admin",
  "KYC Admin",
  "Moderator",
  "Read Only",
];

export default function AdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteRole, setPromoteRole] = useState("Read Only");
  const [query, setQuery] = useState("");

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/admins");
      setAdmins(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Admins load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const updateAdmin = async (admin) => {
    try {
      await api.put(`/admin/admins/${admin.id}`, {
        admin_role: admin.admin_role,
        is_active: Number(admin.is_active) === 1,
      });

      toast.success("Admin updated");
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const revokeAdmin = async (adminId) => {
    if (!confirm("Revoke this admin access?")) return;

    try {
      await api.put(`/admin/admins/${adminId}/revoke`);
      toast.success("Admin access revoked");
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Revoke failed");
    }
  };

  const promoteUser = async () => {
    if (!promoteEmail.trim()) {
      toast.error("Email required");
      return;
    }

    try {
      await api.post("/admin/admins/promote", {
        email: promoteEmail,
        admin_role: promoteRole,
      });

      toast.success("User promoted to admin");
      setPromoteEmail("");
      setPromoteRole("Read Only");
      loadAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Promote failed");
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return admins;

    return admins.filter((a) =>
      `${a.fullname || ""} ${a.email || ""} ${a.admin_role || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [admins, query]);

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#3b71e6]">
                Access Control
              </p>
              <h1 className="text-3xl font-semibold">Admin Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage admin roles, permissions, and access status.
              </p>
            </div>
          </div>

          <button
            onClick={loadAdmins}
            className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-xl font-semibold">Promote User to Admin</h2>

        <div className="grid gap-3 md:grid-cols-[1fr_240px_160px]">
          <input
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            placeholder="User email address"
            className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
          />

          <select
            value={promoteRole}
            onChange={(e) => setPromoteRole(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
          >
            {roles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </select>

          <button
            onClick={promoteUser}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-4 text-sm font-semibold text-white"
          >
            <UserPlus size={16} />
            Promote
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="text-xl font-semibold">Admins</h2>

          <div className="relative w-full md:w-96">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search admins..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-10 text-center text-sm text-gray-500">
            No admins found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3">Admin</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((admin) => (
                  <AdminRow
                    key={admin.id}
                    admin={admin}
                    onChange={(updated) =>
                      setAdmins((prev) =>
                        prev.map((item) =>
                          item.id === updated.id ? updated : item
                        )
                      )
                    }
                    onSave={() => updateAdmin(admin)}
                    onRevoke={() => revokeAdmin(admin.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminRow({ admin, onChange, onSave, onRevoke }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-4">
        <p className="font-semibold">{admin.fullname || "Admin"}</p>
        <p className="text-xs text-gray-500">{admin.email}</p>
      </td>

      <td>
        <select
          value={admin.admin_role || "Read Only"}
          onChange={(e) => onChange({ ...admin, admin_role: e.target.value })}
          className="h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none"
        >
          {roles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </td>

      <td>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Number(admin.is_active) === 1}
            onChange={(e) =>
              onChange({ ...admin, is_active: e.target.checked ? 1 : 0 })
            }
          />
          {Number(admin.is_active) === 1 ? "Active" : "Disabled"}
        </label>
      </td>

      <td>{formatDate(admin.created_at)}</td>

      <td className="text-right">
        <button
          onClick={onSave}
          className="mr-2 rounded-xl bg-[#3b71e6] px-4 py-2 text-xs font-semibold text-white"
        >
          Save
        </button>

        <button
          onClick={onRevoke}
          className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Revoke
        </button>
      </td>
    </tr>
  );
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN");
}