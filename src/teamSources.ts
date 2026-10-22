export type TeamSource = {
  id: string;
  name: string;
  shortName: string;
  sourceUrl: string;
};

export const clubTeams: TeamSource[] = [
  {
    id: "r3",
    name: "Régionale 3",
    shortName: "R3",
    sourceUrl: "https://icbad.ffbad.org/equipe/75623",
  },
  {
    id: "d2",
    name: "Départementale 2",
    shortName: "D2",
    sourceUrl: "https://icbad.ffbad.org/equipe/79568",
  },
  {
    id: "d3",
    name: "Départementale 3",
    shortName: "D3",
    sourceUrl: "https://icbad.ffbad.org/equipe/79899",
  },
  {
    id: "d4",
    name: "Départementale 4",
    shortName: "D4",
    sourceUrl: "https://icbad.ffbad.org/equipe/79906",
  },
];
