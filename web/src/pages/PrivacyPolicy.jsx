import Navbar from "../components/Navbar";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-24 md:px-8">
        <p className="text-sm font-semibold text-[#3b71e6]">Dovail Stay</p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>

        <p className="mt-4 text-sm leading-7 text-gray-500">
          This Privacy Policy explains how Dovail Stay collects, uses, protects,
          and shares information when guests, hosts, and travel partners use our
          platform.
        </p>

        <PolicyBlock title="1. Information we collect">
          We may collect your name, email, phone number, profile details,
          identity verification information, booking details, payment status,
          host listing details, trip package details, messages, reviews, device
          information, and usage activity.
        </PolicyBlock>

        <PolicyBlock title="2. How we use your information">
          We use your information to create accounts, process bookings, verify
          users and hosts, prevent fraud, manage payments and refunds, provide
          customer support, improve our platform, and comply with legal
          requirements.
        </PolicyBlock>

        <PolicyBlock title="3. Payments and verification">
          Online payments may be processed by third-party payment providers such
          as Razorpay. Dovail Stay does not store full card details. Identity
          verification information may be reviewed for safety, compliance, and
          payout eligibility.
        </PolicyBlock>

        <PolicyBlock title="4. Sharing information">
          We may share necessary booking details between guests and hosts, with
          payment providers, verification providers, cloud hosting providers,
          legal authorities when required, and service partners who help operate
          Dovail Stay.
        </PolicyBlock>

        <PolicyBlock title="5. Cookies and analytics">
          We may use cookies and similar technologies to keep users logged in,
          improve performance, understand usage, prevent misuse, and personalize
          the experience.
        </PolicyBlock>

        <PolicyBlock title="6. Data security">
          We use reasonable technical and organizational safeguards to protect
          personal information. However, no online service can guarantee complete
          security.
        </PolicyBlock>

        <PolicyBlock title="7. Your choices">
          You may update your profile information, request account support,
          manage notifications, or contact us regarding access, correction, or
          deletion requests where applicable.
        </PolicyBlock>

        <PolicyBlock title="8. Data retention">
          We retain information as long as needed to provide services, resolve
          disputes, process payments, prevent fraud, comply with law, and
          maintain business records.
        </PolicyBlock>

        <PolicyBlock title="9. Contact us">
          For privacy questions, contact us at business@dovail.com.
        </PolicyBlock>

        <div className="mt-10 rounded-3xl border border-blue-100 bg-[#eef4ff] p-6 text-sm leading-7 text-gray-600">
          Last updated: 2026. This page is a general policy template and should
          be reviewed before public launch.
        </div>
      </main>
    </div>
  );
}

function PolicyBlock({ title, children }) {
  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-gray-600">{children}</p>
    </section>
  );
}