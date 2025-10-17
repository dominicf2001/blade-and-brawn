import { Activity, Attribute, Gender, getAvgWeight, kgToLb, lbToKg, type ActivityPerformance, type Player, type StandardUnit } from "./util";

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
    player: number,
    attributes: Record<Attribute, number>
}

export type Levels = Record<string, number>

export interface Metrics {
    age: number;
    weight: number;
    gender: Gender;
};

type NumberMetric = Extract<keyof Metrics, "age" | "weight">;

export interface Standard {
    metrics: Metrics;
    levels: Levels;
}

type Generator = {
    metric: NumberMetric
}

export type ActivityStandards = Record<Activity, {
    metadata: {
        attribute: Attribute,
        generators: Generator[],
        unit: StandardUnit,
        name: string
    },
    standards: Standard[]
}>;

export class LevelCalculator {
    standards: Standards;

    public constructor(standards: Standards) {
        this.standards = standards;
    }

    // -------------------------------------------------------------------------------------------------
    // Level calculations
    // -------------------------------------------------------------------------------------------------

    public calculate(player: Player, activityPerformances: ActivityPerformance[]): LevelCalculatorOutput {
        const levels: LevelCalculatorOutput = {
            player: 0,
            attributes: {
                [Attribute.Strength]: 0,
                [Attribute.Power]: 0,
                [Attribute.Endurance]: 0,
                [Attribute.Agility]: 0,
            } as const
        };

        for (const value of Object.values(player)) {
            if (!value)
                return levels;
        }

        levels.attributes = this.calculateAllAttributeLevels(player, activityPerformances);
        for (const level of Object.values(levels.attributes)) {
            if (!level)
                return levels;
        }

        const attrLevelsSum = Object.values(levels.attributes).reduce((sum, lvl) => sum + lvl, 0);
        levels.player = Math.round(attrLevelsSum / Object.keys(Attribute).length);

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
            if (!value)
                return attrLevels;
        }

        (Object.values(Attribute) as Attribute[]).forEach((attribute) => {
            const attrActivityPerformances = activityPerformances.filter(
                (p) => this.standards.byActivity(p.activity).getMetadata().attribute === attribute,
            );
            attrLevels[attribute] = this.calculateAttributeLevel(attribute, player, attrActivityPerformances);
        });

        return attrLevels;
    }


    private calculateAttributeLevel(
        attribute: Attribute,
        player: Player,
        activityPerformances: ActivityPerformance[],
    ): number {
        // must be activities of the given attribute
        if (activityPerformances.some((p) => this.standards.byActivity(p.activity).getMetadata().attribute !== attribute)) {
            throw new Error("Wrong activity performance attribute");
        }

        // must perform all of an attributes activities
        for (const activity of this.standards.getAttributeActivities(attribute)) {
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
            const interpolatedStandard = this.standards
                .byActivity(p.activity)
                .byMetrics(player.metrics)
                .getOneInterpolated();
            return this.findLevel(interpolatedStandard, p.performance);
        });

        const activityLevelsAvg = Math.round(
            activityLevels.reduce((sum, curr) => sum + curr, 0) / activityLevels.length,
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
        maxLevel: number,
    },
    activity: Record<Activity, {
        weightModifier: number,
        weightSkew: number,
        ageModifier: number,
        enableGeneration: boolean,
        difficultyModifier: number
    }>
}

export class Standards {
    readonly cfg: StandardsConfig;
    private activityStandards: ActivityStandards;

