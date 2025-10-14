<script lang="ts">
	import {
		LevelCalculator,
		type LevelCalculatorOutput,
		type Standards,
	} from "$lib/services/calculator/main";
	import {
		Activity,
		Attribute,
		Gender,
		lbToKg,
		type ActivityPerformance,
		type Player,
	} from "$lib/services/calculator/util";

	interface CalcData {
		levels?: LevelCalculatorOutput;
		player: Player;
		activityPerformances: ActivityPerformance[];
	}

	interface Props {
		allStandards: Standards;
	}

	const { allStandards }: Props = $props();

	const levelCalculator = $derived(new LevelCalculator(allStandards));

	let calculations = $state([] as CalcData[]);

	$effect(() => {
		for (const calculation of calculations) {
			calculation.levels = levelCalculator.calculate(
				calculation.player,
				calculation.activityPerformances,
			);
		}
	});

	$effect(() => {
		const savedCalcs = localStorage.getItem("calculations");
		if (savedCalcs) calculations = JSON.parse(savedCalcs);
	});

	$effect(() => {
		localStorage.setItem("calculations", JSON.stringify(calculations));
	});

	const createCalculation = function (name: string) {
		return {
			player: {
				name: name,
				metrics: {
					age: 18,
					weight: 180,
					gender: Gender.Male,
				},
			},
			activityPerformances: Object.values(Activity).map((a) => ({
				activity: a,
				performance: 0,
			})),
		};
	};

	function downloadObject(obj: unknown, filename = "data.json") {
		const json = JSON.stringify(obj, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();

		a.remove();
		URL.revokeObjectURL(url);
	}

	const formatMs = (ms: number) => {
		const total = Math.floor(ms / 1000);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}m ${s}s`;
	};
	const inchesToFeetInches = (inches: number) => {
		const ft = Math.floor(inches / 12);
		const rem = inches - ft * 12;
		const whole = Math.floor(rem);
		const isHalf = Math.abs(rem - whole - 0.5) < 1e-9;
		const inchLabel = isHalf ? `${whole}½` : `${whole}`;
		return `${ft}' ${inchLabel}"`;
	};

	const formatSeconds = (ms: number) => (ms / 1000).toFixed(2) + " seconds";

	const performanceOptionsFromActivity = function (activity: Activity) {
		const options: { name: string; value: string }[] = [];
		switch (activity) {
			case Activity.BackSquat:
			case Activity.Deadlift:
			case Activity.BenchPress:
				for (let i = 0; i < 600; ++i) {
					options.push({
						name: String(i) + " lb",
						value: String(lbToKg(i)),
					});
				}
				break;

			case Activity.Run: {
				const MAX_MIN = 30;
				for (let ms = 0; ms <= MAX_MIN * 60_000; ms += 1_000) {
					options.push({ name: formatMs(ms), value: String(ms) });
				}
				break;
			}

			case Activity.BroadJump: {
				const MAX_INCHES = 15 * 12 + 5;
				for (let halfStep = 0; halfStep <= MAX_INCHES * 2; halfStep++) {
					const inches = halfStep / 2;
					options.push({
						name: inchesToFeetInches(inches),
						value: (inches * 2.54).toFixed(1),
					});
				}
				break;
			}

			case Activity.ConeDrill: {
				const MIN_MS = 5_000;
				const MAX_MS = 20_000;
				for (let ms = MIN_MS; ms <= MAX_MS; ms += 10) {
					options.push({
						name: formatSeconds(ms),
						value: String(ms),
					});
				}
				break;
			}
		}
		return options;
	};
</script>

<div class="mt-5 mb-5 flex w-full">
	<div class="ml-auto">
		<button
			onclick={() =>
				calculations.push(
					createCalculation(String(calculations.length)),
				)}
			class="btn btn-primary">New</button
		>
		<button
			onclick={() => downloadObject(calculations)}
			class="btn btn-secondary">Export</button
		>
	</div>
</div>

<section
	class="w-full px-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
>
	{#each calculations as calculation, index}
		<div
			class="card card-compact bg-base-200 p-4 shadow-lg max-w-sm w-full"
		>
			<div class="card-body gap-4 p-4">
				<input
					class="input input-bordered input-sm w-full"
					type="text"
					bind:value={calculation.player.name}
					placeholder="Player name"
				/>

				<ul
					class="bg-base-100 rounded-box shadow-xs divide-y divide-base-300"
				>
					<li class="p-3">
						<div class="flex items-center justify-between">
							<div class="font-semibold text-sm">OVERALL</div>
							<div class="badge badge-neutral badge-xs">
								{calculation?.levels?.player || "N/A"}
							</div>
						</div>
					</li>

					{#each Object.values(Attribute) as attribute}
						<li class="p-3">
							<div class="flex items-center justify-between">
								<div class="opacity-80 text-sm">
									{attribute}
								</div>
								<div class="badge badge-ghost badge-xs">
									{calculation?.levels?.attributes?.[
										attribute
									] || "N/A"}
								</div>
							</div>
						</li>
					{/each}
				</ul>

				<fieldset
					class="fieldset bg-base-200/60 rounded-lg"
					onchange={() =>
						(calculation.levels = levelCalculator.calculate(
							calculation.player,
							calculation.activityPerformances,
						))}
				>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
						<label class="form-control">
							<span class="label mb-1 text-xs">Gender</span>
							<select
								class="select select-bordered select-sm w-full"
								bind:value={calculation.player.metrics.gender}
							>
								{#each Object.values(Gender) as gender}
									<option value={gender}>{gender}</option>
								{/each}
							</select>
						</label>

						<label class="form-control">
							<span class="label mb-1 text-xs">Age</span>
							<input
								class="input input-bordered input-sm w-full"
								type="number"
								min="1"
								max="100"
								step="1"
								bind:value={calculation.player.metrics.age}
							/>
						</label>

						<label class="form-control">
							<span class="label mb-1 text-xs">Weight</span>
							<input
								class="input input-bordered input-sm w-full"
								type="number"
								min="1"
								max="500"
								step="1"
								bind:value={calculation.player.metrics.weight}
							/>
						</label>
					</div>
				</fieldset>

				<fieldset
					class="fieldset bg-base-200/60 rounded-lg"
					onchange={() =>
						(calculation.levels = levelCalculator.calculate(
							calculation.player,
							calculation.activityPerformances,
						))}
				>
					<div class="grid grid-cols-2 gap-3">
						{#each calculation.activityPerformances as activityPerformance}
							<label class="form-control space-y-1">
								<span class="label mb-1 text-xs">
									{activityPerformance.activity}
								</span>
								<select
									class="select select-bordered select-sm w-full"
									bind:value={activityPerformance.performance}
								>
									{#each performanceOptionsFromActivity(activityPerformance.activity) as option}
										<option value={option.value}
											>{option.name}</option
										>
									{/each}
								</select>
							</label>
						{/each}
					</div>
				</fieldset>
			</div>
			<button
				onclick={() =>
					confirm(`Delete ${calculation.player.name}?`) &&
					calculations.splice(index, 1)}
				class="btn btn-error btn-sm w-1/4">Delete</button
			>
		</div>
	{/each}
</section>
