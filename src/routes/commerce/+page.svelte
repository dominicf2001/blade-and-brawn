<script lang="ts">
	import { api } from "$lib/api.js";
	import type { Printful } from "$lib/services/commerce/util/types.js";
	import { onMount } from "svelte";

	const { data } = $props();

	const synchronizer = $state({
		isSyncing: false,
		syncingIds: [] as number[],
		poll: async function () {
			const res = await api.products.sync.get();
			if (res.data) {
				synchronizer.isSyncing = res.data.isSyncing ?? false;
				synchronizer.syncingIds = res.data.syncingIds ?? [];
			}
		},
		startPolling: () => {
			const intervalId = setInterval(async () => {
				await synchronizer.poll();
				if (!synchronizer.isSyncing) clearInterval(intervalId);
			}, 100);
		},
		syncAll: async () => {
			synchronizer.startPolling();
			await api.products.sync.post();
		},
		sync: async (printfulProductId: number) => {
			synchronizer.startPolling();
			await api.products.sync({ printfulProductId }).post();
		},
	});

	onMount(async () => {
		await synchronizer.poll();
		if (synchronizer.isSyncing) {
			synchronizer.startPolling();
		}
	});

	const isProductSynced = async (
		printfulProduct: Printful.Products.SyncProduct,
	) => {
		const webflowProducts = await data.products.webflow;
		return webflowProducts.some(
			(p) => p.product.id === printfulProduct.external_id.split("-")[0],
		);
	};
</script>

{#await data.products.printful}
	<p>Loading...</p>
{:then printfulProducts}
	<button
		disabled={synchronizer.isSyncing}
		onclick={() => synchronizer.syncAll()}
		class="btn btn-xl mb-5"
	>
		{#if synchronizer.isSyncing}
			Syncing...
		{:else}
			Sync all
		{/if}
	</button>
	<div class="w-full overflow-x-auto">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Status</th>
					<th>Sync</th>
				</tr>
			</thead>
			<tbody>
				{#each printfulProducts as printfulProduct}
					<tr class="hover:bg-base-300">
						<td
							><button
								onclick={async () => {
									const productData = await api
										.products({
											printfulProductId:
												printfulProduct.id,
										})
										.get();
									console.log(
										await productData.response.json(),
									);
								}}
								class="cursor-pointer underline"
							>
								{printfulProduct.name}
							</button></td
						>
						<td>
							{#await isProductSynced(printfulProduct) then isSynced}
								{#if synchronizer.syncingIds.includes(printfulProduct.id)}
									<div class="badge badge-warning">
										Syncing...
									</div>
								{:else if isSynced}
									<div class="badge badge-success">
										Synced
									</div>
								{:else}
									<div class="badge badge-error">
										Desynced
									</div>
								{/if}
							{/await}
						</td>
						<td>
							<button
								disabled={synchronizer.isSyncing}
								onclick={() =>
									synchronizer.sync(printfulProduct.id)}
								class="btn"
							>
								Sync
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:catch error}
	<p>Something went wrong: {error.message}</p>
{/await}