    constructor(activityStandards: ActivityStandards, cfg?: Partial<StandardsConfig>) {
        // TODO: set these somewhere
        const defaultActivitiesConfig = Object.fromEntries(
            Object.values(Activity).map(activity => [
                activity,
                {
                    enableGeneration: true,
                    weightModifier: activity === Activity.BroadJump ?
                        -0.1 :
                        0.1,
                    weightSkew: 0,
                    ageModifier: 0.5,
                    difficultyModifier: 0
                },
            ])
        ) as Record<Activity, StandardsConfig["activity"][Activity]>;

        this.cfg = {
            global: {
                maxLevel: cfg?.global?.maxLevel ?? 100,
            },
            activity: Object.assign(defaultActivitiesConfig, cfg?.activity)
        };

        // prepare data
        this.activityStandards = structuredClone(activityStandards);
        for (const activity of Object.keys(this.activityStandards) as Activity[]) {
            for (const standard of this.activityStandards[activity].standards) {
                // expand
                let i = 1;
                while (Object.keys(standard.levels).length < this.cfg.global.maxLevel) {
                    standard.levels = this.expandLevels(standard.levels, i++);
                }

                // compress
                if (Object.keys(standard.levels).length > this.cfg.global.maxLevel) {
                    standard.levels = this.compressLevels(standard.levels, this.cfg.global.maxLevel);
                }

                // apply skew config
                for (const level in standard.levels) {
                    standard.levels[level] = standard.levels[level] * (1 + this.cfg.activity[activity].difficultyModifier)
                }
            }

            // generate data
            const allGenerators = this.cfg.activity[activity].enableGeneration ?
                this.activityStandards[activity].metadata.generators :
                [];

            const ageGenerators = allGenerators.filter(g => g.metric === "age");
            for (const ageGenerator of ageGenerators) {
                for (const gender of Object.values(Gender)) {
                    const peakAge = 27;
                    const ageStep = 10;

                    const medianAge = 50;
                    const minAge = Math.max(medianAge - (5 * ageStep), 0);
                    const maxAge = medianAge + (5 * ageStep);

                    const referenceStandard = this
                        .byActivity(activity)
                        .byMetrics({ weight: getAvgWeight(gender, peakAge), gender, age: peakAge })
                        .getOneInterpolated();

                    let currAge = minAge;
                    while (currAge <= maxAge) {
                        const newStandard: Standard = {
                            metrics: {
                                weight: getAvgWeight(gender, currAge),
                                age: currAge,
                                gender
                            },
                            levels: {}
                        };

                        for (const lvl in referenceStandard.levels) {
                            const base = referenceStandard.levels[lvl];
                            if (!base) continue;

                            const s = this.cfg.activity[activity].ageModifier;

                            const youngFloor0 = 0.5;
                            const oldFloor0 = 0.5;

                            const youngFloor = 1 - (1 - youngFloor0) * s;
                            const oldFloor = 1 - (1 - oldFloor0) * s;

                            const cy = s * (1 - youngFloor0) / Math.pow(peakAge - minAge, 2);
                            const co = s * (1 - oldFloor0) / Math.pow(maxAge - peakAge, 2);

                            let f = currAge <= peakAge
                                ? 1 - cy * Math.pow(peakAge - currAge, 2)
                                : 1 - co * Math.pow(currAge - peakAge, 2);

                            const floor = Math.min(youngFloor, oldFloor);
                            const fCurr = Math.max(floor, Math.min(1, f));

                            newStandard.levels[lvl] = base * fCurr;
                        }

                        // prefer real data over generated data
                        const overlappingStandard = this
                            .byActivity(activity)
                            .byMetrics(newStandard.metrics)
                            .getOne();
                        if (!overlappingStandard)
                            this.activityStandards[activity].standards.push(newStandard);

                        currAge += ageStep;
                    }
                }

                // now that we generated metric data, remove the old data
                this.activityStandards[activity].standards = this.activityStandards[activity].standards
                    .filter(s => s.metrics.weight)
            }

            const weightGenerators = allGenerators.filter(g => g.metric === "weight");
            for (const weightGenerator of weightGenerators) {
                for (const gender of Object.values(Gender)) {
                    for (const age of this.agesFor(activity, gender)) {
                        const weightStep = 12;
                        const referenceWeight = getAvgWeight(gender, age);

                        const minWeight = Math.max(referenceWeight - (3 * weightStep), 1);
                        const maxWeight = referenceWeight + (3 * weightStep);

                        const referenceStandard = this
                            .byActivity(activity)
                            .byMetrics({ weight: referenceWeight, gender, age })
                            .getOneInterpolated();

                        let currWeight = minWeight;
                        while (currWeight <= maxWeight) {
                            const newStandard: Standard = {
                                metrics: {
                                    weight: currWeight,
                                    age,
                                    gender
                                },
                                levels: {}
                            };

                            // apply allometric scaling to generate levels
                            for (const lvl in referenceStandard.levels) {
                                if (!referenceStandard.levels[lvl]) continue;

                                const scalingExponent = this.cfg.activity[activity].weightModifier
                                const coefficient = currWeight / referenceWeight;

                                newStandard.levels[lvl] = referenceStandard.levels[lvl] * (coefficient ** scalingExponent);
                            }

                            // prefer real data over generated data
                            const overlappingStandard = this
                                .byActivity(activity)
                                .byMetrics(newStandard.metrics)
                                .getOne();
                            if (!overlappingStandard)
                                this.activityStandards[activity].standards.push(newStandard);

                            currWeight += weightStep;
                        }
                    }
                }

                // now that we generated metric data, remove the old data
                this.activityStandards[activity].standards = this.activityStandards[activity].standards
                    .filter(s => s.metrics.weight);
            }

            this.activityStandards[activity].standards = this.activityStandards[activity].standards
                .sort((a, b) => {
                    const genderOrder: Record<Gender, number> = { Male: 0, Female: 1 };
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
                        if (state.gender != null && s.metrics.gender !== state.gender) continue;
                        if (state.age != null && s.metrics.age !== state.age) continue;
                        if (state.weight != null && s.metrics.weight !== state.weight) continue;
                        out.push(s);
                    }
                    return out;
                },
                getOne: function(): Standard | undefined {
                    return execMethods.exact.getAll()[0];
                },
                getNearest(metric: NumberMetric, target: number): { lower: Standard; upper: Standard } {
                    const standards = execMethods.exact.getAll();
                    if (standards.length === 0) throw new Error('no standards');

                    let lower = standards[0];           // best <= target
                    let upper = standards[0];           // best >= target
                    let hasLower = false, hasUpper = false;

                    for (const standard of standards) {
                        const standardMetricValue = standard.metrics[metric];

                        if (standardMetricValue <= target) {
                            if (!hasLower || standardMetricValue > lower.metrics[metric]) { lower = standard; hasLower = true; }
                        }
                        if (standardMetricValue >= target) {
                            if (!hasUpper || standardMetricValue < upper.metrics[metric]) { upper = standard; hasUpper = true; }
                        }
                    }

                    // clamp to ends if one side missing
                    if (!hasLower) lower = standards[0];
                    if (!hasUpper) upper = standards[standards.length - 1];
                    return { lower, upper };
                }
            }
        };

