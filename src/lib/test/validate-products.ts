import PrintfulService from "$lib/services/commerce/printful";
import SyncService from "$lib/services/commerce/sync";
import WebflowService from "$lib/services/commerce/webflow";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Validation = {
    isValid: boolean,
    message: string
}

const validateEquality = (wValue: any, pValue: any): Validation => {
    const validation = {
        isValid: true,
        message: "Valid",
    };

    if (wValue !== pValue) {
        validation.isValid = false;
        validation.message = `${wValue} !== ${pValue}`
    };

    return validation;
}


const wProducts = await WebflowService.Products.getAll();

let invalidCount = 0;
for (const wProduct of wProducts) {
    for (const sku of wProduct.skus ?? []) {
        console.log("Webflow: " + sku.id, sku.fieldData.name);

        const pVariant = await PrintfulService.Products.Variants.get(`@${sku.id}`);
        if (pVariant) {
            console.log("Printful: " + pVariant.id, pVariant.name);
            const validations = [
                // validateEquality(sku.fieldData.name, pVariant.name),
                validateEquality(sku.fieldData["sku-values"]?.["color"], SyncService.findColorInProductName(pVariant.name)),
                validateEquality(sku.fieldData["sku-values"]?.["size"], pVariant.size),
                validateEquality(sku.fieldData.price.value, Math.floor(+pVariant.retail_price * 100)),
            ];

            // if (!validateEquality(sku.fieldData.name, pVariant.name).isValid) {
            //     sku.fieldData.name = pVariant.name;
            //     await WebflowService.Products.Skus.update(wProduct.product.id, sku.id, sku);
            // }

            const errors = validations.filter(v => !v.isValid);
            if (errors.length) {
                ++invalidCount;
                console.log("INVALID: ");
                console.log(errors.map(e => e.message).join(", "));
            }
            else {
                console.log("VALID");
            }
        }
        else {
            ++invalidCount;
            console.log("INVALID");
            console.log("Not found");
        }
        console.log();
    }
    await sleep(3000);
}

console.log("INVALID COUNT: " + invalidCount);
