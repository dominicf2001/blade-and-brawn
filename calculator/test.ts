import { activities, ActivityPerformance, feetToCm, genders, inchesToCm, lbToKg, minToMs, Player, secToMs, StandardsMap } from "./util";
import { LevelCalculator, Standards } from "./calc.ts";
import rawStandards from "../data/standards.json" assert { type: "json" }

const player: Player = {
    metrics: {
        age: 18,
        weight: lbToKg(200),
        gender: genders.MALE
    }
};

const computedPerformances: ActivityPerformance[] = [
    // STRENGTH
    {
        activity: activities.BENCH_PRESS,
        performance: lbToKg(200)
    },
    {
        activity: activities.DEADLIFT,
        performance: lbToKg(200),
    },
    {
        activity: activities.BACK_SQUAT,
        performance: lbToKg(200),
    },
    // POWER
    {
        activity: activities.BROAD_JUMP,
        performance: feetToCm(10) + inchesToCm(2),
    },
    // ENDURANCE
    {
        activity: activities.RUN,
        performance: minToMs(6) + secToMs(11),
    },
    // AGILITY
    {
        activity: activities.CONE_DRILL,
        performance: secToMs(5),
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
