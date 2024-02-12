import * as React from "react";
import * as ReactDOM from "react-dom/client";
import {
  createHashRouter,
  createRoutesFromElements,
  Route,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ContextProvider } from "./ContextProvider";
// import SettingsForm from './Forms/SettingsForm';
import PreMatchForm from "./Forms/PreMatchForm";
import AutonomousForm from "./Forms/AutonomousForm";
import { ThemeProvider } from "@mui/material/styles";
// App is no longer used, delete it in future once all functionality is copied
// import App from './App';
import theme from "./theme";
import SettingsForm from "./Forms/SettingsForm";
import TeleopForm from "./Forms/TeleopForm";
import NavBar from "./NavBar";
import App from "./App";

// const router = createHashRouter([
//   {
//     path: "/",
//     element: <App />,
//     children: [
//       {
//         path: "pre",
//         element: <PreMatchForm />,
//       },
//       {
//         path: "auto",
//         element: <AutonomousForm />,
//       },
//       {
//         path: "settings",
//         element: <SettingsForm />,
//       },
//       {
//         path: "tele",
//         element: <TeleopForm />,
//       },
//       {
//         path: "/",
//         element: <Navigate to="/pre" replace />,
//       },
//     ],
//   },
// ]);

// const rootElement = document.getElementById("root");
// const root = ReactDOM.createRoot(rootElement!);

// root.render(
//   <ThemeProvider theme={theme}>
//     {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
//     <CssBaseline />
//     <ContextProvider>
//       <div className="min-h-screen w-screen">
//         <RouterProvider router={router} />
//       </div>
//     </ContextProvider>
//     {/* <PreMatchForm /> */}
//   </ThemeProvider>
// );
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <ThemeProvider theme={theme}>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <ContextProvider>
      <App />
    </ContextProvider>
    {/* <PreMatchForm /> */}
  </ThemeProvider>
);
