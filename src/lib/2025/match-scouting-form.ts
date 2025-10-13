// @ts-nocheck

import { getTeamInputElement } from "@/lib/data-submission";

export async function getMatchScoutSchema() {
    const teamInputElement = await getTeamInputElement();

    return [
        {
            key: "prematch",
            name: "Pre-match",
            components: [
                {
    key: "scout_name",
    label: "Scout Name",
    type: "dropdown",
    options: {
        choices: [
            { key: "invalid", text: "" },
            { key: "Ahmed", text: "Ahmed A." },
            { key: "Laura", text: "Laura A." },
            { key: "Theta", text: "Theta B." },
            { key: "Kenneth", text: "Kenneth B." },
            { key: "Chase", text: "Chase B." },
            { key: "Alexis", text: "Alexis B." },
            { key: "Leela", text: "Leela B." },
            { key: "Matthew", text: "Matthew C." },
            { key: "Lucinda", text: "Lucinda C." },
            { key: "Jonah", text: "Jonah C." },
            { key: "Grayson", text: "Grayson C." },
            { key: "Brennen", text: "Brennen D." },
            { key: "Stephen", text: "Stephen D." },
            { key: "Alexander", text: "Alexander F." },
            { key: "Jack", text: "Jack F." },
            { key: "Gabriel", text: "Gabriel G." },
            { key: "Evan", text: "Evan G." },
            { key: "Zhiying", text: "Zhiying H." },
            { key: "Benjamin", text: "Benjamin H." },
            { key: "Ian_J", text: "Ian J." },
            { key: "Baden", text: "Baden M." },
            { key: "Reece", text: "Reece M." },
            { key: "Aiden", text: "Aiden M." },
            { key: "Samson", text: "Samson O." },
            { key: "Sophia", text: "Sophia P." },
            { key: "Serena", text: "Serena S." },
            { key: "Kyle", text: "Kyle S." },
            { key: "Malek", text: "Malek S." },
            { key: "Salma", text: "Salma S." },
            { key: "Arlo", text: "Arlo S." },
            { key: "Joshua", text: "Joshua S." },
            { key: "Nathan", text: "Nathan S." },
            { key: "Jonathan", text: "Jonathan S." },
            { key: "Hunter", text: "Hunter S." },
            { key: "Rishi", text: "Rishi T." },
            { key: "William", text: "William T." },
            { key: "Sean", text: "Sean V." },
            { key: "Lijin", text: "Lijin W." },
            { key: "Ian_Y", text: "Ian Y." },
            { key: "Letian", text: "Letian Z." }
        ]
    },
    defaultValue: "test",
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
                teamInputElement,
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
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
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
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "noshow",
                    label: "No Show",
                    type: "switch",
                    options: {},
                    defaultValue: false,
                    value: false,
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
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
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "coral",
                    label: "Coral",
                    type: "grid-counters",
                    options: {
                        labels: ["L4", "L3", "L2", "L1"],
                        sections: [
                            { key: "scored", text: "Scored" },
                        ]
                    },
                    defaultValue: [[0, 0], [0, 0], [0, 0], [0, 0]],
                    value: [[0, 0], [0, 0], [0, 0], [0, 0]],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "algae",
                    label: "Algae",
                    type: "grid-counters",
                    options: {
                        labels: ["Processor", "Net", "Dislodged"],
                        sections: [
                            { key: "success", text: "Success" },
                        ]
                    },
                    defaultValue: [[0, 0], [0, 0], [0, 0]],
                    value: [[0, 0], [0, 0], [0, 0]],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "missed",
                    label: "Missed",
                    type: "stacked-counters",
                    options: {
                        labels: ["Coral", "Algae"]
                    },
                    defaultValue: [0, 0],
                    value: [0, 0],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "foul",
                    label: "Fouls",
                    type: "stacked-counters",
                    options: {
                        labels: ["Minor", "Major"]
                    },
                    defaultValue: [0, 0],
                    value: [0, 0],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
            ]
        },
        {
            key: "teleop",
            name: "Teleop",
            components: [
                {
                    key: "coral",
                    label: "Coral",
                    type: "grid-counters",
                    options: {
                        labels: ["L4", "L3", "L2", "L1"],
                        sections: [
                            { key: "scored", text: "Scored" },
                        ]
                    },
                    defaultValue: [[0, 0], [0, 0], [0, 0], [0, 0]],
                    value: [[0, 0], [0, 0], [0, 0], [0, 0]],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "algae",
                    label: "Algae",
                    type: "grid-counters",
                    options: {
                        labels: ["Processor", "Net", "Dislodged"],
                        sections: [
                            { key: "success", text: "Success" },
                        ]
                    },
                    defaultValue: [[0, 0], [0, 0], [0, 0]],
                    value: [[0, 0], [0, 0], [0, 0]],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "missed",
                    label: "Missed",
                    type: "stacked-counters",
                    options: {
                        labels: ["Coral", "Algae"]
                    },
                    defaultValue: [0, 0],
                    value: [0, 0],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "foul",
                    label: "Fouls",
                    type: "stacked-counters",
                    options: {
                        labels: ["Minor", "Major"]
                    },
                    defaultValue: [0, 0],
                    value: [0, 0],
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
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
                            { key: "none", text: "None" },
                            { key: "park", text: "Park" },
                            { key: "shallow", text: "Shallow Cage" },
                            { key: "shallow_fail", text: "Shallow Cage Failed" },
                            { key: "deep", text: "Deep Cage" },
                            { key: "deep_fail", text: "Deep Cage Failed" }
                        ]
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "climb_speed",
                    label: "Climb Speed",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "-1", text: "N/A" },
                            { key: "1", text: "1" },
                            { key: "2", text: "2" },
                            { key: "3", text: "3" },
                            { key: "4", text: "4" },
                            { key: "5", text: "5" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
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
                            { key: "none", text: "No Card" },
                            { key: "yellow", text: "Yellow Card" },
                            { key: "red", text: "Red Card" },
                        ]
                    },
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: false,
                    error: false
                },
                {
                    key: "driving",
                    label: "Driving",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "-1", text: "N/A" },
                            { key: "1", text: "1" },
                            { key: "2", text: "2" },
                            { key: "3", text: "3" },
                            { key: "4", text: "4" },
                            { key: "5", text: "5" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "defense",
                    label: "Defense",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "-1", text: "N/A" },
                            { key: "1", text: "1" },
                            { key: "2", text: "2" },
                            { key: "3", text: "3" },
                            { key: "4", text: "4" },
                            { key: "5", text: "5" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "stability",
                    label: "Stability",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "-1", text: "N/A" },
                            { key: "1", text: "1" },
                            { key: "2", text: "2" },
                            { key: "3", text: "3" },
                            { key: "4", text: "4" },
                            { key: "5", text: "5" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    incrementAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "comments",
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