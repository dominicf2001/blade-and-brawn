<script lang="ts">
	import { Printful } from "$lib/services/commerce/printful";

	const { data } = $props();

	let isSyncing = $state(false);

	const isPrintfulProductSynced = async (
		printfulProduct: Printful.Products.SyncProduct,
	) => {
		const webflowProducts = await data.products.webflow;
		return webflowProducts.some(
			(p) => p.product.id === printfulProduct.external_id,
		);
	};

	const syncProducts = async () => {
		isSyncing = true;
		await fetch(`http://localhost:5173/api/products/sync`, {
			method: "POST",
		});
		isSyncing = false;
	};
</script>

{#await data.products.printful}
	<p>Loading...</p>
{:then printfulProducts}
	{#if isSyncing}
		<p>Syncing...</p>
	{:else}
		<button onclick={() => syncProducts()} class="btn btn-lg">sync</button>
		<div class="w-full overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Synced</th>
					</tr>
				</thead>
				<tbody>
					{#each printfulProducts as printfulProduct}
						<tr class="hover:bg-base-300">
							<td>{printfulProduct.name}</td>
							<td>
								{#await isPrintfulProductSynced(printfulProduct) then isSynced}
									<div
										class="badge {isSynced
											? 'badge-success'
											: 'badge-error'}"
									>
										{isSynced ? "Synced" : "Desynced"}
									</div>
								{/await}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
{:catch error}
	<p>Something went wrong: {error.message}</p>
{/await}
