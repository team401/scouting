import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

// A custom theme for this app
const theme = createTheme({
  palette: {
    primary: {
      main: "#AB0800",
    },
    secondary: {
      main: "#FC5D1C",
    },
    error: {
      main: red.A400,
    },
  },
});

export default theme;
