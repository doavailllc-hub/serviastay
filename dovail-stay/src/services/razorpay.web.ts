import type {
    RazorpayOptions,
    RazorpaySuccess,
} from "./razorpay.native";

export async function openRazorpayCheckout(
  _options: RazorpayOptions
): Promise<RazorpaySuccess> {
  throw new Error(
    "Razorpay native checkout must be tested on Android or iOS."
  );
}