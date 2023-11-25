import { Button, Link, Typography } from "@mui/material";
import React from "react";

type btnProps = {
  link: string;
  title: string | JSX.Element;
  key?: string;
  small?: boolean;
};

export default function StyledButton(props: btnProps) {
  return (
    <Button
      component={Link}
      href={props.link}
      key={props.key}
      size={props.small ? "medium" : "large"}
      variant="contained"
      sx={{ mb: 0, mt: 2, mx: 2 }}
    >
      <Typography
        variant={props.small ? "h6" : "h5"}
        align="left"
        color="white"
        component="h1"
        textAlign="center"
        sx={{ p: 0, m: 0 }}
      >
        {props.title}
      </Typography>
    </Button>
  );
}
