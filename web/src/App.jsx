import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import ResortDetails from "./pages/ResortDetails";
import BecomeHost from "./pages/BecomeHost"; // 🔥 IMPORT THE NEW COMPONENT HERE!
import CategorySelect from "./pages/CategorySelect";
import Profile from "./pages/Profile"
import Wishlist from "./pages/Wishlist";
import Trips from "./pages/Trips";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import AccountSettings from "./pages/AccountSettings";
import Checkout from "./pages/Checkout";
import BookingSuccess from "./pages/BookingSuccess";
import HostDashboard from "./pages/HostDashboard";
import SearchResults from "./pages/SearchResults";
import HostListings from "./pages/HostListings";
import EditListing from "./pages/EditListing";
import HostCalendar from "./pages/HostCalendar";
import Earnings from "./pages/Earnings";
import Reviews from "./pages/Reviews";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import HelpCenter from "./pages/HelpCenter";
import LanguageCurrency from "./pages/LanguageCurrency";
import Experience from "./pages/Experiences";
import Services from "./pages/Services";
import PaymentMethods from "./pages/PaymentMethods";
import AddProperty from "./pages/AddProperty";

import { Link, useLocation } from "react-router-dom";
function App() {
  return (
    <Routes>
      {/* Auth Entry Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Marketplace Overview Home Route */}
      <Route path="/home" element={<Home />} />
      
      {/* Resort Details - Both paths accepted so both URL types work perfectly! */}
      <Route path="/category" element={<CategorySelect />} />
  <Route path="/help" element={<HelpCenter />} />

      {/* Resort Details - Both paths accepted so both URL types work perfectly! */}
   <Route
path="/profile"
element={<Profile/>}
/>
<Route path="/reserve/:id" element={<ResortDetails />} />

   <Route path="/wishlist" element={<Wishlist />} />
      <Route path="/trips" element={<Trips />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/account-settings" element={<AccountSettings />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/booking-success" element={<BookingSuccess />} />
      <Route path="/host-dashboard" element={<HostDashboard />} />
<Route path="/language" element={<LanguageCurrency />} />
<Route path="/search-results" element={<SearchResults />} />
<Route path="/host-listings" element={<HostListings />} />
<Route path="/edit-listing" element={<EditListing />} />
<Route path="/host-calendar" element={<HostCalendar />} />
<Route path="/earnings" element={<Earnings />} />
<Route path="/reviews" element={<Reviews />} />
<Route path="/experiences" element={<Experience />} />
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/services" element={<Services />} />
<Route path="*" element={<NotFound />} />
<Route path="/add-property" element={<AddProperty />} />
<Route path="/edit-listing/:id" element={<EditListing />} />
<Route path="/payment-methods" element={<PaymentMethods />} />
      {/* Become a Host - Setup Dashboard Listing Page */}
      <Route path="/become-a-host" element={<BecomeHost />} />
    </Routes>

    
  );
}

export default App;