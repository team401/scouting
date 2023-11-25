import React from "react";
import { createContext, useContext } from "react";

type PreMatchData = {
  scout: string;
  team: number | null;
  showed: boolean;
  bypassed: boolean;
};

const PreMatchContext = createContext<PreMatchData>({
  scout: "",
  team: null,
  showed: true,
  bypassed: false,
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

const AutoContext = createContext<AutoData>({
  exitedZone: false,
  balanced: false,
  scoredHigh: 0,
  scoredMid: 0,
  scoredLow: 0,
  missed: 0,
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

const TeleContext = createContext<TeleData>({
  scoredHigh: 0,
  scoredMid: 0,
  scoredLow: 0,
  balanced: false,
  dropped: 0,
});

type PostData = {
  notes: string;
  carded: boolean;
  died: boolean;
  hadIssues: boolean;
};

const PostContext = createContext<PostData>({
  notes: "",
  carded: false,
  died: false,
  hadIssues: false,
});

export function ScoutingProvider(props: { children: React.ReactNode }) {
  const preVals = useContext(PreMatchContext);
  const autoVals = useContext(AutoContext);
  const teleVals = useContext(TeleContext);
  const postVals = useContext(PostContext);

  return (
    <PreMatchContext.Provider value={preVals}>
      <AutoContext.Provider value={autoVals}>
        <TeleContext.Provider value={teleVals}>
          <PostContext.Provider value={postVals}>
            {props.children}
          </PostContext.Provider>
        </TeleContext.Provider>
      </AutoContext.Provider>
    </PreMatchContext.Provider>
  );
}
