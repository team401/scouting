import React, { useState } from "react";
import { createContext, useContext } from "react";

export const Stations: string[] = [
  "RED 1",
  "RED 2",
  "RED 3",
  "BLUE 1",
  "BLUE2",
  "BLUE 3",
];

export const Events: string[] = [
  "2023vabla",
  "2023vagle",
  "2023chcmp",
  "2023gal",
];

type SettingsData = {
  station: (typeof Stations)[number];
  event: (typeof Events)[number];
  teamList: string[];
};

const defaultSettings = {
  station: "RED 1",
  event: "2023vabla",
  teamList: [],
};

type PreMatchData = {
  scout: string;
  team: number | null;
  match: number | null;
  showed: boolean;
  bypassed: boolean;
};

const defaultPre: PreMatchData = {
  scout: "",
  team: null,
  match: null,
  showed: true,
  bypassed: false,
};

export type AutoData = {
  exitedZone: boolean;
  balanced: boolean;
  scoredHigh: number;
  scoredMid: number;
  scoredLow: number;
  missed: number;
};

const defaultAuto = {
  exitedZone: false,
  balanced: false,
  scoredHigh: 0,
  scoredMid: 0,
  scoredLow: 0,
  missed: 0,
};

type TeleData = {
  scoredHigh: number;
  scoredMid: number;
  scoredLow: number;
  balanced: boolean;
  missed: number;
};

const defaultTele: TeleData = {
  scoredHigh: 0,
  scoredMid: 0,
  scoredLow: 0,
  balanced: false,
  missed: 0,
};

type PostData = {
  notes: string;
  carded: boolean;
  died: boolean;
  hadIssues: boolean;
};

const defaultPost: PostData = {
  notes: "",
  carded: false,
  died: false,
  hadIssues: false,
};

type ContextState<T> = {
  data: T;
  setData: Function;
};

const PreMatchContext = createContext<ContextState<PreMatchData>>({
  data: defaultPre,
  setData: () => {},
});

const AutoContext = createContext<ContextState<AutoData>>({
  data: defaultAuto,
  setData: () => {},
});

const TeleContext = createContext<ContextState<TeleData>>({
  data: defaultTele,
  setData: () => {},
});

const PostContext = createContext<ContextState<PostData>>({
  data: defaultPost,
  setData: () => {},
});

const SettingsContext = createContext<ContextState<SettingsData>>({
  data: defaultSettings,
  setData: () => {},
});

export function usePreContext() {
  return useContext(PreMatchContext);
}

export function useAutoContext() {
  return useContext(AutoContext);
}

export function useTeleContext() {
  return useContext(TeleContext);
}

export function usePostContext() {
  return useContext(PostContext);
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}

export function ScoutingProvider(props: { children: React.ReactNode }) {
  const [preVals, setPr] = useState<PreMatchData>(defaultPre);
  const [autoVals, setAut] = useState<AutoData>(defaultAuto);
  const [teleVals, setTel] = useState<TeleData>(defaultTele);
  const [postVals, setPos] = useState<PostData>(defaultPost);
  const [settingsVals, setSet] = useState<SettingsData>(defaultSettings);

  return (
    <SettingsContext.Provider value={{ data: settingsVals, setData: setSet }}>
      <PreMatchContext.Provider value={{ data: preVals, setData: setPr }}>
        <AutoContext.Provider value={{ data: autoVals, setData: setAut }}>
          <TeleContext.Provider value={{ data: teleVals, setData: setTel }}>
            <PostContext.Provider value={{ data: postVals, setData: setPos }}>
              {props.children}
            </PostContext.Provider>
          </TeleContext.Provider>
        </AutoContext.Provider>
      </PreMatchContext.Provider>
    </SettingsContext.Provider>
  );
}
