import {
    Activity,
    Attribute,
    clamp,
    Gender,
    getAvgWeight,
    kgToLb,
    lbToKg,
    range,
    type ActivityPerformance,
    type Player,
    type StandardUnit,
} from "./util";
import { levenbergMarquardt as LM } from "ml-levenberg-marquardt";

// SOURCES
// Squat, Bench, Dead Lift:
//  http://lonkilgore.com/resources/Lon_Kilgore_Strength_Standard_Tables-Copyright-2023.pdf
// 1 mile run:
//  https://runninglevel.com/running-times/1-mile-times
// Broad Jump:
//  https://nrpt.co.uk/training/tests/power/broad.htm
// 3 Cone drill:
// https://nflsavant.com/combine.php?utm_source=chatgpt.com

export type LevelCalculatorOutput = {
    player: number;
    attributes: Record<Attribute, number>;
};

export type Levels = Record<string, number>;

export interface Metrics {
    age: number;
    weight: number;
    gender: Gender;
}

type NumberMetric = Extract<keyof Metrics, "age" | "weight">;

export interface Standard {
    metrics: Metrics;
    levels: Levels;
}

type Generator = {
    metric: NumberMetric;
};

export type ActivityStandards = Record<
    Activity,
    {
        metadata: {
            attribute: Attribute;
            generators: Generator[];
            unit: StandardUnit;
            name: string;
        };
        standards: Standard[];
    }
>;

export class LevelCalculator {
    standards: Standards;

    public constructor(standards: Standards) {
        this.standards = standards;
    }

    // -------------------------------------------------------------------------------------------------
    // Level calculations
    // -------------------------------------------------------------------------------------------------

    public calculate(
        player: Player,
        activityPerformances: ActivityPerformance[],
    ): LevelCalculatorOutput {
        const levels: LevelCalculatorOutput = {
            player: 0,
            attributes: {
                [Attribute.Strength]: 0,
                [Attribute.Power]: 0,
                [Attribute.Endurance]: 0,
                [Attribute.Agility]: 0,
            } as const,
        };

        for (const value of Object.values(player)) {
            if (!value) return levels;
        }

        levels.attributes = this.calculateAllAttributeLevels(
            player,
            activityPerformances,
        );
        for (const level of Object.values(levels.attributes)) {
            if (!level) return levels;
        }

        const attrLevelsSum = Object.values(levels.attributes).reduce(
            (sum, lvl) => sum + lvl,
            0,
        );
        levels.player = Math.round(
            attrLevelsSum / Object.keys(Attribute).length,
        );

        return levels;
    }

    private calculateAllAttributeLevels(
        player: Player,
        activityPerformances: ActivityPerformance[],
    ): Record<Attribute, number> {
        const attrLevels: Record<Attribute, number> = {
            [Attribute.Strength]: 0,
            [Attribute.Power]: 0,
            [Attribute.Endurance]: 0,
            [Attribute.Agility]: 0,
        } as const;

        for (const value of Object.values(player)) {
            if (!value) return attrLevels;
        }

        (Object.values(Attribute) as Attribute[]).forEach((attribute) => {
            const attrActivityPerformances = activityPerformances.filter(
                (p) =>
                    this.standards.byActivity(p.activity).getMetadata()
                        .attribute === attribute,
            );
            attrLevels[attribute] = this.calculateAttributeLevel(
                attribute,
                player,
                attrActivityPerformances,
            );
        });

        return attrLevels;
    }

    private calculateAttributeLevel(
        attribute: Attribute,
        player: Player,
        activityPerformances: ActivityPerformance[],
    ): number {
        // must be activities of the given attribute
        if (
            activityPerformances.some(
                (p) =>
                    this.standards.byActivity(p.activity).getMetadata()
                        .attribute !== attribute,
            )
        ) {
            throw new Error("Wrong activity performance attribute");
        }

        // must perform all of an attributes activities
        for (const activity of this.standards.getAttributeActivities(
            attribute,
        )) {
            const filteredActivites = activityPerformances.map(
                (p) => p.activity,
            );
            if (!filteredActivites.includes(activity)) return 0;
        }

        // must have all activties using a valid performance value (> 0)
        for (const activityPerformance of activityPerformances) {
            if (activityPerformance.performance <= 0) return 0;
        }

        const activityLevels = activityPerformances.map((p) => {
            const interpolatedStandard = this.standards
                .byActivity(p.activity)
                .byMetrics(player.metrics)
                .getOneInterpolated();
            return this.findLevel(interpolatedStandard, p.performance);
        });

        const activityLevelsAvg = Math.round(
            activityLevels.reduce((sum, curr) => sum + curr, 0) /
                activityLevels.length,
        );

        return activityLevelsAvg;
    }

