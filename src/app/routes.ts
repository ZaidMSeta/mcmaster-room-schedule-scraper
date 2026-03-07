import { createBrowserRouter } from "react-router";
import { HomePage } from "./components/home-page";
import { ResultsPage } from "./components/results-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/results",
    Component: ResultsPage,
  },
]);