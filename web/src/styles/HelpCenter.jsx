import Navbar from "../components/Navbar";
import "../styles/pages.css";

export default function HelpCenter() {
  return (
    <div className="page-wrap">
      <Navbar />

      <main className="page-container">
        <h1 className="page-title">Hi, how can we help?</h1>
        <p className="page-sub">
          Find answers about bookings, hosting, payments, and account settings.
        </p>

        <input
          className="input"
          placeholder="Search help articles"
        />

        <div className="grid-cards">
          <div className="simple-card">
            <h3>🧳 Booking help</h3>
            <p>Change dates, cancel reservations, and contact hosts.</p>
          </div>

          <div className="simple-card">
            <h3>🏠 Hosting help</h3>
            <p>Manage listings, pricing, availability, and guests.</p>
          </div>

          <div className="simple-card">
            <h3>💳 Payments</h3>
            <p>Payment methods, refunds, payouts, and invoices.</p>
          </div>

          <div className="simple-card">
            <h3>⚙ Account</h3>
            <p>Profile, login, security, and notification settings.</p>
          </div>
        </div>
      </main>
    </div>
  );
}