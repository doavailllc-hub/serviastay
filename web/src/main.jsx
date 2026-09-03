import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
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
