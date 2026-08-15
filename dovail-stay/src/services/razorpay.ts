export type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  notes?: Record<string, string>;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
};

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export async function openRazorpayCheckout(
  _options: RazorpayOptions
): Promise<RazorpaySuccess> {
  throw new Error(
    "Razorpay checkout is unavailable on this platform."
  );
}
