declare module "react-native-razorpay" {
  type RazorpayCheckoutOptions = {
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
    theme?: { color?: string };
  };

  type RazorpayCheckoutResult = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutResult>;
  };

  export default RazorpayCheckout;
}
