import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { alliance, useSettingsContext } from "../ContextProvider";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AllianceSwitch from "./AllianceSwitch";

type LinkSignature = {
  text: string;
  to: string;
};

type LinkSignatures = {
  prev: LinkSignature;
  next: LinkSignature;
};

const links: { [key: string]: LinkSignature } = {
  dataEntry: { text: "DataEntry", to: "dataEntry" },
  dataGraphs: { text: "DataGraphs", to: "dataGraphs" },
  teamLookUp: { text: "TeamLookUp", to: "teamLookUp" },
  pitScout: { text: "PitScout", to: "pitScout" },
  auto: { text: "Auto", to: "auto" },
  tele: { text: "Teleop", to: "tele" },
};

function linksFromPathname(pathname: string): LinkSignatures {
  switch (pathname) {
    case "/dataEntry":
      return {
        prev: links.teamLookUp,
        next: links.pitScout,
      };
    case "/dataGraphs":
      return {
        prev: links.pitScout,
        next: links.teamLookUp,
      };
    case "/teamLookUp":
      return {
        prev: links.dataGraphs,
        next: links.dataEntry,
      };
    case "/pitScout":
      return {
        prev: links.dataEntry,
        next: links.dataGraphs,
      };
    default:
      throw Error(
        `NavBar can't generate next/previous links for unknown pathname ${pathname}`
      );
  }
}

export default function NavBar() {
  const { settings, setSettings } = useSettingsContext();
  const location = useLocation();

  const links: LinkSignatures = linksFromPathname(location.pathname);

  return (
    <div
      className={`flex fixed md:relative bottom-0 md:bottom-auto mt-2.5 left-0 md:left-auto sm:left-0 justify-between text-sm md:text-lg lg:text-base w-full md:w-auto shadow-lg text-white md:rounded-lg transition font-sans item-center sm:w-1/2 sm:scroll-smooth flex-row grid-1 items-center

      ${settings.Alliance == "Red" ? "bg-red-bg" : "bg-blue-bg"}`}
    >
      <Link
        className="md:hidden bg-black bg-opacity-25 hover:bg-opacity-50 basis-1/6 flex-auto py-4 md:py-2 px-2 text-center"
        to={links.prev.to}
      >
        <ArrowBackIosIcon className="pb-0.5" fontSize="inherit" />{" "}
        {links.prev.text}
      </Link>
      <Link

        className="bg-black hidden bg-opacity-25 hover:bg-opacity-50 py-2  md:block px-4  rounded-l-lg "

        to="/dataEntry"
      >
        DataEntry
      </Link>
      <Link

        className="bg-black bg-opacity-25 hidden hover:bg-opacity-50 py-2  md:block px-4 "
        to="/pitScout"
      >
        PitScouting
      </Link>
      <Link
        className="bg-black bg-opacity-25 hidden hover:bg-opacity-50 py-2  md:block px-4 "

        to="/dataGraphs"
      >
        DataGraphs
      </Link>
      <Link

        className="bg-black bg-opacity-25 hidden hover:bg-opacity-50 py-2  md:block px-4"

        to="/teamLookUp"
      >
        TeamLookUp
      </Link>

      <button
        className="flex-auto flex self-center flex-row bg-black bg-opacity-50 hover:bg-opacity-60 justify-center items-center md:rounded-r-lg md:px-2 sm:px-2"
        onClick={() => {
          setSettings({
            ...settings,
            Alliance: settings.Alliance == "Red" ? "Blue" : "Red",
          });
        }}
      >

        <div className="flex justify-self-center font-semibold py-4 md:py-2 px-1 md:px-4 text-center ">

          Alliance
        </div>
        <AllianceSwitch />
      </button>
      <Link
        className="md:hidden bg-black bg-opacity-25 hover:bg-opacity-50 basis-1/6 flex-auto py-4 md:py-2 px-2 text-center"
        to={links.next.to}
      >
        {links.next.text}{" "}
        <ArrowForwardIosIcon className="pb-0.5" fontSize="inherit" />
      </Link>
    </div>
  );
}