    // -------------------------------------------------------------------------------------------------
    // Level utilities (helpers)
    // -------------------------------------------------------------------------------------------------

    private findLevel(standard: Standard, performance: number): number {
        let resultLevel = 1;
        let resultLevelDiff = Infinity;

        for (const level in standard.levels) {
            if (!standard.levels[level]) continue;

            const diff = Math.abs(performance - standard.levels[level]);
            if (diff < resultLevelDiff) {
                resultLevel = +level;
                resultLevelDiff = diff;
            }
        }
        return resultLevel;
    }
}

export type StandardsConfig = {
    global: {
        maxLevel: number;
    };
    activity: Record<
        Activity,
        {
            weightModifier: number;
            weightSkew: number;
            ageModifier: number;
            enableGeneration: boolean;
            difficultyModifier: number;
            peakAge: number;
            stretch: {
                upper: number;
                lower: number;
            };
        }
    >;
};

export class Standards {
    readonly cfg: StandardsConfig;
    private activityStandards: ActivityStandards;

    constructor(
        activityStandards: ActivityStandards,
        cfg?: Partial<StandardsConfig>,
    ) {
        // TODO: set these somewhere
        const defaultActivitiesConfig = Object.fromEntries(
            Object.values(Activity).map((activity) => [
                activity,
                {
                    enableGeneration: true,
                    weightModifier:
                        activity === Activity.BroadJump ? -0.1 : 0.1,
                    weightSkew: 0,
                    ageModifier: 0.5,
                    difficultyModifier:
                        activity === Activity.BroadJump ? 0.05 : 0,
                    peakAge: 27,
                    stretch: {
                        upper: 0,
                        lower: 0,
                    },
                },
            ]),
        ) as Record<Activity, StandardsConfig["activity"][Activity]>;

        this.cfg = {
            global: {
                maxLevel: cfg?.global?.maxLevel ?? 100,
            },
            activity: Object.assign(defaultActivitiesConfig, cfg?.activity),
        };

        // prepare data
        this.activityStandards = structuredClone(activityStandards);

        // STRETCH
        for (const activity of Object.values(Activity)) {
            const BASE_MAX_LEVEL = 5;

            function expDecayModel([A, B, C]: number[]) {
                return (i: number) => A * Math.exp(-B * i) + C;
            }

            if (!this.cfg.activity[activity].enableGeneration) {
                continue;
            }

            for (const gender of Object.values(Gender)) {
                const standardsByGender = this.activityStandards[
                    activity
                ].standards.filter((s) => s["metrics"].gender === gender);
                const ages = [
                    ...new Set(standardsByGender.map((s) => s.metrics.age)),
                ];
                for (const age of ages) {
                    const standards = standardsByGender.filter(
                        (s) => s.metrics.age === age,
                    );

                    const data = {
                        x: [] as number[],
                        y: [] as number[],
                    };

                    const isIncreasing =
                        standards[0].levels["2"] > standards[0].levels["1"];

                    for (const i of range(BASE_MAX_LEVEL).slice(0, -1)) {
                        const level = i + 1;
                        const progressionRatios: number[] = [];
                        for (const standard of standards) {
                            const curr = standard.levels[level];
                            const next = standard.levels[level + 1];
                            progressionRatios.push(
                                isIncreasing ? next / curr : curr / next,
                            );
                        }

                        const sum = progressionRatios.reduce(
                            (p, c) => p + c,
                            0,
                        );
                        const progressionRatioAvg =
                            sum / progressionRatios.length;

                        data.x.push(i);
                        data.y.push(progressionRatioAvg);
                    }

                    const fittedParams = LM(data, expDecayModel, {
                        initialValues: [0.4, 0.5, 1.1],
                        minValues: [0.0, 0.0, 1.02],
                        maxValues: [1.0, 2.0, 1.2],
                        maxIterations: 200,
                    });
                    const getDecayRatio = (i: number) =>
                        expDecayModel(fittedParams.parameterValues)(i);

                    // UPDATE THE DATA
                    for (const standard of standards) {
                        const newLevels: Levels = {};
                        const newLowerLevelCount = Math.max(
                            Math.round(
                                this.cfg.activity[activity].stretch.lower,
                            ),
                            0,
                        );
                        const newUpperLevelCount = Math.max(
                            Math.round(
                                this.cfg.activity[activity].stretch.upper,
                            ),
                            0,
                        );

                        const oldLevels = standard.levels as Levels;
                        let prev = oldLevels["1"];
                        for (const i of range(newLowerLevelCount).reverse()) {
                            const level = i + 1;
                            const ratio = getDecayRatio(-i - 1);
                            prev = isIncreasing ? prev / ratio : prev * ratio;
                            newLevels[level] = Math.round(prev);
                        }

                        for (const i of range(BASE_MAX_LEVEL)) {
                            const level = i + 1;
                            newLevels[level + newLowerLevelCount] =
                                oldLevels[level];
                        }

                        prev = oldLevels[BASE_MAX_LEVEL];
                        for (const i of range(newUpperLevelCount)) {
                            const level =
                                BASE_MAX_LEVEL + newLowerLevelCount + (i + 1);
                            const ratio = getDecayRatio(level - 1);
                            prev = isIncreasing ? prev * ratio : prev / ratio;
                            newLevels[level] = Math.round(prev);
                        }

                        standard.levels = newLevels;
                    }
                }
            }
        }

        // EXPAND, COMPRESS, SKEW
        for (const activity of Object.values(Activity)) {
            for (const standard of this.activityStandards[activity].standards) {
                // expand
                let i = 1;
                while (
                    Object.keys(standard.levels).length <
                    this.cfg.global.maxLevel
                ) {
                    standard.levels = this.expandLevels(standard.levels, i++);
                }

                // compress
                if (
                    Object.keys(standard.levels).length >
                    this.cfg.global.maxLevel
                ) {
                    standard.levels = this.compressLevels(
                        standard.levels,
                        this.cfg.global.maxLevel,
                    );
                }

                // apply skew config
                for (const level in standard.levels) {
                    standard.levels[level] =
                        standard.levels[level] *
                        (1 + this.cfg.activity[activity].difficultyModifier);
                }
            }

            // generate data
            const allGenerators = this.cfg.activity[activity].enableGeneration
                ? this.activityStandards[activity].metadata.generators
                : [];

            const ageGenerators = allGenerators.filter(
                (g) => g.metric === "age",
            );
            for (const ageGenerator of ageGenerators) {
                for (const gender of Object.values(Gender)) {
                    const peakAge = this.cfg.activity[activity].peakAge;
                    const ageStep = 10;

                    const minAge = 0;
                    const maxAge = 100;

                    const referenceStandard = this.byActivity(activity)
                        .byMetrics({
                            weight: getAvgWeight(gender, peakAge),
                            gender,
                            age: peakAge,
                        })
                        .getOneInterpolated();

                    let currAge = minAge;
                    while (currAge <= maxAge) {
                        const newStandard: Standard = {
                            metrics: {
                                weight: getAvgWeight(gender, currAge),
                                age: currAge,
                                gender,
                            },
                            levels: {},
                        };

                        for (const lvl in referenceStandard.levels) {
                            const base = referenceStandard.levels[lvl];
                            if (!base) continue;

                            const s = this.cfg.activity[activity].ageModifier;

                            const youngFloor0 = 0.5;
                            const oldFloor0 = 0.5;

                            const youngFloor = 1 - (1 - youngFloor0) * s;
                            const oldFloor = 1 - (1 - oldFloor0) * s;

                            const cy =
                                (s * (1 - youngFloor0)) /
                                Math.pow(peakAge - minAge, 2);
                            const co =
                                (s * (1 - oldFloor0)) /
                                Math.pow(maxAge - peakAge, 2);

                            let f =
                                currAge <= peakAge
                                    ? 1 - cy * Math.pow(peakAge - currAge, 2)
                                    : 1 - co * Math.pow(currAge - peakAge, 2);

                            const floor = Math.min(youngFloor, oldFloor);
                            const fCurr = Math.max(floor, Math.min(1, f));

                            newStandard.levels[lvl] = base * fCurr;
                        }

                        // prefer real data over generated data
                        const overlappingStandard = this.byActivity(activity)
                            .byMetrics(newStandard.metrics)
                            .getOne();
                        if (!overlappingStandard)
                            this.activityStandards[activity].standards.push(
                                newStandard,
                            );

                        currAge += ageStep;
                    }
                }

                // now that we generated metric data, remove the old data
                this.activityStandards[activity].standards =
                    this.activityStandards[activity].standards.filter(
                        (s) => s.metrics.weight,
                    );
            }

            const weightGenerators = allGenerators.filter(
                (g) => g.metric === "weight",
            );
            for (const weightGenerator of weightGenerators) {
                for (const gender of Object.values(Gender)) {
                    for (const age of this.agesFor(activity, gender)) {
                        const weightStep = 12;
                        const referenceWeight = getAvgWeight(gender, age);

                        const minWeight = Math.max(
                            referenceWeight - 3 * weightStep,
                            1,
                        );
                        const maxWeight = referenceWeight + 3 * weightStep;

                        const referenceStandard = this.byActivity(activity)
                            .byMetrics({ weight: referenceWeight, gender, age })
                            .getOneInterpolated();

                        let currWeight = minWeight;
                        while (currWeight <= maxWeight) {
                            const newStandard: Standard = {
                                metrics: {
                                    weight: currWeight,
                                    age,
                                    gender,
                                },
                                levels: {},
                            };

                            // apply allometric scaling to generate levels
                            for (const lvl in referenceStandard.levels) {
                                if (!referenceStandard.levels[lvl]) continue;

                                const scalingExponent =
                                    this.cfg.activity[activity].weightModifier;
                                const coefficient =
                                    currWeight / referenceWeight;

                                newStandard.levels[lvl] =
                                    referenceStandard.levels[lvl] *
                                    coefficient ** scalingExponent;
                            }

                            // prefer real data over generated data
                            const overlappingStandard = this.byActivity(
                                activity,
                            )
                                .byMetrics(newStandard.metrics)
                                .getOne();
                            if (!overlappingStandard)
                                this.activityStandards[activity].standards.push(
                                    newStandard,
                                );

                            currWeight += weightStep;
                        }
                    }
                }

                // now that we generated metric data, remove the old data
                this.activityStandards[activity].standards =
                    this.activityStandards[activity].standards.filter(
                        (s) => s.metrics.weight,
                    );
            }

            this.activityStandards[activity].standards = this.activityStandards[
                activity
            ].standards.sort((a, b) => {
                const genderOrder: Record<Gender, number> = {
                    Male: 0,
                    Female: 1,
                };
                const gA = genderOrder[b.metrics.gender] ?? 99;
                const gB = genderOrder[b.metrics.gender] ?? 99;
                if (gA !== gB) return gA - gB;
                if (a.metrics.age !== b.metrics.age)
                    return a.metrics.age - b.metrics.age;
                return a.metrics.weight - b.metrics.weight;
            });
        }
    }

