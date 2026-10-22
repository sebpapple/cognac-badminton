export type TeamSource = {
  id: string;
  name: string;
  shortName: string;
  sourceUrl: string;
};

export type TeamPlayer = {
  name: string;
  role: string;
  gender?: "female" | "male" | "unknown";
};

export type TeamMatch = {
  date: string;
  opponent: string;
  location: string;
  home: boolean;
  score: string;
};

export type TeamStanding = {
  position: string;
  team: string;
  played: string;
  won: string;
  drawn: string;
  lost: string;
  points: string;
};

export type TeamData = {
  name: string;
  shortName: string;
  players: TeamPlayer[];
  matches: TeamMatch[];
  standings: TeamStanding[];
  sourceUrl: string;
  season: string;
};
