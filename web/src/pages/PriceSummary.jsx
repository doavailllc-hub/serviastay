import { formatINR } from "../../utils/resortUtils";

export default function PriceSummary({ price, nights, subtotal, taxes, total }) {
  return (
    <div className="mt-5 space-y-3 border-t border-gray-200 pt-5 text-sm">
      <h3 className="font-medium text-gray-950">Price details</h3>

      <PriceRow
        label={`${formatINR(price)} × ${nights} ${
          nights === 1 ? "night" : "nights"
        }`}
        value={formatINR(subtotal)}
      />

      <PriceRow label="Taxes" value={formatINR(taxes)} />

      <div className="flex items-center justify-between border-t border-gray-200 pt-4 font-semibold">
        <span>Total before payment</span>
        <span>{formatINR(total)}</span>
      </div>
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-gray-600">
      <span>{label}</span>
      <span className="font-medium text-gray-950">{value}</span>
    </div>
  );
}