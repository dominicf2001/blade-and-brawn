import {
    type ActivityStandards,
    type Levels,
} from "$lib/services/calculator/main";
import { Activity, clamp, Gender, range } from "$lib/services/calculator/util";
import allStandards from "./standards.json";
import { levenbergMarquardt as LM } from "ml-levenberg-marquardt";

const activityStandards = allStandards as ActivityStandards;

for (const activity of Object.values(Activity)) {
    const DATASET_MAX_LEVEL = 5;
    const NEW_LEVEL_COUNT = 2;
    const RATIO_CLAMP = 1.4;

    function expDecayModel([A, B, C]: number[]) {
        return (i: number) => A * Math.exp(-B * i) + C;
    }

    for (const gender of Object.values(Gender)) {
        const standardsByGender = activityStandards[activity].standards.filter(
            (s) => s["metrics"].gender === gender,
        );
        const ages = [...new Set(standardsByGender.map((s) => s.metrics.age))];
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

            for (const i of range(DATASET_MAX_LEVEL).slice(0, -1)) {
                const level = i + 1;
                const progressionRatios: number[] = [];
                for (const standard of standards) {
                    const curr = standard.levels[level];
                    const next = standard.levels[level];
                    progressionRatios.push(
                        isIncreasing ? next / curr : curr / next,
                    );
                }

                const sum = progressionRatios.reduce((p, c) => p + c, 0);
                const progressionRatioAvg = sum / progressionRatios.length;

                data.x.push(i);
                data.y.push(progressionRatioAvg);
            }

            const fittedParams = LM(data, expDecayModel, {
                initialValues: [0.4, 0.5, 1.1],
                minValues: [0.0, 0.0, 1.02],
                maxValues: [1.0, 2.0, 1.25],
                maxIterations: 200,
            });
            const getDecayRatio = (i: number) =>
                clamp(
                    expDecayModel(fittedParams.parameterValues)(i),
                    1,
                    RATIO_CLAMP,
                );

            // UPDATE THE DATA
            for (const standard of standards) {
                const newLevels: Levels = {};

                let prev = standard.levels["1"];
                for (const i of range(NEW_LEVEL_COUNT)) {
                    const level = i + 1;
                    const ratio = getDecayRatio(level - NEW_LEVEL_COUNT);
                    prev = isIncreasing ? prev / ratio : prev * ratio;
                    newLevels[level] = Math.round(prev);
                }

                const oldLevels = standard.levels as Levels;
                for (const i of range(DATASET_MAX_LEVEL)) {
                    const level = i + 1;
                    newLevels[level + NEW_LEVEL_COUNT] = oldLevels[level];
                }
                standard.levels = newLevels;
                console.log(newLevels);
            }
        }
    }
}
// Bun.write("./newStandards.json", JSON.stringify(allStandards, null, 2));
