import { useEffect, useState } from "react";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import GoogleLogin from "./pages/GoogleLogin.jsx";
import GooglePassword from "./pages/GooglePassword.jsx";
import MainLogin from "./pages/MainLogin.jsx";

const routes = {
  "/": MainLogin,
  "/forgot-password": ForgotPassword,
  "/google-login": GoogleLogin,
  "/google-password": GooglePassword
};

function getRoute() {
  return window.location.hash.replace("#", "") || "/";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (nextRoute) => {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  };

  const Page = routes[route] || MainLogin;

  return <Page navigate={navigate} />;
}
