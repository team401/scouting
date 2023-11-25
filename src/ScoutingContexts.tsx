import React, { useState } from "react";
import { createContext, useContext } from "react";

export type PreMatchData = {
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

type PreMatchState = {
  preMatch: PreMatchData;
  setPre: Function;
};

const PreMatchContext = createContext<PreMatchState>({
  preMatch: defaultPre,
  setPre: () => {},
});

export function usePreContext() {
  return useContext(PreMatchContext);
}

type AutoData = {
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

type AutoState = {
  auto: AutoData;
  setAuto: Function;
};

const AutoContext = createContext<AutoState>({
  auto: defaultAuto,
  setAuto: () => {},
});

export function useAutoContext() {
  return useContext(AutoContext);
}

type TeleData = {
  scoredHigh: number;
  scoredMid: number;
  scoredLow: number;
  balanced: boolean;
  dropped: number;
};

const defaultTele: TeleData = {
  scoredHigh: 0,
  scoredMid: 0,
  scoredLow: 0,
  balanced: false,
  dropped: 0,
};

type TeleState = {
  tele: TeleData;
  setTele: Function;
};

const TeleContext = createContext<TeleState>({
  tele: defaultTele,
  setTele: () => {},
});

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

type PostState = {
  post: PostData;
  setPost: Function;
};

const PostContext = createContext<PostState>({
  post: defaultPost,
  setPost: () => {},
});

export function ScoutingProvider(props: { children: React.ReactNode }) {
  const [preVals, setPr] = useState<PreMatchData>(defaultPre);
  const [autoVals, setAut] = useState<AutoData>(defaultAuto);
  const [teleVals, setTel] = useState<TeleData>(defaultTele);
  const [postVals, setPos] = useState<PostData>(defaultPost);

  return (
    <PreMatchContext.Provider value={{ preMatch: preVals, setPre: setPr }}>
      <AutoContext.Provider value={{ auto: autoVals, setAuto: setAut }}>
        <TeleContext.Provider value={{ tele: teleVals, setTele: setTel }}>
          <PostContext.Provider value={{ post: postVals, setPost: setPos }}>
            {props.children}
          </PostContext.Provider>
        </TeleContext.Provider>
      </AutoContext.Provider>
    </PreMatchContext.Provider>
  );
}
