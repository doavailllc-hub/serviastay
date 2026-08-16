import type { RazorpayOptions, RazorpaySuccess } from "./razorpay";

export type { RazorpayOptions, RazorpaySuccess } from "./razorpay";

export async function openRazorpayCheckout(
  options: RazorpayOptions
): Promise<RazorpaySuccess> {
  const { default: RazorpayCheckout } = await import(
    "react-native-razorpay"
  );
  return RazorpayCheckout.open(options);
}
