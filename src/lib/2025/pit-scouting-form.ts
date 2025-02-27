// @ts-nocheck

import { getTeamInputElement } from "@/lib/data-submission";

export async function getPitScoutSchema() {
    const teamInputElement = await getTeamInputElement();

    return [
        {
            key: "pit",
            name: "",
            components: [
                {
                    key: "scout_name",
                    label: "Scout Name",
                    type: "text",
                    options: {},
                    defaultValue: "",
                    value: "",
                    preserveAfterSubmit: true,
                    required: true,
                    error: false
                },
                teamInputElement,
                {
                    key: "drivetrain",
                    label: "Drivetrain Type",
                    type: "dropdown",
                    options: {
                        choices: [
                            { key: "swerve", text: "Swerve" },
                            { key: "tank", text: "Tank" },
                            { key: "mecanum", text: "Mecanum" },
                            { key: "other", text: "Other" }
                        ]
                    },
                    defaultValue: 0,
                    value: 0,
                    preserveAfterSubmit: true,
                    required: false,
                    error: false
                },
                {
                    key: "coral_intake",
                    label: "Coral Intake",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "none", text: "None" },
                            { key: "feeder", text: "Feeder" },
                            { key: "ground", text: "Ground" },
                            { key: "both", text: "Both" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "algae_intake",
                    label: "Algae Intake",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "none", text: "None" },
                            { key: "ground", text: "Ground" },
                            { key: "reef", text: "Reef" },
                            { key: "both", text: "Both" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    required: true,
                    error: false
                },
                {
                    key: "climb",
                    label: "Climb Type",
                    type: "radio",
                    options: {
                        choices: [
                            { key: "none", text: "None" },
                            { key: "shallow", text: "Shallow only" },
                            { key: "deep", text: "Deep only" },
                            { key: "both", text: "Both" },
                        ],
                        isVertical: false
                    },
                    defaultValue: '',
                    value: '',
                    preserveAfterSubmit: false,
                    required: true,
                    error: false
                },
            ]
        },
    ];
} 