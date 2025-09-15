import { activities, ActivityPerformance, feetToCm, genders, inchesToCm, lbToKg, minToMs, Player, secToMs, StandardsMap } from "./util";
import { LevelCalculator, Standards } from "./calc.ts";
import rawStandards from "../data/standards.json" assert { type: "json" }

const player: Player = {
    metrics: {
        age: 25,
        weight: lbToKg(190),
        gender: genders.MALE
    }
};

const computedPerformances: ActivityPerformance[] = [
    // STRENGTH
    {
        activity: activities.BENCH_PRESS,
        performance: lbToKg(225)
    },
    {
        activity: activities.DEADLIFT,
        performance: lbToKg(270),
    },
    {
        activity: activities.BACK_SQUAT,
        performance: lbToKg(190),
    },
    // POWER
    {
        activity: activities.BROAD_JUMP,
        performance: feetToCm(105) + inchesToCm(5),
    },
    // ENDURANCE
    {
        activity: activities.RUN,
        performance: minToMs(7) + secToMs(15),
    },
    // AGILITY
    {
        activity: activities.CONE_DRILL,
        performance: secToMs(9),
    },
];

const standards = new Standards(rawStandards as StandardsMap);
const levelCalculator = new LevelCalculator(standards);

console.log(levelCalculator.calculate(player, computedPerformances));

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
