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
import {
  fetchClimbAvg,
  fetchTaxiAvg,
  fetchTrapAvg,
  getEventData,
} from "./FullTeamGraph";

import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableSortLabel from "@mui/material/TableSortLabel";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { visuallyHidden } from "@mui/utils";
import { getAverageData } from "../utils/average";
import { AverageData } from "../types";

interface Data {
  name: string;
  number: string;
  Auto_Amp: number;
  Auto_Speaker: number;
  Teleop_Amp: number;
  Teleop_Speaker: number;
  Climb_Score: number;
  Taxi: number;
  Trap: number;
}

function createData(
  name: string,
  number: string,
  Auto_Amp: number,
  Auto_Speaker: number,
  Teleop_Amp: number,
  Teleop_Speaker: number,
  Climb_Score: number,
  Taxi: number,
  Trap: number
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
    Trap,
  };
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

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
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

interface HeadCell {
  disablePadding: boolean;
  id: keyof Data;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  {
    id: "name",
    numeric: false,
    disablePadding: true,
    label: "Team",
  },
  {
    id: "number",
    numeric: true,
    disablePadding: false,
    label: "Team_Number",
  },
  {
    id: "Auto_Amp",
    numeric: true,
    disablePadding: true,
    label: "Avg_Auto_Amp",
  },
  {
    id: "Auto_Speaker",
    numeric: true,
    disablePadding: true,
    label: "Avg_Auto_Speaker",
  },
  {
    id: "Teleop_Amp",
    numeric: true,
    disablePadding: true,
    label: "Avg_Teleop_Amp",
  },
  {
    id: "Teleop_Speaker",
    numeric: true,
    disablePadding: false,
    label: "Avg_Teleop_Speaker",
  },
  {
    id: "Climb_Score",
    numeric: true,
    disablePadding: false,
    label: "Avg_Climb_Score",
  },
  {
    id: "Taxi",
    numeric: true,
    disablePadding: false,
    label: "Taxi (%)",
  },
  {
    id: "Trap",
    numeric: true,
    disablePadding: false,
    label: "Trap (%)",
  },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (
    event: React.MouseEvent<unknown>,
    property: keyof Data
  ) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const {
    onSelectAllClick,
    order,
    orderBy,
    numSelected,
    rowCount,
    onRequestSort,
  } = props;
  const createSortHandler =
    (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox"></TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            padding={headCell.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const { numSelected } = props;

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(
              theme.palette.primary.main,
              theme.palette.action.activatedOpacity
            ),
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: "1 1 100%" }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
      ) : (
        <Typography
          sx={{ flex: "1 1 100%" }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          Team Averages
        </Typography>
      )}
      {numSelected > 0 ? (
        <Tooltip title="Delete">
          <IconButton>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Filter list">
          <IconButton>
            <FilterListIcon />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  );
}
export default function EnhancedTable() {
  const { dataViz, setDataViz } = useDataVizContext();
  const [rows, setRows] = useState<any[]>(["", "", 0, 0, 0, 0, 0, 0]);
  const [order, setOrder] = React.useState<Order>("asc");
  const [orderBy, setOrderBy] = React.useState<keyof Data>("number");
  const [selected, setSelected] = React.useState<readonly number[]>([]);
  const [page, setPage] = React.useState(0);
  const [dense, setDense] = React.useState(false);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  useEffect(() => {
    createRows();
  }, [dataViz.Competition, dataViz.Playoffs]);
  const createRows = async () => {
    const data = await getAverageData(dataViz.Competition);
    console.log(data);
    if (data!.length == 0 || data == null || data == undefined) {
      setRows(["", "", 0, 0, 0, 0, 0, 0]);
      console.log("Table has no data");
      return;
    }
    let rows: any[] = [];
    await Promise.all(
      data.map(async (value: AverageData) => {
        let teamNum = value.teamNumber as unknown as string;
        let nickName = await getNickName(teamNum);
        console.log(nickName);
        rows.push(
          createData(
            nickName,
            value.teamNumber as unknown as string,
            value.autoAmp,
            value.autoSpeaker,
            value.teleAmp,
            value.teleSpeaker,
            value.climb,
            value.taxiPercent,
            value.trapPercent
          )
        );
      })
    );
    setRows(rows);
    return rows;
  };

  const getNickName = async (meat: string) => {
    let response;
    if (dataViz.AllComps) {
      response = await fetch(
        "https://www.thebluealliance.com/api/v3/district/2024chs/teams/simple",
        {
          method: "GET",
          headers: {
            "X-TBA-Auth-Key":
              "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
          },
        }
      );
    } else {
      if (meat == "" || meat.length == 0) {
        return setDataViz({ ...dataViz, NickName: "Error" });
      }
      response = await fetch(
        "https://www.thebluealliance.com/api/v3/team/frc" + meat + "/simple",
        {
          method: "GET",
          headers: {
            "X-TBA-Auth-Key":
              "3MbBFKbSOrahWa5SA7GmFv6L9ByIly1nk0vUPPSK1xQnI4ccLvsF5FRknNFz1CAm",
          },
        }
      );
    }
    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }
    const resp = await response.json();
    if (resp.legnth == 0 || resp == undefined || resp == null) {
      return "Error";
    }
    const NickName = resp.nickname;
    console.log("NickName", NickName);
    return NickName;
  };

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof Data
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = rows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: readonly number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDense(event.target.checked);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      stableSort(rows, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [order, orderBy, page, rowsPerPage, rows]
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <EnhancedTableToolbar numSelected={selected.length} />
        <TableContainer>
          <Table
            sx={{ maxWidth: 250 }}
            aria-labelledby="tableTitle"
            size={dense ? "small" : "medium"}
          >
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={rows.length}
            />
            <TableBody>
              {visibleRows.map((row, index) => {
                const isItemSelected = isSelected(row.number as number);
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <TableRow
                    hover
                    onClick={(event) =>
                      handleClick(event, row.number as number)
                    }
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={row.number as number}
                    selected={isItemSelected}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell padding="checkbox"></TableCell>
                    <TableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                    >
                      {row.name}
                    </TableCell>
                    <TableCell align="right">{row.number}</TableCell>
                    <TableCell align="right">{row.Auto_Amp}</TableCell>
                    <TableCell align="right">{row.Auto_Speaker}</TableCell>
                    <TableCell align="right">{row.Teleop_Amp}</TableCell>
                    <TableCell align="right">{row.Teleop_Speaker}</TableCell>
                    <TableCell align="right">{row.Climb_Score}</TableCell>
                    <TableCell align="right">{row.Taxi}</TableCell>
                    <TableCell align="right">{row.Trap}</TableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: (dense ? 33 : 53) * emptyRows,
                  }}
                >
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
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
      </Paper>
      <FormControlLabel
        control={<Switch checked={dense} onChange={handleChangeDense} />}
        label="Dense padding"
      />
    </Box>
  );
}
