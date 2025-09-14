import { Activity, Attribute, attributes, ActivityPerformance, findNearestPoints, getActivityAttribute, getAttributeActivities, Player, StandardsMap, BaseLevel, Standard } from "./util";
import rawStandards from "./standards.json" assert { type: "json" }

// SOURCES
// Squat, Bench, Dead Lift: 
//  http://lonkilgore.com/resources/Lon_Kilgore_Strength_Standard_Tables-Copyright-2023.pdf
// 1 mile run:
//  https://runninglevel.com/running-times/1-mile-times
// Dash: 
//  https://marathonhandbook.com/average-100-meter-time/
// Broad Jump:
//  

const standards = rawStandards as StandardsMap;

type BaseLevelValues = Record<BaseLevel, number>

// -------------------------------------------------------------------------------------------------
// Level utilities (helpers)
// -------------------------------------------------------------------------------------------------

function findLevel(levels: Record<number, number>, performance: number): number {
    let resultLevel = 1;
    let resultLevelDiff = Infinity;

    for (const level in levels) {
        const diff = Math.abs(performance - levels[level as unknown as number]);
        if (diff < resultLevelDiff) {
            resultLevel = +level;
            resultLevelDiff = diff;
        }
    }
    return resultLevel;
}

function compressLevels(
    levels: Record<number, number>,
    targetLevelsAmount: number,
): Record<number, number> {
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
}

function expandLevels(
    levels: BaseLevel | Record<number, number>,
    i: number
): Record<number, number> {
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
// Standards interpolation (heavy math bits)
// -------------------------------------------------------------------------------------------------

function interpolateStandardsValues(
    lower: BaseLevelValues,
    upper: BaseLevelValues,
    ratio: number,
): BaseLevelValues {
    function lerp(k: BaseLevel): number {
        return (lower[k] as number) + ((upper[k] as number) - (lower[k] as number)) * ratio;
    }

    return {
        physicallyActive: lerp("physicallyActive"),
        beginner: lerp("beginner"),
        intermediate: lerp("intermediate"),
        advanced: lerp("advanced"),
        elite: lerp("elite"),
    };
}

function interpolateByBodyWeight(
    targetAge: number,
    bodyWeightKG: number,
    standardsArr: Standard[],
): BaseLevelValues | null {
    const ageFilteredStandards = standardsArr.filter((s) => s.metrics.age === targetAge);
    if (ageFilteredStandards[0].metrics.weight === -1) return ageFilteredStandards[0].levels;

    const weightArray = [...new Set(ageFilteredStandards.map((s) => s.metrics.weight))].sort((a, b) => a - b);
    const { lower, upper } = findNearestPoints(bodyWeightKG, weightArray);

    const weightLower = ageFilteredStandards.find((s) => s.metrics.weight === lower);
    const weightUpper = ageFilteredStandards.find((s) => s.metrics.weight === upper);
    if (!weightLower || !weightUpper) return null;

    let weightRatio = upper === lower ? 1 : (bodyWeightKG - lower) / (upper - lower);
    weightRatio = Math.max(0, Math.min(1, weightRatio));

    return interpolateStandardsValues(weightLower.levels, weightUpper.levels, weightRatio);
}

function interpolateActivityLevels(
    activity: Activity,
    player: Player,
): Record<number, number> {
    // Filter dataset
    const filteredStandards = standards[activity]
        .filter(a => a.metrics.gender === player.gender);
    if (filteredStandards.length === 0) return {};

    // Age interpolation
    const ageArray = [...new Set(filteredStandards.map((s) => s.metrics.age))].sort((a, b) => a - b);
    const { lower: ageLower, upper: ageUpper } = findNearestPoints(player.age, ageArray);

    const lowerValues = interpolateByBodyWeight(ageLower, player.weightKG, filteredStandards);
    const upperValues = interpolateByBodyWeight(ageUpper, player.weightKG, filteredStandards);
    if (!lowerValues || !upperValues) return {};

    let ageRatio = ageUpper === ageLower ? 1 : (player.age - ageLower) / (ageUpper - ageLower);
    ageRatio = Math.max(0, Math.min(1, ageRatio));

    const levels = interpolateStandardsValues(lowerValues, upperValues, ageRatio);

    if (levels) {
        const expandedLevels = expandLevels(levels, 5);
        const compressedLevels = compressLevels(expandedLevels, 100);
        return compressedLevels;
    } else {
        return {};
    }
}

// -------------------------------------------------------------------------------------------------
// Level calculations (public API)
// -------------------------------------------------------------------------------------------------

export function calcAttributeLevel(
    attribute: Attribute,
    player: Player,
    activityPerformances: ActivityPerformance[],
): number {
    // must be activities of the given attribute
    if (activityPerformances.some((bp) => getActivityAttribute(bp.activity) !== attribute)) {
        throw new Error("Wrong activity performance attribute");
    }

    // must perform all of an attributes activities
    for (const activity of getAttributeActivities(attribute)) {
        const filteredActivites = activityPerformances.map((bp) => bp.activity);
        if (!filteredActivites.includes(activity))
            return 0;
    }

    // must have all activties using a valid performance value (> 0) 
    for (const activityPerformance of activityPerformances) {
        if (activityPerformance.performance <= 0)
            return 0
    }

    const activityLevels = activityPerformances.map((abp) =>
        findLevel(interpolateActivityLevels(abp.activity, player), abp.performance),
    );

    const activityLevelsAvg = Math.round(
        activityLevels.reduce((sum, curr) => sum + curr, 0) / activityLevels.length,
    );

    return activityLevelsAvg;
}

export function calcAllAttributeLevels(
    player: Player,
    activityPerformances: ActivityPerformance[],
): Record<Attribute, number> {
    const attrLevels: Record<Attribute, number> = {
        [attributes.STRENGTH]: 0,
        [attributes.POWER]: 0,
        [attributes.ENDURANCE]: 0,
        // [attributes.SPEED]: 0,
        [attributes.AGILITY]: 0,
    } as const;

    for (const value of Object.values(player)) {
        if (!value)
            return attrLevels;
    }

    (Object.values(attributes) as Attribute[]).forEach((attribute) => {
        const attrActivityPerformances = activityPerformances.filter(
            (bp) => getActivityAttribute(bp.activity) === attribute,
        );
        attrLevels[attribute] = calcAttributeLevel(attribute, player, attrActivityPerformances);
    });

    return attrLevels;
}

export function calcPlayerLevel(player: Player, activityPerformances: ActivityPerformance[]): number {
    for (const value of Object.values(player)) {
        if (!value)
            return 0;
    }

    const attrLevels = calcAllAttributeLevels(player, activityPerformances);
    for (const level of Object.values(attrLevels)) {
        if (!level)
            return 0;
    }

    const attrLevelsSum = Object.values(attrLevels).reduce((sum, lvl) => sum + lvl, 0);
    return Math.round(attrLevelsSum / Object.keys(attributes).length);
}

