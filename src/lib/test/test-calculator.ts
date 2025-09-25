import { Activity, ftToCm, Gender, getAvgWeight, inToCm, kgToLb, lbToKg, minToMs, secToMs, type ActivityPerformance, type Player } from "$lib/services/calculator/util";
import { Printful } from "$lib/services/commerce/printful";
import { Webflow } from "$lib/services/commerce/webflow";

const player: Player = {
    metrics: {
        age: 25,
        weight: lbToKg(190),
        gender: Gender.Male
    }
};

const computedPerformances: ActivityPerformance[] = [
    // STRENGTH
    {
        activity: Activity.BenchPress,
        performance: lbToKg(225)
    },
    {
        activity: Activity.Deadlift,
        performance: lbToKg(270),
    },
    {
        activity: Activity.BackSquat,
        performance: lbToKg(190),
    },
    // POWER
    {
        activity: Activity.BroadJump,
        performance: ftToCm(105) + inToCm(5),
    },
    // ENDURANCE
    {
        activity: Activity.Run,
        performance: minToMs(7) + secToMs(15),
    },
    // AGILITY
    {
        activity: Activity.ConeDrill,
        performance: secToMs(9),
    },
];

// const res = await fetch(`${Webflow.API_SITES_URL}/products/${}/skus/${"68d0154f97e90776a5680740"}`, {
//     method: "PATCH",
//     headers: {
//         "Content-Type": "application/json",
//         "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`
//     },
//     body: JSON.stringify({
//         "sku": webflowVariants[i]
//     })
// });

const productId = "68d080a129f538cd565bf56d";


const product = await Webflow.Products.get("68d080a129f538cd565bf56d");
const products = await Webflow.Products.getAll();



const skuId = "68d080a5d90e8263e52242e9";

const colors = ["Black", "White", "Red"];

// const sku = product.skus[0];
//
// sku.fieldData["more-images"] = [
//     {
//         "url": "https://website-media.bladeandbrawn.com/product-images/henry-iv-flag-black-10.png",
//     },
//     {
//         "url": "https://website-media.bladeandbrawn.com/product-images/henry-iv-flag-black-20.png",
//     },
// ];

// console.log("Fetching...");
// const res = await fetch(`${Webflow.API_SITES_URL}/products/${productId}/skus/${skuId}`, {
//     method: "PATCH",
//     headers: {
//         "Content-Type": "application/json",
//         "Authorization": `bearer ${Bun.env.WEBFLOW_AUTH}`
//     },
//     body: JSON.stringify({
//         "sku": sku
//     })
// });
// console.log(res);
//
// const productAfter = (await Webflow.Products.getAll())[0];
//
// console.log(productAfter.skus[0].fieldData["more-images"]);

// const newStandards: Standards = {
//     "Back Squat": [],
//     "Deadlift": [],
//     "Bench Press": [],
//     "Run": [],
//     "Dash": [],
//     "Treadmill Dash": [],
//     "Broad Jump": [],
//     "Cone Drill": [],
// };
//
// for (const item of standards) {
//     if (!newStandards[item.activityType])
//         continue;
//
//     newStandards[item.activityType].push({
//         metrics: {
//             age: item.age,
//             weight: item.bodyWeight,
//             gender: item.gender
//         },
//         levels: {
//             physicallyActive: item.physicallyActive,
//             beginner: item.beginner,
//             intermediate: item.intermediate,
//             advanced: item.advanced,
//             elite: item.elite
//         }
//     });
// }
//
// Bun.write("./newStandards.json", JSON.stringify(newStandards, null, 2));