        const interpolateByAgeAndWeight = (metrics: Metrics): Standard => {
            const interpolateByWeight = (targetAge: number): Levels => {
                const { lower: lowerAgeWeightStandard, upper: upperAgeWeightStandard } = this
                    .byActivity(activity)
                    .byGender(metrics.gender)
                    .byAge(targetAge)
                    .getNearest("weight", metrics.weight);

                const weightLower = lowerAgeWeightStandard.metrics.weight;
                const weightUpper = upperAgeWeightStandard.metrics.weight;

                let weightRatio = weightUpper === weightLower ? 1 : (metrics.weight - weightLower) / (weightUpper - weightLower);
                weightRatio = Math.max(0, Math.min(1, weightRatio));

                // metrics.weight = lowerAgeWeightStandard.metrics.weight + (upperAgeWeightStandard.metrics.weight - lowerAgeWeightStandard.metrics.weight) * weightRatio;

                return this.interpolateLevels(lowerAgeWeightStandard.levels, upperAgeWeightStandard.levels, weightRatio);
            }

            // Find nearest age standards
            const { lower: lowerAgeStandard, upper: upperAgeStandard } = this
                .byActivity(activity)
                .byGender(metrics.gender)
                .getNearest("age", metrics.age);

            const ageLower = lowerAgeStandard.metrics.age;
            const ageUpper = upperAgeStandard.metrics.age;

            // Interpolate by age and weight
            let ageRatio = ageUpper === ageLower ? 1 : (metrics.age - ageLower) / (ageUpper - ageLower);
            ageRatio = Math.max(0, Math.min(1, ageRatio));

            const interpolatedLevels = this.interpolateLevels(
                interpolateByWeight(ageLower),
                interpolateByWeight(ageUpper),
                ageRatio
            );

            return {
                metrics: metrics,
                levels: interpolatedLevels
            }
        };

