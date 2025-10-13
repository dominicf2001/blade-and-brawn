import { Activity, ftToCm, Gender, getAvgWeight, inToCm, kgToLb, lbToKg, minToMs, secToMs, type ActivityPerformance, type Player } from "$lib/services/calculator/util";
import PrintfulService from "$lib/services/commerce/printful";
import SyncService from "$lib/services/commerce/sync";
import type { DeepPartial } from "$lib/services/commerce/util/misc";
import type { Printful } from "$lib/services/commerce/util/types";
import WebflowService from "$lib/services/commerce/webflow";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

const p = await WebflowService.Products.get("68e66dc4633e577c91eda713");
console.log(p);

// const printfulProducts = await PrintfulService.Products.getAll();
// const webflowProducts = await WebflowService.Products.getAll();
//
// for (const printfulProduct of printfulProducts) {
//     const fullPrintfulProduct = await PrintfulService.Products.get(printfulProduct.id);
//     console.log(fullPrintfulProduct.sync_product.name);
//     const existingWebflowProduct = webflowProducts.find(p => fullPrintfulProduct.sync_product.name.includes(p.product.fieldData.name))
//     if (!existingWebflowProduct) {
//         continue;
//     }
//     console.log(existingWebflowProduct.product.fieldData.name);
//
//     console.log(existingWebflowProduct.skus.map(s => s.fieldData["sku-values"]));
//     console.log(fullPrintfulProduct.sync_variants.map(s => ({ color: s.color, size: s.size })));
//
//     const newPrintfulVariants: DeepPartial<Printful.Products.SyncVariant>[] = [];
//     for (const printfulVariant of fullPrintfulProduct.sync_variants) {
//         const associatedWebflowSku = existingWebflowProduct.skus
//             .find(sku => sku.fieldData["sku-values"]?.["color"] === printfulVariant.color &&
//                 sku.fieldData["sku-values"]?.["size"] === printfulVariant.size);
//         if (associatedWebflowSku) {
//             newPrintfulVariants.push({
//                 "id": printfulVariant.id,                       // printful variant id
//                 "external_id": String(associatedWebflowSku.id), // webflow variant id
//             });
//         }
//     }
//
//     if (!newPrintfulVariants.length) {
//         continue;
//     }
//
//     await sleep(10000);
//     await PrintfulService.Products.update(printfulProduct.id, {
//         "sync_product": {
//             "id": printfulProduct.id,
//             "external_id": existingWebflowProduct.product.id + "-" + SyncService.findColorInProductName(printfulProduct.name)
//         },
//         "sync_variants": newPrintfulVariants
//     });
// }
// console.log("DONE");

//
// await WebflowService.Products.update(wProduct?.product.id!, wProduct!);
//
// const sku = {
//     "fieldData": {
//         "name": "Test",
//         "slug": "test-test",
//         "sku-values": {
//             "color": "black",
//             "size": "L",
//         },
//         "price": {
//             "value": +0 * 100,
//             "unit": "USD",
//         },
//         "main-image": "https://cdn.prod.website-files.com/675a3fbe966e58ea9aa710e4/68d09d3d8e1e8bad26a9cf07_knight-title-tank-white-10.png"
//     }
// }
//


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
