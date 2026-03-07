import { createBrowserRouter } from "react-router";
import { HomePage } from "./components/home-page";
import { ResultsPage } from "./components/results-page";
import { LoginPage } from "./components/login-page";
import { SignupPage } from "./components/signup-page";
import { AccountPage } from "./components/account-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/results",
    Component: ResultsPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/account",
    Component: AccountPage,
  },
]);
