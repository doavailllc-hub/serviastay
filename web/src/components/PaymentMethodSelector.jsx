import { Building2, CreditCard, ShieldCheck, Smartphone, WalletCards } from "lucide-react";

const METHODS = [
  { id: "upi", title: "UPI", description: "Google Pay, PhonePe and other UPI apps", icon: Smartphone },
  { id: "card", title: "Credit or debit card", description: "Visa, Mastercard, RuPay and supported cards", icon: CreditCard },
  { id: "netbanking", title: "Net banking", description: "Pay securely through your bank", icon: Building2 },
  { id: "wallet", title: "Wallets", description: "Available wallets shown securely by Razorpay", icon: WalletCards },
];

export default function PaymentMethodSelector({ value, onChange, disabled = false }) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
        {METHODS.map(({ id, title, description, icon: Icon }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#3b71e6]/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-[#3b71e6] bg-[#eef4ff] shadow-[0_0_0_1px_#3b71e6]"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-[#3b71e6] text-white" : "bg-gray-100 text-gray-700"}`}>
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-950">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">{description}</span>
              </span>
              <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${selected ? "border-[5px] border-[#3b71e6]" : "border-gray-300"}`} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-green-700" size={19} />
        <p className="text-xs leading-5 text-gray-600">
          Secure payment processing by Razorpay. Dovail Stay never receives or stores your card, UPI PIN or banking credentials.
        </p>
      </div>
    </div>
  );
}
