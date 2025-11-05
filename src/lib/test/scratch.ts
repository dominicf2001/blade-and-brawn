import {
    Activity,
    ftToCm,
    Gender,
    getAvgWeight,
    inToCm,
    kgToLb,
    lbToKg,
    minToMs,
    secToMs,
    type ActivityPerformance,
    type Player,
} from "$lib/services/calculator/util";
import PrintfulService from "$lib/services/commerce/printful";
import SyncService from "$lib/services/commerce/sync";
import { FetchError, type DeepPartial } from "$lib/services/commerce/util/misc";
import type { Printful } from "$lib/services/commerce/util/types";
import WebflowService from "$lib/services/commerce/webflow";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const player: Player = {
    metrics: {
        age: 25,
        weight: lbToKg(190),
        gender: Gender.Male,
    },
};

const computedPerformances: ActivityPerformance[] = [
    // STRENGTH
    {
        activity: Activity.BenchPress,
        performance: lbToKg(225),
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

const pOrders = await PrintfulService.Orders.getAll();
console.log(pOrders);

// wProduct.product.fieldData.name = "Rogue Title Hoodie [White] / XS";
//
// WebflowService.Products.update("68e66dc4633e577c91eda727",);

// const printfulProducts = await PrintfulService.Products.getAll();
// const webflowProducts = await WebflowService.Products.getAll();
//
// for (const printfulProduct of printfulProducts) {
//     if (!printfulProduct.name.includes("T-Shirt") || printfulProduct.name.includes("[White]") || printfulProduct.name.includes("[Black]")) {
//         continue;
//     }
//
//     console.log(printfulProduct.name);
//
//     const fullPrintfulProduct = await PrintfulService.Products.get(printfulProduct.id);
//     if (!fullPrintfulProduct) {
//         console.log("Could not get full product, skipped");
//         continue;
//     }
//
//     const existingWebflowProduct = webflowProducts.find(p => fullPrintfulProduct.sync_product.name.includes(p.product.fieldData.name))
//     if (!existingWebflowProduct) {
//         console.log("Could not get associated webflow product, skipped");
//         continue;
//     }
//
//     const newPrintfulVariants: DeepPartial<Printful.Products.SyncVariant>[] = [];
//     for (const printfulVariant of fullPrintfulProduct.sync_variants) {
//         console.log(printfulVariant.name);
//         const associatedWebflowSku = existingWebflowProduct.skus
//             .find(sku => sku.fieldData["sku-values"]?.["color"] === SyncService.findColorInProductName(printfulVariant.name) &&
//                 sku.fieldData["sku-values"]?.["size"] === printfulVariant.size);
//         if (associatedWebflowSku) {
//             console.log('Found associated webflow sku: ' + associatedWebflowSku.fieldData.name);
//             newPrintfulVariants.push({
//                 "id": printfulVariant.id,                       // printful variant id
//                 "external_id": String(associatedWebflowSku.id), // webflow variant id
//             });
//         }
//         else {
//             console.log("Could not get associated webflow sku");
//         }
//     }
//
//     if (!newPrintfulVariants.length) {
//         console.log("No new printful variants, skipped");
//         continue;
//     }
//
//     await sleep(3000);
//     try {
//         await PrintfulService.Products.update(printfulProduct.id, {
//             "sync_product": {
//                 "id": printfulProduct.id,
//                 "external_id": existingWebflowProduct.product.id + "-" + SyncService.findColorInProductName(printfulProduct.name)
//             },
//             "sync_variants": newPrintfulVariants
//         });
//     } catch (err) {
//         if (err instanceof FetchError) {
//             console.error(err.message, err.payload);
//         }
//     }
// }
// console.log("DONE");

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
//
//
// const skuId = "68d080a5d90e8263e52242e9";
//
// const colors = ["Black", "White", "Red"];

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
