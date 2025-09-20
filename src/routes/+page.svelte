<script lang="ts">
	import {
		Standards,
		type ActivityStandards,
		type Metrics,
		type Standard,
		type StandardsConfig,
	} from "$lib/services/calculator/main";
	import allStandardsRaw from "$lib/data/standards.json" assert { type: "json" };
	import {
		Activity,
		cmToIn,
		Gender,
		kgToLb,
		lbToKg,
		msToTime,
		range,
	} from "$lib/services/calculator/util";

	const input = $state({
		activity: Activity.BenchPress,
		metrics: {
			gender: Gender.Male,
			age: "",
			weight: "",
		},
		cfg: {
			maxLevel: "5",
			weightModfier: ".1",
			weightSkew: ".4",
			ageModifier: ".1",
		},
	});

	const selected = $derived({
		activity: input.activity,
		metrics: {
			gender: input.metrics.gender,
			age: +input.metrics.age,
			weight: lbToKg(+input.metrics.weight),
		} as Metrics,
		cfg: {
			maxLevel: +input.cfg.maxLevel,
			weightModifier: +input.cfg.weightModfier,
			weightSkew: +input.cfg.weightSkew,
			ageModifier: +input.cfg.ageModifier,
		} as StandardsConfig,
	});

	$effect(() => {
		if (!input.metrics.age) input.metrics.weight = "";
	});

	const allStandards = $derived(
		new Standards(allStandardsRaw as ActivityStandards, selected.cfg),
	);

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

<div class="container m-auto">
	<section
		class="w-full flex flex-col md:flex-row justify-between gap-2 pt-10"
	>
		<fieldset class="fieldset bg-base-200 p-6 max-w-lg">
			<legend class="fieldset-legend text-lg font-semibold">
				Metrics
			</legend>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<label>
					<span class="label mb-1">Activity</span>
					<select
						class="select w-full"
						name="activities"
						bind:value={input.activity}
					>
						{#each Object.values(Activity) as activity}
							<option value={activity}>
								{allStandards.byActivity(activity).getMetadata()
									.name}
							</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="label mb-1">Gender</span>
					<select
						class="select w-full"
						name="genders"
						bind:value={input.metrics.gender}
					>
						{#each Object.values(Gender) as gender}
							<option value={gender}>{gender}</option>
						{/each}
					</select>
				</label>

				<label>
					<span class="label mb-1">Age</span>
					<input
						class="input w-full"
						type="number"
						min="0"
						max="100"
						placeholder="18"
						bind:value={input.metrics.age}
					/>
				</label>

				<label>
					<span class="label mb-1">Weight (lb)</span>
					<input
						class="input w-full"
						type="number"
						min="0"
						max="600"
						placeholder={selected.metrics.age
							? "170"
							: "Requires age"}
						bind:value={input.metrics.weight}
						disabled={!selected.metrics.age}
					/>
				</label>
			</div>
		</fieldset>

		<fieldset class="fieldset bg-base-200 p-6 max-w-lg">
			<legend class="fieldset-legend text-lg font-semibold">
				Parameters
			</legend>

			<fieldset class="fieldset bg-base-250 p-3 max-w-xl">
				<legend class="fieldset-legend text-sm font-semibold">
					General
				</legend>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label>
						<span class="label mb-1">Max level</span>
						<input
							class="input"
							type="number"
							min="1"
							max="100"
							placeholder="5"
							bind:value={input.cfg.maxLevel}
						/>
					</label>
				</div>
			</fieldset>

			<fieldset class="fieldset bg-base-300 p-3 max-w-xl">
				<legend class="fieldset-legend text-sm font-semibold">
					Data Generation
				</legend>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label>
						<span class="label mb-1">Weight modifier</span>
						<input
							class="input"
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={input.cfg.weightModfier}
						/>
					</label>
					<label>
						<span class="label mb-1">Weight skew</span>
						<input
							class="input"
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={input.cfg.weightSkew}
						/>
					</label>
					<label>
						<span class="label mb-1">Age modifier</span>
						<input
							class="input"
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={input.cfg.ageModifier}
						/>
					</label>
				</div>
			</fieldset>
		</fieldset>
	</section>

	<div class="divider"></div>

	<section>
		<div>
			<h1 class="text-2xl font-bold mb-2.5">
				{allStandards.byActivity(selected.activity).getMetadata().name}
			</h1>
			<div class="flex items-center">
				<h2 class="text-xl">{selected.metrics.gender}</h2>
				<p class="text-xs label ml-2.5">
					{#if allStandards
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
</div>

{#snippet standardsTable(activity: Activity, metrics: Metrics)}
	{#snippet standardsTableRow(standard: Standard)}
		<tr class="hover:bg-base-300">
			<th>{parseFloat(kgToLb(standard.metrics.weight).toFixed(2))}</th>
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
