import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { RoomFinder } from "./pages/RoomFinder";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [{ index: true, Component: RoomFinder }],
  },
]);