    public byActivity(activity: Activity) {
        const self = this;

        const state: Partial<Metrics> = {};

        // EXEC METHODS
        const execMethods = {
            exact: {
                // these will get EXACT matches
                getAll(): Standard[] {
                    const src = self.activityStandards[activity].standards;

                    const out: Standard[] = [];
                    for (let i = 0; i < src.length; i++) {
                        const s = src[i];
                        if (
                            state.gender != null &&
                            s.metrics.gender !== state.gender
                        )
                            continue;
                        if (state.age != null && s.metrics.age !== state.age)
                            continue;
                        if (
                            state.weight != null &&
                            s.metrics.weight !== state.weight
                        )
                            continue;
                        out.push(s);
                    }
                    return out;
                },
                getOne: function (): Standard | undefined {
                    return execMethods.exact.getAll()[0];
                },
                getNearest(
                    metric: NumberMetric,
                    target: number,
                ): { lower: Standard; upper: Standard } {
                    const standards = execMethods.exact.getAll();
                    if (standards.length === 0) throw new Error("no standards");

                    let lower = standards[0]; // best <= target
                    let upper = standards[0]; // best >= target
                    let hasLower = false,
                        hasUpper = false;

                    for (const standard of standards) {
                        const standardMetricValue = standard.metrics[metric];

                        if (standardMetricValue <= target) {
                            if (
                                !hasLower ||
                                standardMetricValue > lower.metrics[metric]
                            ) {
                                lower = standard;
                                hasLower = true;
                            }
                        }
                        if (standardMetricValue >= target) {
                            if (
                                !hasUpper ||
                                standardMetricValue < upper.metrics[metric]
                            ) {
                                upper = standard;
                                hasUpper = true;
                            }
                        }
                    }

                    // clamp to ends if one side missing
                    if (!hasLower) lower = standards[0];
                    if (!hasUpper) upper = standards[standards.length - 1];
                    return { lower, upper };
                },
            },
        };

        const interpolateByAgeAndWeight = (metrics: Metrics): Standard => {
            const interpolateByWeight = (targetAge: number): Levels => {
                const {
                    lower: lowerAgeWeightStandard,
                    upper: upperAgeWeightStandard,
                } = this.byActivity(activity)
                    .byGender(metrics.gender)
                    .byAge(targetAge)
                    .getNearest("weight", metrics.weight);

                const weightLower = lowerAgeWeightStandard.metrics.weight;
                const weightUpper = upperAgeWeightStandard.metrics.weight;

                let weightRatio =
                    weightUpper === weightLower
                        ? 1
                        : (metrics.weight - weightLower) /
                          (weightUpper - weightLower);
                weightRatio = Math.max(0, Math.min(1, weightRatio));

                // metrics.weight = lowerAgeWeightStandard.metrics.weight + (upperAgeWeightStandard.metrics.weight - lowerAgeWeightStandard.metrics.weight) * weightRatio;

                return this.interpolateLevels(
                    lowerAgeWeightStandard.levels,
                    upperAgeWeightStandard.levels,
                    weightRatio,
                );
            };

            // Find nearest age standards
            const { lower: lowerAgeStandard, upper: upperAgeStandard } =
                this.byActivity(activity)
                    .byGender(metrics.gender)
                    .getNearest("age", metrics.age);

            const ageLower = lowerAgeStandard.metrics.age;
            const ageUpper = upperAgeStandard.metrics.age;

            // Interpolate by age and weight
            let ageRatio =
                ageUpper === ageLower
                    ? 1
                    : (metrics.age - ageLower) / (ageUpper - ageLower);
            ageRatio = Math.max(0, Math.min(1, ageRatio));

            const interpolatedLevels = this.interpolateLevels(
                interpolateByWeight(ageLower),
                interpolateByWeight(ageUpper),
                ageRatio,
            );

            return {
                metrics: metrics,
                levels: interpolatedLevels,
            };
        };

        const getAllInterpolated = (opt?: {
            normalizeForLb?: boolean;
        }): Standard[] => {
            const metrics: Metrics = state as Metrics;

            let weights = this.weightsFor(
                activity,
                metrics.gender,
                metrics.age,
            );
            if (opt?.normalizeForLb) {
                weights = weights.map((w) => lbToKg(Math.round(kgToLb(w))));
            }

            const interpolatedStandards: Standard[] = weights.map((weight) =>
                interpolateByAgeAndWeight({ ...metrics, weight }),
            );

            return interpolatedStandards;
        };

        const getOneInterpolated = (): Standard => {
            const metrics: Metrics = state as Metrics;
            return interpolateByAgeAndWeight(metrics);
        };

        const getMetadata = () => this.activityStandards[activity].metadata;

        // QUERY METHODS

        const byGender = (gender: Gender) => {
            state.gender = gender;
            return { byAge, ...execMethods.exact };
        };

        const byAge = (age: number) => {
            state.age = age;
            return { byWeight, ...execMethods.exact, getAllInterpolated };
        };

        const byWeight = (weight: number) => {
            state.weight = weight;
            return { ...execMethods.exact, getOneInterpolated };
        };

        const byMetrics = (metrics: Metrics) => {
            Object.assign(state, metrics);
            return { ...execMethods.exact, getOneInterpolated };
        };

        const initialMethods = {
            byGender,
            byMetrics,
            getMetadata,
            ...execMethods.exact,
        };
        return initialMethods;
    }

