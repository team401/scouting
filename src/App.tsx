import * as React from "react";
import { Suspense, lazy } from "react";
import { Routes, Route, HashRouter, Navigate } from "react-router-dom";
import { Box } from "@mui/material";

import AppBarMemo from "./components/TeamAppBar";
import ScrollToTop from "./components/ScrollToTop";
import { ScoutingProvider } from "./ScoutingContexts";

const Settings = lazy(() => import("./SettingsPage"));
const PreMatch = lazy(() => import("./PreMatch"));
const Auto = lazy(() => import("./Auto"));
const Tele = lazy(() => import("./Tele"));
const Post = lazy(() => import("./Post"));

export type PageType = {
  path: string;
  title: string;
  elem: JSX.Element;
};

const listedPages: PageType[] = [
  { path: "/pre", title: "Scouting", elem: <PreMatch /> },
  { path: "/settings", title: "Settings", elem: <Settings /> },
];

const unlistedPages: PageType[] = [
  { path: "/auto", title: "Auto", elem: <Auto /> },
  { path: "/tele", title: "Tele", elem: <Tele /> },
  { path: "/post", title: "Post", elem: <Post /> },
];

const allPages = listedPages.concat(unlistedPages);

export default function App() {
  return (
    <HashRouter>
      <AppBarMemo pages={listedPages} />
      <ScrollToTop />
      <Box sx={{ height: "5vh" }}></Box>
      <ScoutingProvider>
        <Suspense fallback={<div style={{ height: "100vh" }}></div>}>
          <Routes>
            {allPages.map((page) => (
              <Route path={page.path} element={page.elem} key={page.path} />
            ))}
            <Route path="*" element={<Navigate to="/pre" replace />} />
          </Routes>
        </Suspense>
      </ScoutingProvider>
    </HashRouter>
  );
}
