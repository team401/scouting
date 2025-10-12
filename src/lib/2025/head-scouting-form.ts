// @ts-nocheck

import { getTeamInputElement } from "@/lib/data-submission";

export async function getHeadScoutSchema() {
    const teamInputElement = await getTeamInputElement();

    return [
        {
            key: "prematch",
            name: "Pre-match",
            components: [
                {
                    key: "scout_name",
                    label: "Scout Name",
                    type: "text",
                    options: {},
                    defaultValue: "",
                    value: "",
                    preserveAfterSubmit: true,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "scout_team",
                    label: "Scout Team",
                    type: "dropdown",
                    options: {
                        choices: [
                            { key: "invalid", text: "" },
                            { key: "401", text: "401 - Copperhead Robotics" },
                            { key: "1629", text: "1629 - Garrett Coalition (GaCo)" },
                            { key: "5804", text: "5804 - TORCH" }
                        ]
                    },
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: true,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "match_number",
                    label: "Match Number",
                    type: "number",
                    options: {},
                    defaultValue: null,
                    value: null,
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: true,
                    required: true,
                    error: false
                },
            ]
        },
        {
            key: "auto",
            name: "Autonomous",
            components: [
                {
                    key: "autocomments",
                    label: "Auto Comments",
                    type: "textarea",
                    options: {},
                    defaultValue: "",
                    value: "",
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
            ]
        },
        {
            key: "teleop",
            name: "Teleop/Endgame",
            components: [
                {
                    key: "telecomments",
                    label: "Tele Comments",
                    type: "textarea",
                    options: {},
                    defaultValue: "",
                    value: "",
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
            ]
        },
        {
            key: "postmatch",
            name: "Post Match",
            components: [
                {
                    key: "postcomments",
                    label: "Comments",
                    type: "textarea",
                    options: {},
                    defaultValue: "",
                    value: "",
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
            ]
        }
    ];
} 