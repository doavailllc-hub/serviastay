export function razorpayMethodConfig(method) {
  return {
    display: {
      blocks: {
        selected_method: {
          name: "Complete your payment",
          instruments: [{ method }],
        },
      },
      sequence: ["block.selected_method"],
      preferences: { show_default_blocks: false },
    },
  };
}
