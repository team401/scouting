
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
                            { key: "processor", text: "Processor" },
                            { key: "center", text: "center" },
                            { key: "other", text: "Other" }
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
                    key: "coral_scored",
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
            ]
        },
        {
            key: "teleop",
            name: "Teleop",
            components: [
                {
                    key: "speaker_scored",
                    label: "Speaker Scored",
                    type: "counter",
                    options: {},
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    required: false
                },
                {
                    key: "speaker_missed",
                    label: "Speaker Missed",
                    type: "counter",
                    options: {},
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    required: false
                },
            ]
        },
        {
            key: "postmatch",
            name: "Post Match",
            components: [
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