        const getAllInterpolated = (opt?: { normalizeForLb?: boolean }): Standard[] => {
            const metrics: Metrics = state as Metrics;

            let weights = this.weightsFor(activity, metrics.gender, metrics.age);
            if (opt?.normalizeForLb) {
                weights = weights.map(w => lbToKg(Math.round(kgToLb(w))));
            }

            const interpolatedStandards: Standard[] = weights
                .map(weight => interpolateByAgeAndWeight({ ...metrics, weight }));

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
        }

        const byAge = (age: number) => {
            state.age = age;
            return { byWeight, ...execMethods.exact, getAllInterpolated };
        }

        const byWeight = (weight: number) => {
            state.weight = weight;
            return { ...execMethods.exact, getOneInterpolated };
        }

        const byMetrics = (metrics: Metrics) => {
            Object.assign(state, metrics);
            return { ...execMethods.exact, getOneInterpolated };
        }

        const initialMethods = { byGender, byMetrics, getMetadata, ...execMethods.exact };
        return initialMethods;
    }

    public getAttributeActivities(attribute: Attribute): Activity[] {
        const activities: Activity[] = [];
        for (const activity of Object.keys(this.activityStandards) as Activity[]) {
            const activityStandard = this.activityStandards[activity] as ActivityStandards[Activity];
            if (activityStandard.metadata.attribute === attribute) {
                activities.push(activity as Activity);
            }
        }
        return activities;
    }

    // TODO: turn these into queries?
    public weightsFor(activity: Activity, gender: Gender, age: number) {
        const { lower, upper } = this
            .byActivity(activity)
            .byGender(gender)
            .getNearest("age", age);

        const lowerDiff = Math.abs(lower.metrics.age - age);
        const upperDiff = Math.abs(upper.metrics.age - age);
        const closestAge = lowerDiff < upperDiff ?
            lower.metrics.age :
            upper.metrics.age;

        const weights = this
            .byActivity(activity)
            .byGender(gender)
            .byAge(closestAge)
            .getAll().map((s) => s.metrics.weight);

        return weights;
    }

    public agesFor(activity: Activity, gender: Gender) {
        const standardsByGender = this.byActivity(activity).byGender(gender).getAll();
        const ages = [...new Set(standardsByGender.map(s => s.metrics.age))];
        return ages;
    }

    private expandLevels(
        levels: Levels,
        i: number
    ): Levels {
        if (i == 0) {
            return levels;
        }

        const newLevels: Levels = {};
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

    private compressLevels(
        levels: Levels,
        targetLevel: number,
    ): Levels {
        const levelsAmount = Object.keys(levels).length;
        if (levelsAmount < targetLevel) {
            throw new Error(
                "Target levels amount must be greater than or equal to the current levels amount",
            );
        }

        const ratio = levelsAmount / targetLevel;
        const compressedLevels: Levels = {};

        for (let i = 0; i < targetLevel; ++i) {
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

    private interpolateLevels(
        lower: Levels,
        upper: Levels,
        ratio: number,
    ): Levels {
        if (Object.keys(lower).length !== Object.keys(upper).length)
            throw new Error("Cannot interpolate between varying number of levels");

        const lerp = (lvl: string) => (lower[lvl] as number) + ((upper[lvl] as number) - (lower[lvl] as number)) * ratio;

        const interpolatedLevels: Levels = {};
        for (const lvl in lower) {
            interpolatedLevels[lvl] = lerp(lvl);
        }

        return interpolatedLevels;
    }
}
