import * as React from "react";
import { Grid } from "@mui/material";

import Page from "./components/Page";
import { HeaderButton } from "./components/HeaderCard";
import BigCheckBox from "./components/BigCheckBox";

import { usePostContext } from "./ScoutingContexts";
import LabeledTextInput from "./components/LabeledTextInput";

export default function PostMatch() {
  const postMatch = usePostContext();

  const pageButtons: HeaderButton[] = [{ title: "SUBMIT", link: "/#/pre" }];

  return (
    <Page title="Post Match" buttons={pageButtons}>
      <Grid item xs={12}>
        <LabeledTextInput
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            postMatch.setData({
              ...postMatch.data,
              notes: event.target.value,
            });
          }}
          label="Notes on team"
          value={postMatch.data.notes}
          type="text"
        />
      </Grid>
      <Grid item md={4} xs={12} textAlign="center">
        <BigCheckBox
          label="Showed up to match:"
          isChecked={postMatch.data.died}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            postMatch.setData({
              ...postMatch.data,
              died: event.target.checked,
            });
          }}
        />
      </Grid>
      <Grid item md={4} xs={12} textAlign="center">
        <BigCheckBox
          label="Carded:"
          isChecked={postMatch.data.carded}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            postMatch.setData({
              ...postMatch.data,
              carded: event.target.checked,
            });
          }}
        />
      </Grid>
      <Grid item md={4} xs={12} textAlign="center">
        <BigCheckBox
          label="Had problems:"
          isChecked={postMatch.data.hadIssues}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            postMatch.setData({
              ...postMatch.data,
              hadIssues: event.target.checked,
            });
          }}
        />
      </Grid>
    </Page>
  );
}

export const PostMemo = React.memo(PostMatch);
