import { Activity, Attribute, Gender, getAvgWeight, kgToLb, lbToKg, type ActivityPerformance, type Player, type StandardUnit } from "./util";

// SOURCES
// Squat, Bench, Dead Lift: 
//  http://lonkilgore.com/resources/Lon_Kilgore_Strength_Standard_Tables-Copyright-2023.pdf
// 1 mile run:
//  https://runninglevel.com/running-times/1-mile-times
// Dash: 
//  https://marathonhandbook.com/average-100-meter-time/
// Broad Jump:
//  

type LevelCalculatorConfig = {
    expandIters?: number;
    compressTo?: number;
}

type LevelCalculatorOutput = {
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
    metric: NumberMetric,
    spread: number,
    step: number,
    ratio: "normal" | "inverse"
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
    cfg: Required<LevelCalculatorConfig>;
    standards: Standards;

    public constructor(standards: Standards, cfg: LevelCalculatorConfig = {}) {
        this.cfg = {
            expandIters: cfg.expandIters ?? 5,
            compressTo: cfg.compressTo ?? 100
        }
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
    maxLevel: number,
    weightModifier: number,
    weightSkew: number,
    ageModifier: number,
    disableGeneration: boolean
}

export class Standards {
    readonly cfg: StandardsConfig;
    private activityStandards: ActivityStandards;

    constructor(activityStandards: ActivityStandards, cfg?: Partial<StandardsConfig>) {
        this.cfg = {
            maxLevel: cfg?.maxLevel ?? 100,
            weightModifier: cfg?.weightModifier ?? .1,
            weightSkew: cfg?.weightSkew ?? .1,
            ageModifier: cfg?.ageModifier ?? .1,
            disableGeneration: cfg?.disableGeneration ?? false
        };

        // prepare data
        this.activityStandards = structuredClone(activityStandards);
        for (const activity of Object.keys(this.activityStandards) as Activity[]) {
            // expand/compress
            for (const standard of this.activityStandards[activity].standards) {
                const expandedLevels = this.expandLevels(standard.levels, 5);
                const compressedLevels = this.compressLevels(expandedLevels, this.cfg.maxLevel);
                standard.levels = compressedLevels;
            }

            // generate data
            const allGenerators = this.cfg.disableGeneration ?
                [] :
                this.activityStandards[activity].metadata.generators;

            const ageGenerators = allGenerators.filter(g => g.metric === "age");
            for (const ageGenerator of ageGenerators) {
                for (const gender of Object.values(Gender)) {
                    const referenceAge = 50;

                    const minAge = referenceAge - (ageGenerator.step * ageGenerator.spread);
                    const maxAge = referenceAge + (ageGenerator.step * ageGenerator.spread);

                    const referenceStandard = this
                        .byActivity(activity)
                        .byMetrics({ weight: getAvgWeight(gender, referenceAge), gender, age: referenceAge })
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

                        // apply allometric scaling to generate levels
                        for (const lvl in referenceStandard.levels) {
                            if (!referenceStandard.levels[lvl]) continue;

                            const scalingExponent = this.cfg.ageModifier;
                            const coefficient = ageGenerator.ratio === "inverse" ?
                                referenceAge / currAge :
                                currAge / referenceAge;
                            newStandard.levels[lvl] = referenceStandard.levels[lvl] * (coefficient ** scalingExponent);
                        }

                        // prefer real data over generated data
                        const overlappingStandard = this
                            .byActivity(activity)
                            .byMetrics(newStandard.metrics)
                            .getOne();
                        if (!overlappingStandard)
                            this.activityStandards[activity].standards.push(newStandard);

                        currAge += ageGenerator.step;
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
                        const referenceWeight = getAvgWeight(gender, age);

                        const skewRatio = this.cfg.weightSkew; // 0 = normal, 1 = max skew
                        const minWeight = referenceWeight - (weightGenerator.step * weightGenerator.spread * (1 - skewRatio));
                        const maxWeight = referenceWeight + (weightGenerator.step * weightGenerator.spread * (1 + skewRatio));

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

                                const scalingExponent = this.cfg.weightModifier;
                                const coefficient = weightGenerator.ratio === "inverse" ?
                                    referenceWeight / currWeight :
                                    currWeight / referenceWeight;

                                newStandard.levels[lvl] = referenceStandard.levels[lvl] * (coefficient ** scalingExponent);
                            }

                            // prefer real data over generated data
                            const overlappingStandard = this
                                .byActivity(activity)
                                .byMetrics(newStandard.metrics)
                                .getOne();
                            if (!overlappingStandard)
                                this.activityStandards[activity].standards.push(newStandard);

                            currWeight += weightGenerator.step;
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
