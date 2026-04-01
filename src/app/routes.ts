import { createBrowserRouter } from "react-router";
import { MainPage } from "./components/main-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainPage,
  },
]);
