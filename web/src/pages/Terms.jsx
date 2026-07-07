import Navbar from "../components/Navbar";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24 md:px-8">
        <p className="text-sm font-semibold text-[#3b71e6]">
          Dovail Stay
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Terms of Service
        </h1>

        <p className="mt-4 text-sm leading-7 text-gray-500">
          These Terms of Service govern your use of Dovail Stay, including
          accommodation bookings, travel experiences, hosting services,
          payments, and all related platform features.
        </p>

        <Section
          title="1. Acceptance of Terms"
          content="By creating an account or using Dovail Stay, you agree to these Terms and our Privacy Policy. If you do not agree, you should discontinue using the platform."
        />

        <Section
          title="2. User Accounts"
          content="You are responsible for maintaining accurate account information and keeping your login credentials secure. You are responsible for activities performed through your account."
        />

        <Section
          title="3. Booking Policy"
          content="Bookings become confirmed only after successful payment and confirmation from the platform. Hosts must provide accurate property or experience information."
        />

        <Section
          title="4. Payments"
          content="Payments are processed through authorized payment providers. Platform service fees, taxes, discounts, refunds, and payout schedules may vary depending on booking type and applicable regulations."
        />

        <Section
          title="5. Cancellation & Refunds"
          content="Cancellation and refund eligibility depends on the cancellation policy selected by the host, applicable laws, and payment processing rules."
        />

        <Section
          title="6. Host Responsibilities"
          content="Hosts must provide truthful listings, maintain cleanliness, honor confirmed bookings, comply with local laws, and provide safe accommodation or experiences."
        />

        <Section
          title="7. Guest Responsibilities"
          content="Guests must respect host property, follow house rules, provide accurate booking information, avoid unlawful activities, and comply with local regulations."
        />

        <Section
          title="8. Verification"
          content="Dovail Stay may request identity verification, business verification, property verification, or additional documentation before approving listings or processing payouts."
        />

        <Section
          title="9. Prohibited Activities"
          content="Fraud, fake listings, illegal activities, payment manipulation, abusive behavior, unauthorized commercial use, or attempts to bypass platform payments are strictly prohibited."
        />

        <Section
          title="10. Intellectual Property"
          content="All platform designs, branding, logos, software, graphics, and content belong to Dovail Stay or respective owners unless otherwise stated."
        />

        <Section
          title="11. Limitation of Liability"
          content="Dovail Stay acts as a technology platform connecting guests and hosts. We are not responsible for losses arising from third-party actions, travel disruptions, weather, government restrictions, or force majeure events."
        />

        <Section
          title="12. Account Suspension"
          content="We reserve the right to suspend or permanently terminate accounts that violate our policies or applicable laws."
        />

        <Section
          title="13. Changes to Terms"
          content="These Terms may be updated periodically. Continued use of the platform after updates constitutes acceptance of the revised Terms."
        />

        <Section
          title="14. Contact"
          content="For legal questions or policy concerns, contact us at business@dovail.com."
        />

        <div className="mt-10 rounded-3xl border border-blue-100 bg-[#eef4ff] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              📘
            </div>

            <div>
              <h3 className="font-semibold">
                Agreement
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                By continuing to use Dovail Stay, you acknowledge that you have
                read, understood, and agreed to these Terms of Service.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          Last updated: July 2026
        </p>
      </main>
    </div>
  );
}

function Section({ title, content }) {
  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 transition hover:shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-gray-600">
        {content}
      </p>
    </section>
  );
}