import { activities, BenchmarkPerformance, genders, Player } from "./util";
import { calcAttributeLevels, calcPlayerLevel, computeLevels } from "./calc.ts";

const lbToKg = (lb) => +lb * 0.453592;
const kgToLb = (kg) => +kg * 2.20462;

const minToMs = (min) => min * 60000;
const secToMs = (sec) => sec * 1000;

const feetToCm = (feet) => feet * 30.48;
const inchesToCm = (inches) => inches * 2.54;

const player: Player = {
    age: 18,
    weightKG: lbToKg(200),
    gender: genders.MALE
};

const computedPerformances: BenchmarkPerformance[] = [
    // STRENGTH
    {
        activity: activities.BENCH_PRESS,
        performance: lbToKg(200),
        levels: computeLevels(
            player.age,
            player.weightKG,
            player.gender,
            activities.BENCH_PRESS
        )
    },
    {
        activity: activities.DEADLIFT,
        performance: lbToKg(200),
        levels: computeLevels(
            player.age,
            player.weightKG,
            player.gender,
            activities.DEADLIFT
        )
    },
    {
        activity: activities.BACK_SQUAT,
        performance: lbToKg(200),
        levels: computeLevels(
            player.age,
            player.weightKG,
            player.gender,
            activities.BACK_SQUAT
        )
    },
    // POWER
    {
        activity: activities.BROAD_JUMP,
        performance: feetToCm(5) + inchesToCm(2),
        levels: computeLevels(
            player.age,
            player.weightKG,
            player.gender,
            activities.BROAD_JUMP
        )
    },
    // ENDURANCE
    {
        activity: activities.RUN,
        performance: minToMs(5) + secToMs(20),
        levels: computeLevels(
            player.age,
            player.weightKG,
            player.gender,
            activities.RUN
        )
    },
    // AGILITY
    {
        activity: activities.CONE_DRILL,
        performance: secToMs(5),
        levels: computeLevels(
            player.age,
            player.weightKG,
            player.gender,
            activities.CONE_DRILL
        )
    },
];

const levels = {
    attributes: calcAttributeLevels(player, computedPerformances),
    player: calcPlayerLevel(player, computedPerformances)
};

console.log(levels);

