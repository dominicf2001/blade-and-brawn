import { Metrics } from "./calc";

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
export const lbToKg = (lb: number | string): number => +lb * 0.453592;
export const kgToLb = (kg: number | string): number => +kg * 2.20462;

export const minToMs = (min) => min * 60000;
export const secToMs = (sec) => sec * 1000;

export const feetToCm = (feet) => feet * 30.48;
export const inchesToCm = (inches) => inches * 2.54;

export const mphToMtrsPerMs = (mph: number): number => (mph * 0.44704) / 1000;

export const timeToMs = (time: string): number => {
    const [main, decimal = "0"] = time.split(".");
    const milliseconds = Number(decimal.padEnd(3, "0").slice(0, 3));

    const parts = main.split(":").map(Number);
    let minutes = 0,
        seconds = 0;

    if (parts.length === 1) {
        seconds = parts[0];
    } else if (parts.length === 2) {
        [minutes, seconds] = parts as [number, number];
    } else {
        throw new Error("Invalid time format");
    }

    return (minutes * 60 + seconds) * 1000 + milliseconds;
};

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
