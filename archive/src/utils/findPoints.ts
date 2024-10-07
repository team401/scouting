const findClimbPoints = (climbType: string) => {
    switch(climbType) {
        case "Parked":
            return 1;
        case "Climbed":
            return 3;
        case "Harmony":
            return 5;
            default:
                return 0;
    }
}

export default findClimbPoints;
