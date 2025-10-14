<script lang="ts">
	import type {
		Metrics,
		Standard,
		Standards,
		StandardsConfig,
	} from "$lib/services/calculator/main";
	import {
		Activity,
		cmToIn,
		kgToLb,
		msToTime,
		range,
	} from "$lib/services/calculator/util";

	interface Props {
		allStandards: Standards;
		selected: {
			activity: Activity;
			metrics: Metrics;
			cfg: StandardsConfig;
		};
	}

	const { selected, allStandards }: Props = $props();

	const getLvlValue = (
		activity: Activity,
		standard: Standard,
		lvl: number,
	): string => {
		const rawValue = standard.levels[lvl];
		const unit = allStandards.byActivity(activity).getMetadata().unit;
		switch (unit) {
			case "ms":
				return msToTime(rawValue, activity === Activity.ConeDrill);
			case "cm": {
				return String(Math.round(cmToIn(rawValue) * 10) / 10);
			}
			case "kg":
				return String(Math.round(kgToLb(rawValue)));
			default:
				return "";
		}
	};
</script>

<section class="w-full">
	<div>
		<div class="flex items-center">
			<p class="text-xs label">
				{#if !selected.cfg.disableGeneration && allStandards
						.byActivity(selected.activity)
						.getMetadata().generators.length}
					(Generated data: {allStandards
						.byActivity(selected.activity)
						.getMetadata()
						.generators.map((g) => g.metric)
						.join(", ")})
				{:else}
					(Generated data: NONE)
				{/if}
			</p>
		</div>
	</div>

	{#if !selected.metrics.age}
		{#each allStandards.agesFor(selected.activity, selected.metrics.gender) as age}
			{@render standardsTable(selected.activity, {
				...selected.metrics,
				age,
			})}
		{/each}
	{:else}
		{@render standardsTable(selected.activity, selected.metrics)}
	{/if}
</section>

{#snippet standardsTable(activity: Activity, metrics: Metrics)}
	{#snippet standardsTableRow(standard: Standard)}
		<tr class="hover:bg-base-300">
			<th>
				{standard.metrics.weight
					? parseFloat(kgToLb(standard.metrics.weight).toFixed(2))
					: "None"}</th
			>
			{#each range(selected.cfg.maxLevel) as lvl}
				<td>{getLvlValue(activity, standard, lvl)}</td>
			{/each}
		</tr>
	{/snippet}
	<div class="mt-5">
		<h3 class="text-lg italic font-semibold">{metrics.age}</h3>
		<div class="overflow-x-auto">
			<table class="table table-zebra table-pin-cols">
				<thead>
					<tr>
						<th>Body weight</th>
						{#each range(selected.cfg.maxLevel) as lvl}
							<td>{lvl}</td>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#if metrics.weight}
						{@const standard = allStandards
							.byActivity(activity)
							.byGender(metrics.gender)
							.byAge(metrics.age)
							.byWeight(metrics.weight)
							.getOneInterpolated()}
						{@render standardsTableRow(standard)}
					{:else}
						{@const standards = allStandards
							.byActivity(activity)
							.byGender(metrics.gender)
							.byAge(metrics.age)
							.getAllInterpolated({ normalizeForLb: true })}
						{#each standards as standard}
							{@render standardsTableRow(standard)}
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
{/snippet}
