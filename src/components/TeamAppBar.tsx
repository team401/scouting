import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import { Divider, List, ListItemButton, ListItemText } from "@mui/material";
import { Link, NavLink } from "react-router-dom";

import logo from "../img/logo_white.png";
import { PageType } from "../App";

export default function TeamAppBar(props: { pages: PageType[] }) {
  const [open, setOpen] = React.useState(false);

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event &&
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }

      setOpen(open);
    };

  const logoImage = (
    <img
      src={logo}
      style={{
        maxHeight: 40,
        marginTop: 10,
        marginRight: 10,
        marginLeft: 0,
        padding: 0,
      }}
    ></img>
  );

  return (
    <AppBar position="fixed" style={{ background: "secondary" }}>
      <Container disableGutters maxWidth={false}>
        <Toolbar disableGutters>
          <Link to={"/"}>
            <Box sx={{ display: { xs: "none", lg: "flex" }, paddingLeft: 2 }}>
              {logoImage}
            </Box>
          </Link>
          <Drawer anchor="left" open={open} onClose={toggleDrawer(false)}>
            <List
              component="nav"
              onClick={toggleDrawer(false)}
              sx={{ minWidth: 200 }}
            >
              {props.pages.map((page) => (
                <Box key={page.title}>
                  <NavLink to={page.path} style={{ textDecoration: "none" }}>
                    {({ isActive }) => (
                      <ListItemButton>
                        <ListItemText
                          primary={page.title}
                          primaryTypographyProps={{
                            fontSize: 18,
                            fontWeight: isActive ? "800" : "",
                            color: "text.secondary",
                          }}
                        />
                      </ListItemButton>
                    )}
                  </NavLink>
                  <Divider />
                </Box>
              ))}
            </List>
          </Drawer>
          <Box sx={{ flexGrow: 1, display: { xs: "flex", lg: "none" } }}>
            <IconButton
              size="large"
              aria-label="open menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={toggleDrawer(true)}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          </Box>
          <Link to="/">
            <Box sx={{ display: { xs: "flex", lg: "none" } }}>{logoImage}</Box>
          </Link>
          <Typography
            variant="h5"
            noWrap
            component="a"
            sx={{
              mr: 2,
              display: { xs: "flex", lg: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".3rem",
              color: "inherit",
              textDecoration: "none",
            }}
          ></Typography>
          <Box sx={{ flexGrow: 1, display: { xs: "none", lg: "flex" } }}>
            {props.pages.map((page) => (
              <Box key={page.path}>
                {page.path === "/" ? null : (
                  <NavLink to={page.path} style={{ textDecoration: "none" }}>
                    {({ isActive }) => (
                      <Button
                        onClick={toggleDrawer(false)}
                        size="large"
                        sx={{
                          my: 0,
                          py: 0,
                          color: "white",
                          display: "block",
                          textAlign: "center",
                          fontWeight: isActive ? "800" : "",
                        }}
                      >
                        {page.title}
                      </Button>
                    )}
                  </NavLink>
                )}
              </Box>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export const AppBarMemo = React.memo(TeamAppBar);
