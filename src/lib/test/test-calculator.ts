import { Activity, feetToCm, Gender, inchesToCm, lbToKg, minToMs, secToMs, type ActivityPerformance, type Player } from "$lib/services/calculator/util";

const player: Player = {
    metrics: {
        age: 25,
        weight: lbToKg(190),
        gender: Gender.Male
    }
};

const computedPerformances: ActivityPerformance[] = [
    // STRENGTH
    {
        activity: Activity.BenchPress,
        performance: lbToKg(225)
    },
    {
        activity: Activity.Deadlift,
        performance: lbToKg(270),
    },
    {
        activity: Activity.BackSquat,
        performance: lbToKg(190),
    },
    // POWER
    {
        activity: Activity.BroadJump,
        performance: feetToCm(105) + inchesToCm(5),
    },
    // ENDURANCE
    {
        activity: Activity.Run,
        performance: minToMs(7) + secToMs(15),
    },
    // AGILITY
    {
        activity: Activity.ConeDrill,
        performance: secToMs(9),
    },
];

const standards = new Stand();

// const newStandards: Standards = {
//     "Back Squat": [],
//     "Deadlift": [],
//     "Bench Press": [],
//     "Run": [],
//     "Dash": [],
//     "Treadmill Dash": [],
//     "Broad Jump": [],
//     "Cone Drill": [],
// };
//
// for (const item of standards) {
//     if (!newStandards[item.activityType])
//         continue;
//
//     newStandards[item.activityType].push({
//         metrics: {
//             age: item.age,
//             weight: item.bodyWeight,
//             gender: item.gender
//         },
//         levels: {
//             physicallyActive: item.physicallyActive,
//             beginner: item.beginner,
//             intermediate: item.intermediate,
//             advanced: item.advanced,
//             elite: item.elite
//         }
//     });
// }
//
// Bun.write("./newStandards.json", JSON.stringify(newStandards, null, 2));
