import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const savedLanguage = localStorage.getItem("language") || "English";
document.documentElement.lang = savedLanguage === "Arabic" ? "ar" : "en";
document.documentElement.dir = savedLanguage === "Arabic" ? "rtl" : "ltr";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
