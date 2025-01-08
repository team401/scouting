
export function getMatchScoutSchema() {
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
                    required: true
                },
                {
                    key: "match_number",
                    label: "Match Number",
                    type: "number",
                    options: {},
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "team_number",
                    label: "Team Number",
                    type: "number",
                    options: {},
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "alliance",
                    label: "Alliance",
                    type: "optionswitch",
                    options: {
                        unselected: "Red",
                        selected: "Blue",
                    },
                    defaultValue: false,
                    value: false,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "position",
                    label: "Start Position",
                    type: "dropdown",
                    options: {
                        choices: [
                            { key: "processor", text: "Processor Side" },
                            { key: "center", text: "Center" },
                            { key: "other", text: "Other Side" }
                        ]
                    },
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "noshow",
                    label: "No Show",
                    type: "switch",
                    options: {},
                    defaultValue: false,
                    value: false,
                    preserveAfterSubmit: false,
                    required: false
                },
            ]
        },
        {
            key: "auto",
            name: "Autonomous",
            components: [
                {
                    key: "moved",
                    label: "Moved?",
                    type: "switch",
                    options: {},
                    defaultValue: false,
                    value: false,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "coral",
                    label: "Coral Scored",
                    type: "stacked-counters",
                    options: {
                        labels: ["L4", "L3", "L2", "L1"]
                    },
                    defaultValue: [0, 0, 0, 0],
                    value: [0, 0, 0, 0],
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "algae",
                    label: "Algae",
                    type: "stacked-counters",
                    options: {
                        labels: ["Processed", "Net", "Missed"]
                    },
                    defaultValue: [0, 0, 0],
                    value: [0, 0, 0]    ,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "fouls",
                    label: "Fouls",
                    type: "stacked-counters",
                    options: {
                        labels: ["Foul", "TechFoul"]
                    },
                    defaultValue: [0, 0],
                    value: [0, 0]    ,
                    preserveAfterSubmit: false,
                    required: false
                },
            ]
        },
        {
            key: "teleop",
            name: "Teleop",
            components: [
                {
                    key: "coral",
                    label: "Coral Scored",
                    type: "stacked-counters",
                    options: {
                        labels: ["L4", "L3", "L2", "L1"]
                    },
                    defaultValue: [0, 0, 0, 0],
                    value: [0, 0, 0, 0],
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "algae",
                    label: "Algae",
                    type: "stacked-counters",
                    options: {
                        labels: ["Processed", "Net", "Missed"]
                    },
                    defaultValue: [0, 0, 0],
                    value: [0, 0, 0],
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "fouls",
                    label: "Fouls",
                    type: "stacked-counters",
                    options: {
                        labels: ["Foul", "TechFoul"]
                    },
                    defaultValue: [0, 0],
                    value: [0, 0]    ,
                    preserveAfterSubmit: false,
                    required: false
                },
            ]
        },
        {
            key: "endgame",
            name: "Endgame",
            components: [
                {
                    key: "endgame",
                    label: "Endgame Result",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "none", text: "No Points" },
                            { key: "park", text: "Park" },
                            { key: "shallow", text: "Shallow Cage" },
                            { key: "deep", text: "Deep Cage" }
                        ]
                    },
                    defaultValue: 'none',
                    value: 'none',
                    preserveAfterSubmit: false,
                    required: false
                }
            ]
        },
        {
            key: "postmatch",
            name: "Post Match",
            components: [
                {
                    key: "cards",
                    label: "Cards?",
                    type: "dropdown",
                    options: {
                        choices: [
                            {key: "none", text: "No Card"},
                            {key: "yellow", text: "Yellow Card"},
                            {key: "red", text: "Red Card"},
                        ]
                    },
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "comments",
                    label: "Comments",
                    type: "textarea",
                    options: {},
                    defaultValue: "",
                    value: "",
                    preserveAfterSubmit: false,
                    required: false
                },
            ]
        }
    ];
} 