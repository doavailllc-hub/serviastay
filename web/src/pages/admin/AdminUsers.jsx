import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Users,
  Mail,
  Phone,
} from "lucide-react";
import api from "../../api/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Users load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = `${user.fullname || ""} ${user.email || ""} ${user.phone || ""}`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (role === "all" || user.role === role) &&
        (status === "all" || String(user.status || "active") === status)
      );
    });
  }, [users, search, role, status]);

  const updateRole = async (id, newRole) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Role update failed");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status: newStatus });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Status update failed");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user permanently?")) return;

    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "User delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FC] p-4 sm:p-6 lg:p-8">
      <PageHeader onRefresh={loadUsers} />

      <Stats total={users.length} filtered={filteredUsers.length} />

      <Filters
        search={search}
        setSearch={setSearch}
        role={role}
        setRole={setRole}
        status={status}
        setStatus={setStatus}
      />

      <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-black text-gray-900">All Users</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage user roles, account status and access control.
          </p>
        </div>

        {loading ? (
          <Empty text="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <Empty text="No users found." />
        ) : (
          <>
            <DesktopTable
              users={filteredUsers}
              updateRole={updateRole}
              updateStatus={updateStatus}
              deleteUser={deleteUser}
            />

            <MobileCards
              users={filteredUsers}
              updateRole={updateRole}
              updateStatus={updateStatus}
              deleteUser={deleteUser}
            />
          </>
        )}
      </section>
    </div>
  );
}

function PageHeader({ onRefresh }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EEE9FF] px-4 py-2 text-sm font-bold text-[3b71e6]">
          <Shield size={16} />
          Admin Controls
        </div>

        <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          Users Management
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
          Search, filter, manage roles, activate or suspend user accounts.
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
      <StatCard label="Total Users" value={total} />
      <StatCard label="Showing Results" value={filtered} />
      <StatCard label="Active Filter" value={filtered === total ? "None" : "Applied"} />
      <StatCard label="Access Control" value="Live" />
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

function Filters({ search, setSearch, role, setRole, status, setStatus }) {
  return (
    <div className="mb-6 grid gap-4 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm lg:grid-cols-4">
      <div className="lg:col-span-2">
        <SearchBox
          value={search}
          setValue={setSearch}
          placeholder="Search by name, email or phone..."
        />
      </div>

      <SelectBox value={role} onChange={setRole}>
        <option value="all">All Roles</option>
        <option value="guest">Guest</option>
        <option value="host">Host</option>
        <option value="admin">Admin</option>
      </SelectBox>

      <SelectBox value={status} onChange={setStatus}>
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
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

function DesktopTable({ users, updateRole, updateStatus, deleteUser }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[980px] text-left">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-6 py-4">User</th>
            <th className="px-6 py-4">Contact</th>
            <th className="px-6 py-4">Phone</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-gray-50/80">
              <td className="px-6 py-5">
                <div className="flex items-center gap-3">
                  <Avatar name={user.fullname || "User"} />
                  <div>
                    <p className="font-black text-gray-950">{user.fullname || "User"}</p>
                    <p className="text-xs font-semibold text-gray-400">ID: {user.id}</p>
                  </div>
                </div>
              </td>

              <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Mail size={15} />
                  {user.email || "-"}
                </div>
              </td>

              <td className="px-6 py-5">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                  <Phone size={15} />
                  {user.phone || "-"}
                </div>
              </td>

              <td className="px-6 py-5">
                <RoleSelect
                  value={user.role || "guest"}
                  onChange={(value) => updateRole(user.id, value)}
                />
              </td>

              <td className="px-6 py-5">
                <StatusBadge status={user.status || "active"} />
              </td>

              <td className="px-6 py-5">
                <div className="flex justify-end gap-2">
                  <IconButton
                    title="Activate"
                    onClick={() => updateStatus(user.id, "active")}
                    className="bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    <UserCheck size={16} />
                  </IconButton>

                  <IconButton
                    title="Suspend"
                    onClick={() => updateStatus(user.id, "suspended")}
                    className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  >
                    <UserX size={16} />
                  </IconButton>

                  <IconButton
                    title="Delete"
                    onClick={() => deleteUser(user.id)}
                    className="bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({ users, updateRole, updateStatus, deleteUser }) {
  return (
    <div className="divide-y divide-gray-100 lg:hidden">
      {users.map((user) => (
        <div key={user.id} className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <Avatar name={user.fullname || "User"} />

            <div className="min-w-0 flex-1">
              <p className="font-black text-gray-950">{user.fullname || "User"}</p>
              <p className="truncate text-sm text-gray-500">{user.email || "-"}</p>
              <p className="mt-1 text-sm text-gray-500">{user.phone || "-"}</p>
            </div>

            <StatusBadge status={user.status || "active"} />
          </div>

          <div className="mb-4">
            <RoleSelect
              value={user.role || "guest"}
              onChange={(value) => updateRole(user.id, value)}
              fullWidth
            />
          </div>

          <div className="flex gap-2">
            <ActionButton
              onClick={() => updateStatus(user.id, "active")}
              className="bg-green-100 text-green-700 hover:bg-green-200"
            >
              <UserCheck size={16} />
              Active
            </ActionButton>

            <ActionButton
              onClick={() => updateStatus(user.id, "suspended")}
              className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            >
              <UserX size={16} />
              Suspend
            </ActionButton>

            <ActionButton
              onClick={() => deleteUser(user.id)}
              className="bg-red-100 text-red-600 hover:bg-red-200"
            >
              <Trash2 size={16} />
              Delete
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name }) {
  const letter = name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEE9FF] text-sm font-black text-[3b71e6]">
      {letter}
    </div>
  );
}

function RoleSelect({ value, onChange, fullWidth = false }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-bold capitalize text-gray-700 outline-none transition focus:border-[3b71e6] focus:bg-white focus:ring-4 focus:ring-[3b71e6]/10 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      <option value="guest">Guest</option>
      <option value="host">Host</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function IconButton({ children, onClick, className, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-[0.95] ${className}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-black transition active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-green-100 text-green-700 ring-green-200",
    suspended: "bg-red-100 text-red-600 ring-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${
        styles[status] || styles.active
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
          <Users size={24} />
        </div>
        <p className="font-bold text-gray-500">{text}</p>
      </div>
    </div>
  );
}