    public getAttributeActivities(attribute: Attribute): Activity[] {
        const activities: Activity[] = [];
        for (const activity of Object.keys(
            this.activityStandards,
        ) as Activity[]) {
            const activityStandard = this.activityStandards[
                activity
            ] as ActivityStandards[Activity];
            if (activityStandard.metadata.attribute === attribute) {
                activities.push(activity as Activity);
            }
        }
        return activities;
    }

    // TODO: turn these into queries?
    public weightsFor(activity: Activity, gender: Gender, age: number) {
        const { lower, upper } = this.byActivity(activity)
            .byGender(gender)
            .getNearest("age", age);

        const lowerDiff = Math.abs(lower.metrics.age - age);
        const upperDiff = Math.abs(upper.metrics.age - age);
        const closestAge =
            lowerDiff < upperDiff ? lower.metrics.age : upper.metrics.age;

        const weights = this.byActivity(activity)
            .byGender(gender)
            .byAge(closestAge)
            .getAll()
            .map((s) => s.metrics.weight);

        return weights;
    }

    public agesFor(activity: Activity, gender: Gender) {
        const standardsByGender = this.byActivity(activity)
            .byGender(gender)
            .getAll();
        const ages = [...new Set(standardsByGender.map((s) => s.metrics.age))];
        return ages;
    }

