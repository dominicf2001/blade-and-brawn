import { Activity, Attribute, Player, Gender, ActivityPerformance, lbToKg } from "./util";

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
        generators: Generator[]
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
                (p) => this.standards.getActivityAttribute(p.activity) === attribute,
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
        if (activityPerformances.some((p) => this.standards.getActivityAttribute(p.activity) !== attribute)) {
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
                .getInterpolated();
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
            const diff = Math.abs(performance - standard.levels[level as unknown as number]);
            if (diff < resultLevelDiff) {
                resultLevel = +level;
                resultLevelDiff = diff;
            }
        }
        return resultLevel;
    }
}

export class Standards {
    private activityStandards: ActivityStandards;

    constructor(activityStandards: ActivityStandards) {
        // prepare data
        this.activityStandards = activityStandards;
        for (const activity of Object.keys(this.activityStandards) as Activity[]) {
            // expand/compress
            for (const standard of this.activityStandards[activity].standards) {
                const expandedLevels = this.expandLevels(standard.levels, 5);
                const compressedLevels = this.compressLevels(expandedLevels, 100);
                standard.levels = compressedLevels;
            }

            // generate data
            // const allGenerators = this.activityStandards[activity].metadata.generators;
            //
            // const ageGenerators = allGenerators.filter(g => g.metric === "age");
            // for (const ageGenerator of ageGenerators) {
            // }
            //
            // const weightGenerators = allGenerators.filter(g => g.metric === "weight");
            // for (const weightGenerator of weightGenerators) {
            //     for (const gender of Object.values(Gender)) {
            //         const referenceWeight = gender === Gender.Male ?
            //             lbToKg(170) :
            //             lbToKg(137);
            //
            //         const standardsByGender = this.byActivity(activity).byGender(gender).getAll();
            //         const ages = [...new Set(standardsByGender.map(s => s.metrics.age))];
            //
            //         for (const age of ages) {
            //             const levelCalculator = new LevelCalculator(this);
            //             const referenceStandard = 
            //         }
            //     }
            // }
        }
    }

    public byActivity(activity: Activity) {
        const self = this;

        const state: Partial<Metrics> = {};

        const execMethods = {
            getAll: function(): Standard[] {
                let filtered = [...self.activityStandards[activity].standards];
                if (state.gender)
                    filtered = filtered.filter((s) => s.metrics.gender === state.gender);
                if (state.age)
                    filtered = filtered.filter((s) => s.metrics.age === state.age);
                if (state.weight)
                    filtered = filtered.filter((s) => s.metrics.weight === state.weight);
                return filtered;
            },
            getOne: function(): Standard {
                return execMethods.getAll()[0];
            },
            getNearest(metric: NumberMetric, target: number): { lower: Standard, upper: Standard } {
                const standards = execMethods.getAll();
                const lower = [...standards]
                    .sort((a, b) => a.metrics[metric] - b.metrics[metric])
                    .reverse()
                    .find((s) => s.metrics[metric] <= target) ?? standards.at(0)!;
                const upper = [...standards]
                    .sort((a, b) => a.metrics[metric] - b.metrics[metric])
                    .find((s) => s.metrics[metric] >= target) ?? standards.at(-1)!;
                return { lower, upper };
            },
        };

        const getInterpolated = (): Standard => {
            const metrics: Metrics = state as Metrics;

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
                metrics,
                levels: interpolatedLevels
            };
        };

        const byGender = (gender: Gender) => {
            state.gender = gender;
            return { byAge, ...execMethods };
        }

        const byAge = (age: number) => {
            state.age = age;
            return { byWeight, ...execMethods };
        }

        const byWeight = (weight: number) => {
            state.weight = weight;
            return { ...execMethods, getInterpolated };
        }

        const byMetrics = (metrics: Metrics) => {
            Object.assign(state, metrics);
            return { ...execMethods, getInterpolated };
        }

        return { byGender, byMetrics, ...execMethods }
    }

    getActivityAttribute(activity: Activity): Attribute {
        return this.activityStandards[activity].metadata.attribute;
    };

    getAttributeActivities(attribute: Attribute): Activity[] {
        const activities: Activity[] = [];
        for (const activity in this.activityStandards) {
            const activityStandard = this.activityStandards[activity] as ActivityStandards[Activity];
            if (activityStandard.metadata.attribute === attribute) {
                activities.push(activity as Activity);
            }
        }
        return activities;
    }

    private expandLevels(
        levels: Levels,
        i: number
    ): Levels {
        if (i == 0) {
            return levels;
        }

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

        const interpolatedLevels = {};
        for (const lvl in lower) {
            interpolatedLevels[lvl] = lerp(lvl);
        }

        return interpolatedLevels;
    }
}
