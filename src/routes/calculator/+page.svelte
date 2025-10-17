<script lang="ts">
	import {
		Standards,
		type ActivityStandards,
		type Metrics,
		type StandardsConfig,
	} from "$lib/services/calculator/main";
	import allStandardsRaw from "$lib/data/standards.json" assert { type: "json" };
	import { Activity, Gender, lbToKg } from "$lib/services/calculator/util";
	import StandardsTable from "$lib/components/StandardsTable.svelte";
	import PlayersTable from "$lib/components/PlayersTable.svelte";

	let activeTab = $state("standards");

	let input = $state({
		activity: Activity.BenchPress,
		metrics: {
			gender: Gender.Male,
			age: "",
			weight: "",
		},
		cfg: {
			global: {
				maxLevel: "100",
			},
			activity: Object.fromEntries(
				Object.values(Activity).map((activity) => [
					activity,
					{
						enableGeneration: true,
						weightModfier: ".1",
						weightSkew: "0",
						ageModifier: ".1",
					},
				]),
			),
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
			global: {
				maxLevel: +input.cfg.global.maxLevel,
			},
			activity: Object.fromEntries(
				Object.values(Activity).map((activity) => [
					activity,
					{
						weightModifier:
							+input.cfg.activity[activity].weightModfier,
						weightSkew: +input.cfg.activity[activity].weightSkew,
						ageModifier: +input.cfg.activity[activity].ageModifier,
						disableGeneration:
							!input.cfg.activity[activity].enableGeneration,
					},
				]),
			),
		} as StandardsConfig,
	});

	const allStandards = $derived(
		new Standards(allStandardsRaw as ActivityStandards, selected.cfg),
	);

	$effect(() => {
		console.log(selected);
		if (!input.metrics.age) input.metrics.weight = "";
	});

	$effect(() => {
		const savedParameters = localStorage.getItem("parameters");
		if (savedParameters) input = JSON.parse(savedParameters);
	});

	$effect(() => {
		localStorage.setItem("parameters", JSON.stringify(input));
	});
</script>

<section class="w-full flex justify-between gap-2 pt-10 items-center">
	<fieldset class="fieldset bg-base-200 p-6 max-w-lg">
		<legend class="fieldset-legend text-lg font-semibold"> Data </legend>

		<div class="flex gap-4">
			<fieldset class="fieldset bg-base-300 p-3 max-w-xl">
				<legend class="fieldset-legend text-sm font-semibold">
					General
				</legend>

				<div class="grid grid-cols-1 gap-4">
					<label>
						<span class="label mb-1">Max level</span>
						<input
							class="input w-full"
							type="number"
							min="1"
							max="100"
							placeholder="5"
							bind:value={input.cfg.global.maxLevel}
						/>
					</label>
				</div>
			</fieldset>

			<fieldset class="fieldset bg-base-300 p-3 max-w-3xs">
				<legend class="fieldset-legend text-sm font-semibold">
					Data Generation
				</legend>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label class="label">
						<input
							type="checkbox"
							bind:checked={
								input.cfg.activity[selected.activity]
									.enableGeneration
							}
							class="toggle toggle-lg m-auto"
						/>
					</label>
					<label>
						<span class="label mb-1">Weight modifier</span>
						<input
							class="input w-full"
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={
								input.cfg.activity[selected.activity]
									.weightModfier
							}
							disabled={selected.cfg.activity[selected.activity]
								.disableGeneration}
						/>
					</label>
					<label>
						<span class="label mb-1">Weight skew</span>
						<input
							class="input w-full"
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={
								input.cfg.activity[selected.activity].weightSkew
							}
							disabled={selected.cfg.activity[selected.activity]
								.disableGeneration}
						/>
					</label>
					<label>
						<span class="label mb-1">Age modifier</span>
						<input
							class="input w-full"
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={
								input.cfg.activity[selected.activity]
									.ageModifier
							}
							disabled={selected.cfg.activity[selected.activity]
								.disableGeneration}
						/>
					</label>
				</div>
			</fieldset>
		</div>
	</fieldset>

	{#if activeTab === "standards"}
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
	{/if}
</section>

<div class="divider"></div>

<div role="tablist" class="tabs tabs-border">
	<button
		role="tab"
		class="tab"
		class:tab-active={activeTab === "standards"}
		onclick={() => (activeTab = "standards")}
	>
		Standards
	</button>

	<button
		role="tab"
		class="tab"
		class:tab-active={activeTab === "players"}
		onclick={() => (activeTab = "players")}
	>
		Players
	</button>
</div>

{#if activeTab === "standards"}
	<StandardsTable {selected} {allStandards} />
{/if}

{#if activeTab === "players"}
	<PlayersTable {allStandards} />
{/if}
