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
  TableRow,
} from "@mui/material";

export default function TeamTable() {
  const { dataViz, setDataViz } = useDataVizContext();
  return (
    <TableContainer component={Paper}>
      <TableHead>
        <TableRow>
          <TableCell>Team</TableCell>
          <TableCell align="right">Auto_Amp_Avg</TableCell>
          <TableCell align="right">Auto_Speaker_Avg</TableCell>
          <TableCell align="right">Teleop_Amp_Avg</TableCell>
          <TableCell align="right">Teleop_Speaker_Avg</TableCell>
        </TableRow>
      </TableHead>
      <TableBody></TableBody>
    </TableContainer>
  );
}
