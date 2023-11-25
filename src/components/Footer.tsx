import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import GitHubIcon from "@mui/icons-material/GitHub";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import YoutubeIcon from "@mui/icons-material/YouTube";
import theme from "../theme";

const socials = [
  {
    icon: <GitHubIcon fontSize="large" />,
    link: "http://github.com/team401",
  },
  {
    icon: <InstagramIcon fontSize="large" />,
    link: "https://instagram.com/team401",
  },
  {
    icon: <FacebookIcon fontSize="large" />,
    link: "https://www.facebook.com/copperheadrobotics/",
  },
  {
    icon: <TwitterIcon fontSize="large" />,
    link: "https://twitter.com/frcteam401",
  },
  {
    icon: <YoutubeIcon fontSize="large" />,
    link: "https://www.youtube.com/@FRCTeam401CopperheadRobotics",
  },
];

function Copyright() {
  return (
    <Typography
      variant="subtitle1"
      align="center"
      color="text.secondary"
      component="p"
    >
      {"Copyright © "}
      <Link color="inherit" href="https://team401.github.io/">
        FRC Team 401
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

export default function Footer() {
  return (
    <>
      <Container
        disableGutters
        maxWidth={false}
        sx={{ paddingTop: 3, background: theme.palette.background.default }}
      >
        <Box sx={{ p: 1 }} component="footer">
          <Stack spacing={2} direction="row" justifyContent="center">
            {socials.map((social) => (
              <Link href={social.link} key={social.link}>
                {social.icon}
              </Link>
            ))}
          </Stack>
          <Copyright />
        </Box>
      </Container>
    </>
  );
}

export const FooterMemo = React.memo(Footer);
