import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Percent,
  Plus,
  Search,
  TicketPercent,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_amount: "",
    max_discount: "",
    usage_limit: "",
    expires_at: "",
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/coupons");
      setCoupons(res.data || []);
    } catch (err) {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    try {
      await api.post("/admin/coupons", form);

      toast.success("Coupon created");

      setForm({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        min_amount: "",
        max_discount: "",
        usage_limit: "",
        expires_at: "",
      });

      loadCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/coupons/${id}/status`, { status });

      toast.success("Coupon updated");
      loadCoupons();
    } catch {
      toast.error("Update failed");
    }
  };

  const filtered = useMemo(() => {
    return coupons.filter((c) =>
      c.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [coupons, search]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="mt-2 text-gray-500">
            Create and manage promotional coupons.
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-3xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold">Create Coupon</h2>

        <div className="grid gap-4 md:grid-cols-4">
          <input
            placeholder="WELCOME10"
            value={form.code}
            onChange={(e) =>
              setForm({
                ...form,
                code: e.target.value.toUpperCase(),
              })
            }
            className="rounded-xl border p-3"
          />

          <select
            value={form.discount_type}
            onChange={(e) =>
              setForm({
                ...form,
                discount_type: e.target.value,
              })
            }
            className="rounded-xl border p-3"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>

          <input
            type="number"
            placeholder="Discount"
            value={form.discount_value}
            onChange={(e) =>
              setForm({
                ...form,
                discount_value: e.target.value,
              })
            }
            className="rounded-xl border p-3"
          />

          <input
            type="number"
            placeholder="Minimum Amount"
            value={form.min_amount}
            onChange={(e) =>
              setForm({
                ...form,
                min_amount: e.target.value,
              })
            }
            className="rounded-xl border p-3"
          />

          <input
            type="number"
            placeholder="Maximum Discount"
            value={form.max_discount}
            onChange={(e) =>
              setForm({
                ...form,
                max_discount: e.target.value,
              })
            }
            className="rounded-xl border p-3"
          />

          <input
            type="number"
            placeholder="Usage Limit"
            value={form.usage_limit}
            onChange={(e) =>
              setForm({
                ...form,
                usage_limit: e.target.value,
              })
            }
            className="rounded-xl border p-3"
          />

          <input
            type="date"
            value={form.expires_at}
            onChange={(e) =>
              setForm({
                ...form,
                expires_at: e.target.value,
              })
            }
            className="rounded-xl border p-3"
          />

          <button
            onClick={createCoupon}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#7E4FF5] p-3 font-bold text-white"
          >
            <Plus size={18} />
            Create
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3">
        <Search size={18} />
        <input
          placeholder="Search coupon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-4">Code</th>
              <th>Discount</th>
              <th>Used</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((coupon) => (
              <tr key={coupon.id} className="border-t">
                <td className="p-4 font-bold">{coupon.code}</td>

                <td>
                  {coupon.discount_type === "percentage"
                    ? `${coupon.discount_value}%`
                    : `₹${coupon.discount_value}`}
                </td>

                <td>
                  {coupon.used_count}/{coupon.usage_limit || "∞"}
                </td>

                <td>
                  {coupon.status === "Active" ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                      Disabled
                    </span>
                  )}
                </td>

                <td className="space-x-2">
                  <button
                    onClick={() =>
                      updateStatus(
                        coupon.id,
                        coupon.status === "Active"
                          ? "Inactive"
                          : "Active"
                      )
                    }
                    className="rounded-xl border px-3 py-2"
                  >
                    {coupon.status === "Active" ? (
                      <XCircle size={18} />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            No coupons found.
          </div>
        )}
      </div>
    </div>
  );
}