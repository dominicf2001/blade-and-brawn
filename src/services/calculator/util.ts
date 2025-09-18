import { Metrics } from "../calculator/main";

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

export const feetToCm = (feet: number) => feet * 30.48;
export const inchesToCm = (inches: number) => inches * 2.54;

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


