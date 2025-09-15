import { activities, ActivityPerformance, feetToCm, genders, inchesToCm, lbToKg, minToMs, Player, secToMs } from "./util";
import { LevelCalculator } from "./calc.ts";

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
        performance: minToMs(5) + secToMs(20),
    },
    // AGILITY
    {
        activity: activities.CONE_DRILL,
        performance: secToMs(5),
    },
];

console.log(Bun.argv);
// const levelCalculator = new LevelCalculator({ compressTo: +Bun.argv[2], expandIters: +Bun.argv[3] });
const levelCalculator = new LevelCalculator();

const levels = {
    attributes: levelCalculator.calcAllAttributeLevels(player, computedPerformances),
    player: levelCalculator.calcPlayerLevel(player, computedPerformances)
};

console.log(levels);

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
