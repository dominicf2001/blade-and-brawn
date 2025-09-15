import { Activity, Attribute, attributes, ActivityPerformance, findNearestPoints, getActivityAttribute, getAttributeActivities, Player, StandardsMap, Levels, Standard, Metrics, activities } from "./util";
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

type TableData = Record<Activity, {

}>

type LevelCalculatorConfig = {
    compressTo?: number;
    expandIters?: number;
}

export class LevelCalculator {
    cfg: Required<LevelCalculatorConfig>;

    public constructor(cfg: LevelCalculatorConfig = {}) {
        this.cfg = {
            compressTo: cfg.compressTo ?? 100,
            expandIters: cfg.expandIters ?? 5
        }
    }

    // -------------------------------------------------------------------------------------------------
    // Level utilities (helpers)
    // -------------------------------------------------------------------------------------------------

    findLevel(levels: Levels, performance: number): number {
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

    compressLevels(
        levels: Levels,
        targetLevelsAmount: number,
    ): Levels {
        const levelsAmount = Object.keys(levels).length;
        if (levelsAmount < targetLevelsAmount) {
            throw new Error(
                "Target levels amount must be greater than or equal to the current levels amount",
            );
        }

        const ratio = levelsAmount / targetLevelsAmount;
        const compressedLevels: Levels = {};

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

    expandLevels(
        levels: Levels,
        i: number
    ): Levels {
        if (i == 0)
            return levels;

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

        return this.expandLevels(newLevels, i - 1);
    }

    // -------------------------------------------------------------------------------------------------
    // Standards interpolation (heavy math bits)
    // -------------------------------------------------------------------------------------------------

    interpolateLevels(
        lower: Levels,
        upper: Levels,
        ratio: number,
    ): Levels {
        if (Object.keys(lower).length !== Object.keys(upper).length)
            throw new Error("Cannot interpolate between varying number of levels");

        function lerp(lvl: number): number {
            return (lower[lvl] as number) + ((upper[lvl] as number) - (lower[lvl] as number)) * ratio;
        }

        const interpolatedLevels = Object.keys(lower).map(lvl => lerp(+lvl));
        return interpolatedLevels;
    }

    interpolateByBodyWeight(
        targetAge: number,
        bodyWeightKG: number,
        standardsArr: Standard[],
    ): Levels | null {
        const ageFilteredStandards = standardsArr.filter((s) => s.metrics.age === targetAge);
        if (ageFilteredStandards[0].metrics.weight === -1) return ageFilteredStandards[0].levels;

        const weightArray = [...new Set(ageFilteredStandards.map((s) => s.metrics.weight))].sort((a, b) => a - b);
        const { lower, upper } = findNearestPoints(bodyWeightKG, weightArray);

        const weightLower = ageFilteredStandards.find((s) => s.metrics.weight === lower);
        const weightUpper = ageFilteredStandards.find((s) => s.metrics.weight === upper);
        if (!weightLower || !weightUpper) return null;

        let weightRatio = upper === lower ? 1 : (bodyWeightKG - lower) / (upper - lower);
        weightRatio = Math.max(0, Math.min(1, weightRatio));

        return this.interpolateLevels(weightLower.levels, weightUpper.levels, weightRatio);
    }

    getInterpolatedActivityStandard(
        activity: Activity,
        metrics: Metrics,
    ): Standard {
        const interpolatedStandard: Standard = {
            metrics: metrics,
            levels: {}
        };

        // Filter dataset
        const standardsByGender = standards[activity]
            .filter(a => a.metrics.gender === metrics.gender);
        if (standardsByGender.length === 0) return interpolatedStandard;

        // Age interpolation
        const ageArray = [...new Set(standardsByGender.map((s) => s.metrics.age))].sort((a, b) => a - b);
        const { lower: ageLower, upper: ageUpper } = findNearestPoints(metrics.age, ageArray);

        const lowerValues = this.interpolateByBodyWeight(ageLower, metrics.weight, standardsByGender);
        const upperValues = this.interpolateByBodyWeight(ageUpper, metrics.weight, standardsByGender);
        if (!lowerValues || !upperValues) return interpolatedStandard;

        let ageRatio = ageUpper === ageLower ? 1 : (metrics.age - ageLower) / (ageUpper - ageLower);
        ageRatio = Math.max(0, Math.min(1, ageRatio));

        const levels = this.interpolateLevels(lowerValues, upperValues, ageRatio);
        const expandedLevels = this.expandLevels(levels, this.cfg.expandIters);
        const compressedLevels = this.compressLevels(expandedLevels, this.cfg.compressTo);

        interpolatedStandard.levels = compressedLevels;
        return interpolatedStandard;
    }

    // -------------------------------------------------------------------------------------------------
    // Level calculations (public API)
    // -------------------------------------------------------------------------------------------------

    // public generateTableData(metrics: Metrics) {
    //     const tableData: Record<Activity, Object> = {};
    //
    //     for (const activity of Object.values(activities)) {
    //         const activityLevels = this.interpolateActivityLevels(activity, metrics);
    //     }
    // }

    public calcAttributeLevel(
        attribute: Attribute,
        player: Player,
        activityPerformances: ActivityPerformance[],
    ): number {
        // must be activities of the given attribute
        if (activityPerformances.some((p) => getActivityAttribute(p.activity) !== attribute)) {
            throw new Error("Wrong activity performance attribute");
        }

        // must perform all of an attributes activities
        for (const activity of getAttributeActivities(attribute)) {
            const filteredActivites = activityPerformances.map((p) => p.activity);
            if (!filteredActivites.includes(activity))
                return 0;
        }

        // must have all activties using a valid performance value (> 0) 
        for (const activityPerformance of activityPerformances) {
            if (activityPerformance.performance <= 0)
                return 0
        }

        const activityLevels = activityPerformances.map((p) => {
            const interpolatedStandard = this.getInterpolatedActivityStandard(p.activity, player.metrics);
            return this.findLevel(interpolatedStandard.levels, p.performance);
        });

        const activityLevelsAvg = Math.round(
            activityLevels.reduce((sum, curr) => sum + curr, 0) / activityLevels.length,
        );

        return activityLevelsAvg;
    }

    public calcAllAttributeLevels(
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
                (p) => getActivityAttribute(p.activity) === attribute,
            );
            attrLevels[attribute] = this.calcAttributeLevel(attribute, player, attrActivityPerformances);
        });

        return attrLevels;
    }

    public calcPlayerLevel(player: Player, activityPerformances: ActivityPerformance[]): number {
        for (const value of Object.values(player)) {
            if (!value)
                return 0;
        }

        const attrLevels = this.calcAllAttributeLevels(player, activityPerformances);
        for (const level of Object.values(attrLevels)) {
            if (!level)
                return 0;
        }

        const attrLevelsSum = Object.values(attrLevels).reduce((sum, lvl) => sum + lvl, 0);
        return Math.round(attrLevelsSum / Object.keys(attributes).length);
    }
}
