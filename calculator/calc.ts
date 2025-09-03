import { activities, Activity, Attribute, attributes, BenchmarkPerformance, findNearestPoints, Gender, getActivityAttribute, kgToLb, Levels, msToTime, StandardsItem } from "./util";
import rawStandards from "./standards.json" assert { type: "json" }

const standards = rawStandards as StandardsItem[];

// SOURCES
// Squat, Bench, Dead Lift: 
//  http://lonkilgore.com/resources/Lon_Kilgore_Strength_Standard_Tables-Copyright-2023.pdf
// 1 mile run:
//  https://runninglevel.com/running-times/1-mile-times
// Dash: 
//  https://marathonhandbook.com/average-100-meter-time/
// Broad Jump:
//  


// -------------------------------------------------------------------------------------------------
// Level calculations
// -------------------------------------------------------------------------------------------------
export const calcBenchmarkLevel = (performance: number, levels: Record<number, number>): number => {
    let playerLevel = 1;
    let playerLevelDiff = Infinity;

    for (const level in levels) {
        const diff = Math.abs(performance - levels[level as unknown as number]);
        if (diff < playerLevelDiff) {
            playerLevel = +level;
            playerLevelDiff = diff;
        }
    }
    return playerLevel;
};

export const calcAttributeLevel = (
    attribute: Attribute,
    benchmarkPerformances: BenchmarkPerformance[],
): number => {
    if (benchmarkPerformances.some((bp) => getActivityAttribute(bp.activity) !== attribute)) {
        throw new Error("Wrong benchmark performance attribute");
    }

    const benchmarkLevels = benchmarkPerformances.map((abp) =>
        calcBenchmarkLevel(abp.performance, abp.levels),
    );

    const benchmarkLevelsAvg = Math.round(
        benchmarkLevels.reduce((sum, curr) => sum + curr, 0) / benchmarkLevels.length,
    );

    return benchmarkLevelsAvg;
};

export const calcAttributeLevels = (
    benchmarkPerformances: BenchmarkPerformance[],
): Record<Attribute, number> => {
    const attrLevels: Record<Attribute, number> = {
        [attributes.STRENGTH]: 1,
        [attributes.POWER]: 1,
        [attributes.ENDURANCE]: 1,
        [attributes.SPEED]: 1,
        [attributes.AGILITY]: 1,
    } as const;

    (Object.values(attributes) as Attribute[]).forEach((attribute) => {
        const attrBenchmarkPerformances = benchmarkPerformances.filter(
            (bp) => getActivityAttribute(bp.activity) === attribute,
        );
        attrLevels[attribute] = calcAttributeLevel(attribute, attrBenchmarkPerformances);
    });

    return attrLevels;
};

export const calcPlayerLevel = (benchmarkPerformances: BenchmarkPerformance[]): number => {
    const attrLevels = calcAttributeLevels(benchmarkPerformances);
    const attrLevelsSum = Object.values(attrLevels).reduce((sum, lvl) => sum + lvl, 0);
    return Math.round(attrLevelsSum / Object.keys(attributes).length);
};

// -------------------------------------------------------------------------------------------------
// Presentation helpers
// -------------------------------------------------------------------------------------------------
export const formatLevelValues = (
    levels: Record<number, number>,
    activity: Activity,
): Record<number, string> => {
    const timedActivities: Activity[] = [activities.RUN, activities.DASH, activities.CONE_DRILL];

    const formattedLevels: Record<number, string> = {};
    for (const level in levels) {
        const lvl = +level as number;
        let displayValue = "";
        if (timedActivities.includes(activity)) {
            displayValue = msToTime(levels[lvl]);
        } else if (activity === activities.TREADMILL_DASH) {
            displayValue = `${(levels[lvl] * 1000).toFixed(2)} m/s`;
        } else if (activity === activities.BROAD_JUMP) {
            displayValue = `${(levels[lvl] * 0.0328084).toFixed(2)} ft.`;
        } else {
            displayValue = kgToLb(levels[lvl]).toFixed(0);
        }

        formattedLevels[lvl] = displayValue;
    }

    return formattedLevels;
};

