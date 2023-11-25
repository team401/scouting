import * as React from "react";
import { Suspense, lazy } from "react";
import { Routes, Route, HashRouter, Navigate } from "react-router-dom";
import { Box } from "@mui/material";

import AppBarMemo from "./components/TeamAppBar";
import ScrollToTop from "./components/ScrollToTop";

const PreMatch = lazy(() => import("./PreMatch"));
const Auto = lazy(() => import("./Auto"));

export type PageType = {
  path: string;
  title: string;
  elem: JSX.Element;
};

const pages: PageType[] = [
  { path: "/pre", title: "Pre-Match", elem: <PreMatch /> },
  { path: "/auto", title: "Auto", elem: <Auto /> },
];

export default function App() {
  return (
    <HashRouter>
      <AppBarMemo pages={[]} />
      <ScrollToTop />
      <Box sx={{ height: "5vh" }}></Box>
      <Suspense fallback={<div style={{ height: "100vh" }}></div>}>
        <Routes>
          {pages.map((page) => (
            <Route path={page.path} element={page.elem} key={page.path} />
          ))}
          <Route path="*" element={<Navigate to="/pre" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
