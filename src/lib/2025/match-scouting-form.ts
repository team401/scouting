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
                            { key: "0", text: "0" },
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