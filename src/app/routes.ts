import { createBrowserRouter } from "react-router";
import { RoomFinder } from "./pages/RoomFinder";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RoomFinder,
  },
]);
