import * as React from "react";
import supabase from "../Supabase/supabaseClient";
import { useDataVizContext } from "../ContextProvider";
import { useEffect, useState } from "react";
import {
  Paper,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import { GetTeamsEvent } from "../Data";
import { getEventData } from "./FullTeamGraph";
function createData(
  name: string,
  number: string,
  Auto_Amp: number,
  Auto_Speaker: number,
  Teleop_Amp: number,
  Teleop_Speaker: number,
  Climb_Score: number,
  Taxi: number
) {
  return {
    name,
    number,
    Auto_Amp,
    Auto_Speaker,
    Teleop_Amp,
    Teleop_Speaker,
    Climb_Score,
    Taxi,
  };
}
function stableSort<T>(
  array: readonly T[],
  comparator: (a: T, b: T) => number
) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}
interface Data {
  name: string;
  number: string;
  Auto_Amp: number;
  Auto_Speaker: number;
  Teleop_Amp: number;
  Teleop_Speaker: number;
  Climb_Score: number;
  Taxi: number;
}

type Order = "asc" | "desc";

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key
): (
  a: { [key in Key]: number | string },
  b: { [key in Key]: number | string }
) => number {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export default function TeamTable() {
  const { dataViz, setDataViz } = useDataVizContext();
  const [rows, setRows] = useState<any[]>(["", "", 0, 0, 0, 0, 0, 0]);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [page, setPage] = React.useState(0);
  const [order, setOrder] = React.useState<Order>("asc");
  const [orderBy, setOrderBy] = React.useState<keyof Data>("Teleop_Speaker");
  useEffect(() => {
    getRows();
  }, [dataViz.Competition]);
  const fetchAveragesComp = async (team: string) => {
    const resp = await getEventData(dataViz.Competition);
    if (resp == null || resp == undefined) {
      return [];
    }
    const teams = resp!.filter((arr: { team: any }) => arr.team == team);
    console.log("teams:", teams);
    const matches = teams!.map(
      (a: {
        Auto_Amp_Made: any;
        Auto_Speaker_Made: any;
        Teleop_Amp_Made: any;
        Teleop_Speaker_Made: any;
      }) => ({
        Auto_Amp_Made: a.Auto_Amp_Made,
        Auto_Speaker_Made: a.Auto_Speaker_Made,
        Teleop_Amp_Made: a.Teleop_Amp_Made,
        Teleop_Speaker_Made: a.Teleop_Speaker_Made,
      })
    );
    console.log("matches:", matches);
    let teamData: number[][] = [];
    for (let i = 0; i < matches.length; i++) {
      let row: number[] = new Array();
      row.push(matches[i].Auto_Amp_Made);
      row.push(matches[i].Auto_Speaker_Made);
      row.push(matches[i].Teleop_Amp_Made);
      row.push(matches[i].Teleop_Speaker_Made);
      teamData.push(row);
    }
    console.log("teamData", teamData);

    if (!teamData[0] || teamData[0] == null || teamData[0] == undefined) {
      console.log("no team data");
      return [[0], [0], [0], [0]];
    }
    let avgTeamData: number[][] = [[], [], [], []];
    for (let i = 0; i < teamData[0].length; i++) {
      let sum = 0;
      for (const element of teamData) {
        sum += element[i];
      }
      let average = sum / teamData.length;
      avgTeamData[i].push(average);
    }
    if (
      !avgTeamData[0] ||
      avgTeamData[0] == null ||
      avgTeamData[0] == undefined
    ) {
      console.log("no team data");
      return [[0], [0], [0], [0]];
    }
    console.log("avgTeamData", avgTeamData);
    return avgTeamData;
  };

  const getNickName = async (meat: string) => {
    const response = await fetch(
      "https://www.thebluealliance.com/api/v3/district/2024chs/teams/simple",
      {
        method: "GET",
        headers: {
          "X-TBA-Auth-Key":
            "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
        },
      }
    );
    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }
    const resp = await response.json();
    console.log(resp);
    const data = resp.filter(
      (arr: { team_number: string }) => arr.team_number == meat
    );
    console.log(data);
    if (!data[0] || data[0] == undefined || data[0] == null) {
      return "Error";
    }
    const NickName = data[0].nickname;
    console.log("NickName", NickName);
    return NickName;
  };
  const getRows = async () => {
    const teamsList = await GetTeamsEvent(dataViz.Competition);
    let rows: any[] = [];
    for (const team of teamsList) {
      const averages = await fetchAveragesComp(team);
      const nickName = await getNickName(team);
      console.log("averages:", averages);
      rows.push(
        createData(
          nickName,
          team,
          averages[0][0],
          averages[1][0],
          averages[2][0],
          averages[3][0],
          1,
          1
        )
      );
    }
    if (rows[0] == null || rows[0] == undefined || rows[0].length == 0) {
      console.log("no rows");
      return;
    }
    setRows(rows);
    return rows;
  };
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      stableSort(rows, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [order, orderBy, page, rowsPerPage]
  );
  return (
    <div>
      <TableContainer component={Paper}>
        <TableHead>
          <TableRow>
            <TableCell>Team</TableCell>
            <TableCell align="right">Number</TableCell>
            <TableCell align="right">Auto_Amp_Avg</TableCell>
            <TableCell align="right">Auto_Speaker_Avg</TableCell>
            <TableCell align="right">Teleop_Amp_Avg</TableCell>
            <TableCell align="right">Teleop_Speaker_Avg</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row, index) => (
            <TableRow
              key={row.name}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell align="right">{row.number}</TableCell>
              <TableCell align="right">{row.Auto_Amp}</TableCell>
              <TableCell align="right">{row.Auto_Speaker}</TableCell>
              <TableCell align="right">{row.Teleop_Amp}</TableCell>
              <TableCell align="right">{row.Teleop_Speaker}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </div>
  );
}