// -------------------------------------------------------------------------------------------------
// Level utilities
// -------------------------------------------------------------------------------------------------
const compressLevels = (
    levels: Record<number, number>,
    targetLevelsAmount: number,
): Record<number, number> => {
    const levelsAmount = Object.keys(levels).length;
    if (levelsAmount < targetLevelsAmount) {
        throw new Error(
            "Target levels amount must be greater than or equal to the current levels amount",
        );
    }

    const ratio = levelsAmount / targetLevelsAmount;
    const compressedLevels: Record<number, number> = {};

    for (let i = 0; i < targetLevelsAmount; ++i) {
        const ratioIndex = i * ratio;
        const lowerIndex = Math.floor(ratioIndex);
        const upperIndex = Math.ceil(ratioIndex);

        const lowerValue = levels[lowerIndex + 1];
        const upperValue = levels[upperIndex + 1];

        const weight = ratioIndex - lowerIndex;
        compressedLevels[i + 1] = lowerValue + (upperValue - lowerValue) * weight;
    }

    return compressedLevels;
};

const expandLevels = (
    levels: Levels | Record<number, number>,
    i: number
): Record<number, number> => {
    if (i == 0) {
        // ensure we always use number keys
        const newLevels = {};
        for (let k = 0; k < Object.keys(levels).length; ++k) {
            newLevels[k + 1] = levels[Object.keys(levels)[k]];
        }
        return newLevels;
    };

    const newLevels = {};
    let j = 1;
    for (let k = 0; k < Object.keys(levels).length; ++k) {
        const currLevel = Object.keys(levels)[k];
        const nextLevel = Object.keys(levels)[k + 1];

        newLevels[j++] = levels[currLevel];

        if (nextLevel) {
            newLevels[j++] = (levels[currLevel] + levels[nextLevel]) / 2;
        }
    }

    return expandLevels(newLevels, i - 1);
}

// -------------------------------------------------------------------------------------------------
// Main level function
// -------------------------------------------------------------------------------------------------
export const computeLevels = (
    age: number,
    weightKG: number,
    gender: Gender,
    activity: Activity,
) => {
    const levels = calculateLevels(age, weightKG, gender, activity, standards);
    if (levels) {
        const expandedLevels = expandLevels(levels, 5);
        const compressedLevels = compressLevels(expandedLevels, 100);
        return compressedLevels;
    } else {
        return {};
    }
}

// -------------------------------------------------------------------------------------------------
// Standards interpolation (heavy math bits)
// -------------------------------------------------------------------------------------------------
const calculateLevels = (
    age: number,
    weightKG: number,
    gender: Gender,
    activity: Activity,
    standards: StandardsItem[],
): Levels | null => {
    // Filter dataset
    const filtered = standards.filter(
        (item) => item.gender === gender && item.activityType === activity,
    );
    if (filtered.length === 0) return null;

    // Age interpolation
    const ageArray = [...new Set(filtered.map((s) => s.age))].sort((a, b) => a - b);
    const { lower: ageLower, upper: ageUpper } = findNearestPoints(age, ageArray);

    const lowerValues = interpolateByBodyWeight(ageLower, weightKG, filtered);
    const upperValues = interpolateByBodyWeight(ageUpper, weightKG, filtered);
    if (!lowerValues || !upperValues) return null;

    let ageRatio = ageUpper === ageLower ? 1 : (age - ageLower) / (ageUpper - ageLower);
    ageRatio = Math.max(0, Math.min(1, ageRatio));

    return interpolateStandardsValues(lowerValues, upperValues, ageRatio);
};

const interpolateByBodyWeight = (
    agePoint: number,
    bodyWeightKG: number,
    filtered: StandardsItem[],
): Levels | null => {
    const ageFiltered = filtered.filter((item) => item.age === agePoint);
    if (ageFiltered[0].bodyWeight === -1) return ageFiltered[0];

    const weightArray = [...new Set(ageFiltered.map((obj) => obj.bodyWeight))].sort((a, b) => a - b);
    const { lower, upper } = findNearestPoints(bodyWeightKG, weightArray);

    const weightLower = ageFiltered.find((i) => i.bodyWeight === lower);
    const weightUpper = ageFiltered.find((i) => i.bodyWeight === upper);
    if (!weightLower || !weightUpper) return null;

    let weightRatio = upper === lower ? 1 : (bodyWeightKG - lower) / (upper - lower);
    weightRatio = Math.max(0, Math.min(1, weightRatio));

    return interpolateStandardsValues(weightLower, weightUpper, weightRatio);
};

const interpolateStandardsValues = (
    lower: Levels,
    upper: Levels,
    ratio: number,
): Levels => {
    const lerp = (k: keyof Levels): number =>
        (lower[k] as number) + ((upper[k] as number) - (lower[k] as number)) * ratio;

    return {
        physicallyActive: lerp("physicallyActive"),
        beginner: lerp("beginner"),
        intermediate: lerp("intermediate"),
        advanced: lerp("advanced"),
        elite: lerp("elite"),
    };
};