    private expandLevels(levels: Levels, i: number): Levels {
        if (i == 0) {
            return levels;
        }
        const levelKeys = Object.keys(levels)
            .map(Number)
            .sort((a, b) => a - b);

        const newLevels: Levels = {};
        let j = 1;

        for (let k = 0; k < levelKeys.length; ++k) {
            const currLevel = levelKeys[k];
            const nextLevel = levelKeys[k + 1];

            newLevels[j++] = levels[currLevel];

            if (nextLevel) {
                newLevels[j++] = (levels[currLevel] + levels[nextLevel]) / 2;
            }
        }

        return this.expandLevels(newLevels, i - 1);
    }

    private compressLevels(levels: Levels, targetLvl: number): Levels {
        const keys = Object.keys(levels)
            .map(Number)
            .sort((a, b) => a - b);
        const lvlCnt = keys.length;

        if (targetLvl <= 0) {
            throw new Error("Target levels amount must be a positive integer");
        }
        if (lvlCnt === 0) {
            return {};
        }
        if (targetLvl === 1) {
            return { 1: levels[keys[0]] };
        }
        if (lvlCnt < targetLvl) {
            throw new Error(
                "Target levels amount must be less than or equal to the current levels amount",
            );
        }

        // Linear resample
        const compressedLevels: Levels = {};

        for (let targetIndex = 0; targetIndex < targetLvl; ++targetIndex) {
            const sourcePos = (targetIndex * (lvlCnt - 1)) / (targetLvl - 1);

            const sourceIndexLower = Math.floor(sourcePos);
            const sourceIndexUpper = Math.min(sourceIndexLower + 1, lvlCnt - 1);

            const interpolationWeight = sourcePos - sourceIndexLower;

            const lowerValue = levels[keys[sourceIndexLower]];
            const upperValue = levels[keys[sourceIndexUpper]];

            compressedLevels[targetIndex + 1] =
                lowerValue + (upperValue - lowerValue) * interpolationWeight;
        }

        return compressedLevels;
    }

    private interpolateLevels(
        lower: Levels,
        upper: Levels,
        ratio: number,
    ): Levels {
        if (Object.keys(lower).length !== Object.keys(upper).length)
            throw new Error(
                "Cannot interpolate between varying number of levels",
            );

        const lerp = (lvl: string) =>
            (lower[lvl] as number) +
            ((upper[lvl] as number) - (lower[lvl] as number)) * ratio;

        const interpolatedLevels: Levels = {};
        for (const lvl in lower) {
            interpolatedLevels[lvl] = lerp(lvl);
        }

        return interpolatedLevels;
    }
}
