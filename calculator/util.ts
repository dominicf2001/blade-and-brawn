// -------------------------------------------------------------------------------------------------
// Enumerations & basic value objects
// -------------------------------------------------------------------------------------------------
export const activities = Object.freeze({
    BACK_SQUAT: "Back Squat",
    DEADLIFT: "Deadlift",
    BENCH_PRESS: "Bench Press",
    RUN: "Run",
    DASH: "Dash",
    TREADMILL_DASH: "Treadmill Dash",
    BROAD_JUMP: "Broad Jump",
    CONE_DRILL: "Cone Drill",
} as const);

export type Activity = typeof activities[keyof typeof activities];

export const genders = Object.freeze({
    MALE: "male",
    FEMALE: "female",
} as const);
export type Gender = typeof genders[keyof typeof genders];

// -------------------------------------------------------------------------------------------------
// Attributes 
// -------------------------------------------------------------------------------------------------

export const attributes = Object.freeze({
    STRENGTH: "Strength",
    POWER: "Power",
    ENDURANCE: "Endurance",
    SPEED: "Speed",
    AGILITY: "Agility",
} as const);
export type Attribute = typeof attributes[keyof typeof attributes];

export const getActivityAttribute = (activity: Activity): Attribute => {
    const activityAttrMap: Record<Activity, Attribute> = {
        [activities.RUN]: attributes.ENDURANCE,
        [activities.TREADMILL_DASH]: attributes.SPEED,
        [activities.DASH]: attributes.SPEED,
        [activities.DEADLIFT]: attributes.STRENGTH,
        [activities.BACK_SQUAT]: attributes.STRENGTH,
        [activities.BENCH_PRESS]: attributes.STRENGTH,
        [activities.BROAD_JUMP]: attributes.POWER,
        [activities.CONE_DRILL]: attributes.AGILITY,
    } as const;

    const attribute = activityAttrMap[activity];
    if (!attribute) throw new Error(`${activity} does not have an associated attribute`);
    return attribute;
};

// -------------------------------------------------------------------------------------------------
// Data model interfaces
// -------------------------------------------------------------------------------------------------
export interface BenchmarkPerformance {
    activity: Activity;
    performance: number;
    /**
     * Key: level number, Value: performance value (kg, ms, m/s, etc.)
     */
    levels: Record<number, number>;
}

export interface Levels {
    /** KG or -1 for body‑weight‑agnostic entries */
    physicallyActive: number;
    beginner: number;
    intermediate: number;
    advanced: number;
    elite: number;
}

export interface StandardsItem extends Levels {
    bodyWeight: number;
    gender: Gender;
    activityType: Activity;
    age: number;
}

// -------------------------------------------------------------------------------------------------
// Conversion utilities
// -------------------------------------------------------------------------------------------------
export const lbToKg = (lb: number | string): number => +lb * 0.453592;
export const kgToLb = (kg: number | string): number => +kg * 2.20462;

export const feetToCm = (feet: number): number => feet * 30.48;

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

// -------------------------------------------------------------------------------------------------
// Misc. utilities
// -------------------------------------------------------------------------------------------------

export const findNearestPoints = (value: number, arr: number[]): { lower: number; upper: number } => {
    if (arr.length === 1) return { lower: arr[0], upper: arr[0] };

    if (value <= arr[0]) return { lower: arr[0], upper: arr[1] };
    if (value > arr[arr.length - 1])
        return { lower: arr[arr.length - 2], upper: arr[arr.length - 1] };

    for (let i = 1; i < arr.length; i++) {
        if (arr[i] >= value) return { lower: arr[i - 1], upper: arr[i] };
    }
    // Fallback, though logic should always return above
    return { lower: arr[0], upper: arr[0] };
};

