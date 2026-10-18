import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { RoomRadar } from "./pages/RoomRadar";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [{ index: true, Component: RoomRadar }],
  },
]);
