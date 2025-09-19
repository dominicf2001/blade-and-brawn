import { type Metrics } from "$lib/services/calculator/main";
import avgWeightDataRaw from "$lib/data/avg-weights.json"

// -------------------------------------------------------------------------------------------------
// DATA MODELS 
// -------------------------------------------------------------------------------------------------

export interface Player {
    metrics: Metrics;
}

export enum Attribute {
    Strength = "Strength",
    Power = "Power",
    Endurance = "Endurance",
    Agility = "Agility",
}

export enum Activity {
    BackSquat = "BackSquat",
    Deadlift = "Deadlift",
    BenchPress = "BenchPress",
    Run = "Run",
    BroadJump = "BroadJump",
    ConeDrill = "ConeDrill",
}

export interface ActivityPerformance {
    activity: Activity;
    performance: number;
}

export enum Gender {
    Male = "Male",
    Female = "Female"
}

// -------------------------------------------------------------------------------------------------
// Conversion utilities
// -------------------------------------------------------------------------------------------------

export type StandardUnit = "ms" | "cm" | "kg";

export const lbToKg = (lb: number | string): number => +lb * 0.453592;
export const kgToLb = (kg: number | string): number => +kg * 2.20462;

export const minToMs = (min: number) => min * 60000;
export const secToMs = (sec: number) => sec * 1000;
export const msToMin = (ms: number) => ms / 60000;

export const ftToCm = (ft: number) => ft * 30.48;
export const inToCm = (inches: number) => inches * 2.54;
export const cmToIn = (cm: number) => cm / 2.54;

export const msToTime = (ms: number, includeMs = false): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);

    let formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    if (includeMs) {
        formattedTime += `.${milliseconds.toString().padStart(3, "0")}`;
    }
    return formattedTime;
};

export const range = (length: number) => Array.from({ length: length }, (_, i) => i + 1);

// export const getAvgWeight = (gender: Gender, age: number) => {
//     type AvgWeightData = {
//         metadata: {
//             unit: StandardUnit
//         },
//         weights: Metrics[]
//     }
//     let avgWeightData = avgWeightDataRaw as AvgWeightData;
//
//     const avgWeights = avgWeightData.weights.filter(a => a.gender === gender);
//
//     let lower = avgWeights[0];           // best <= target
//     let upper = avgWeights[0];           // best >= target
//     let hasLower = false, hasUpper = false;
//
//     for (const avg of avgWeights) {
//         if (avg.age <= age) {
//             if (!hasLower || avg.age > lower.age) { lower = avg; hasLower = true; }
//         }
//         if (avg.age >= age) {
//             if (!hasUpper || avg.age < upper.age) { upper = avg; hasUpper = true; }
//         }
//     }
//
//     // clamp to ends if one side missing
//     if (!hasLower) lower = avgWeights[0];
//     if (!hasUpper) upper = avgWeights[avgWeights.length - 1];
//
//     // lerp
//     let ageRatio = upper === lower ? 1 : (age - lower.age) / (upper.age - lower.age);
//     ageRatio = Math.max(0, Math.min(1, ageRatio));
//     const interpolatedAvg = lower.weight + (upper.weight - lower.weight) * ageRatio;
//
//     return interpolatedAvg;
// }

export const getAvgWeight = (gender: Gender, age: number) => {
    type AvgWeightData = {
        metadata: {
            unit: StandardUnit
        },
        weights: Metrics[]
    }
    let avgWeightData = avgWeightDataRaw as AvgWeightData;

    const avgWeights = avgWeightData.weights.filter(a => a.gender === gender);
    if (!avgWeights.length) throw new Error("No average weights");

    const closest = {
        diff: Math.abs(avgWeights[0].age - age),
        avg: avgWeights[0]
    };
    for (const avg of avgWeights) {
        const diff = Math.abs(avg.age - age);
        if (diff < closest.diff) {
            closest.diff = diff;
            closest.avg = avg;
        }
    }

    return closest.avg.weight;
}
