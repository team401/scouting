import React, { PropsWithChildren } from "react";
import { createContext, useContext, useState } from "react";
import { GetTeamsEvent } from "./Data";

export type alliance = "Red" | "Blue";

export const positions = ["1", "2", "3"] as const;
export type position = (typeof positions)[number];

export type PitScout = {
  Competition: string;
  Drive: string;
  Team: string;
  TeamsList: string[];
  Nomination: string[];
  Amp: boolean;
  Speaker: boolean;
  Climb: boolean;
  Trap: boolean;
  Comments: string;
};
type PitScoutState = {
  pitScout: PitScout;
  setPitScout: (value: PitScout) => void;
};

export type DataViz = {
  Competition: string;
  Team: string;
  TeamsList: string[];
  NickName: string;
  AllComps: boolean;
  Playoffs: boolean;
};
type DataVizState = {
  dataViz: DataViz;
  setDataViz: (value: DataViz) => void;
};
export type Settings = {
  Alliance: alliance;
  Position: position;
  Competition: string;
  FrcTeams: Array<String>;
};

type SettingsState = {
  settings: Settings;
  // setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  setSettings: (value: Settings) => void;
};

export enum Boolean {
  FALSE = 0,
  TRUE = 1,
}

export type PreMatch = {
  Team: string;
  NoShow: boolean;
  Match: number | undefined;
  Playoffs: boolean;
};

type PreMatchState = {
  preMatch: PreMatch;
  setPreMatch: React.Dispatch<React.SetStateAction<PreMatch>>;
};

export type Auto = {
  Amp_Made: number;
  Amp_Missed: number;
  Speaker_Made: number;
  Speaker_Missed: number;
  Taxi: boolean;
};

type AutoState = {
  auto: Auto;
  setAuto: React.Dispatch<React.SetStateAction<Auto>>;
};

export type Teleop = {
  Amp_Made: number;
  Amp_Missed: number;
  Speaker_Made: number;
  Speaker_Missed: number;
  EndGame: string;
  Trap: string;
  Text: string;
  Disabled: boolean;
};

type TeleopState = {
  teleop: Teleop;
  setTeleop: React.Dispatch<React.SetStateAction<Teleop>>;
};

export const defaultPit: PitScout = {
  TeamsList: [],
  Competition: "2024vabla",
  Team: "401",
  Drive: "Tank",
  Nomination: ["N/A"],
  Amp: false,
  Speaker: false,
  Trap: false,
  Climb: false,
  Comments: "",
};

export const defaultData: DataViz = {
  Competition: "2024vabla",
  Team: "401",
  TeamsList: [],
  NickName: "",
  AllComps: false,
  Playoffs: false,
};
export const defaultAuto: Auto = {
  Amp_Made: 0,
  Amp_Missed: 0,
  Speaker_Made: 0,
  Speaker_Missed: 0,
  Taxi: false,
};
export const defaultTeleop: Teleop = {
  Amp_Made: 0,
  Amp_Missed: 0,
  Speaker_Made: 0,
  Speaker_Missed: 0,
  EndGame: "Not Attempted",
  Trap: "Not Attempted",
  Text: "",
  Disabled: false,
};
export const defaultSettings: Settings = {
  Alliance: "Red",
  Position: "1",
  Competition: "2024vabla",
  FrcTeams: [""],
};
export const defaultPreMatch: PreMatch = {
  Team: "",
  NoShow: false,
  Match: 0,
  Playoffs: false,
};

const PitScoutContext = createContext<PitScoutState | null>(null);
const DataVizContext = createContext<DataVizState | null>(null);
const SettingsContext = createContext<SettingsState | null>(null);
const PreMatchContext = createContext<PreMatchState | null>(null);
const AutoContext = createContext<AutoState | null>(null);
const TeleopContext = createContext<TeleopState | null>(null);

export function ContextProvider(props: PropsWithChildren<{}>) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [preMatch, setPreMatch] = useState<PreMatch>(defaultPreMatch);
  const [auto, setAuto] = useState<Auto>(defaultAuto);
  const [teleop, setTeleop] = useState<Teleop>(defaultTeleop);
  const [dataViz, setDataViz] = useState<DataViz>(defaultData);
  const [pitScout, setPitScout] = useState<PitScout>(defaultPit);

  // const teams = GetTeams(settings.Competition).then((teams) => {
  //   setSettings({
  //     ...settings,
  //     FrcTeams: teams,
  //   });
  // });

  const { children } = props;
  return (
    <div>
      <SettingsContext.Provider
        value={{
          settings,
          setSettings,
        }}
      >
        <PreMatchContext.Provider value={{ preMatch, setPreMatch }}>
          <AutoContext.Provider value={{ auto, setAuto }}>
            <TeleopContext.Provider value={{ teleop, setTeleop }}>
              <DataVizContext.Provider value={{ dataViz, setDataViz }}>
                <PitScoutContext.Provider value={{ pitScout, setPitScout }}>
                  {children}
                </PitScoutContext.Provider>
              </DataVizContext.Provider>
            </TeleopContext.Provider>
          </AutoContext.Provider>
        </PreMatchContext.Provider>
      </SettingsContext.Provider>
    </div>
  );
}

export function usePitScoutContext(): PitScoutState {
  const context = useContext(PitScoutContext);
  if (!context) {
    throw Error("usePitScoutContext must be used within a ContextProvider");
  }
  return context;
}
export function useDataVizContext(): DataVizState {
  const context = useContext(DataVizContext);
  if (!context) {
    throw Error("useDataVizContext must be used within a ContextProvider");
  }
  return context;
}
export function useSettingsContext(): SettingsState {
  const context = useContext(SettingsContext);
  if (!context) {
    throw Error("useSettingsContext must be used within a ContextProvider");
  }

  return context;
}

export function usePreMatchContext(): PreMatchState {
  const context = useContext(PreMatchContext);
  if (!context) {
    throw Error("usePreMatchContext must be used within a ContextProvider");
  }

  return context;
}

export function useAutoContext(): AutoState {
  const context = useContext(AutoContext);
  if (!context) {
    throw Error("useAutoContext must be used within a ContextProvider");
  }

  return context;
}

export function useTeleopContext(): TeleopState {
  const context = useContext(TeleopContext);
  if (!context) {
    throw Error("useTeleopContext must be used within a ContextProvider");
  }

  return context;
}
