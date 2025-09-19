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

<div id="activityTables">
	<div class="activity-section">
		<div class="toolbar">
			<fieldset class="group">
				<legend>Metrics</legend>
				<label class="field">
					<span>Activity</span>
					<select
						class="select"
						name="activities"
						bind:value={input.activity}
					>
						{#each Object.values(Activity) as activity}
							<option value={activity}
								>{allStandards
									.byActivity(activity)
									.getMetadata().name}</option
							>
						{/each}
					</select>
				</label>

				<label class="field">
					<span>Gender</span>
					<select
						class="select"
						name="genders"
						bind:value={input.metrics.gender}
					>
						{#each Object.values(Gender) as gender}
							<option value={gender}>{gender}</option>
						{/each}
					</select>
				</label>

				<label class="field w-20">
					<span>Age</span>
					<input
						type="number"
						min="0"
						max="100"
						placeholder="18"
						bind:value={input.metrics.age}
					/>
				</label>

				<label class="field w-24">
					<span>Weight (lb)</span>
					{#if selected.metrics.age}
						<input
							type="number"
							min="0"
							max="600"
							placeholder="170"
							bind:value={input.metrics.weight}
						/>
					{:else}
						<p style="margin: 0;">Requires age</p>
					{/if}
				</label>
			</fieldset>

			<fieldset class="group">
				<legend>Parameters</legend>

				<fieldset class="group">
					<legend>General</legend>
					<label class="field parameter">
						<span>Max level</span>
						<input
							type="number"
							min="1"
							max="100"
							placeholder="5"
							bind:value={input.cfg.maxLevel}
						/>
					</label>
				</fieldset>

				<fieldset class="group">
					<legend>Data generation</legend>
					<label class="field parameter">
						<span>Weight modifier</span>
						<input
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={input.cfg.weightModfier}
						/>
					</label>
					<label class="field parameter">
						<span>Weight skew</span>
						<input
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={input.cfg.weightSkew}
						/>
					</label>
					<label class="field parameter">
						<span>Age modifier</span>
						<input
							type="number"
							min="0"
							max="1"
							step=".05"
							placeholder=".1"
							bind:value={input.cfg.ageModifier}
						/>
					</label>
				</fieldset>
			</fieldset>
		</div>

		<h1>{allStandards.byActivity(selected.activity).getMetadata().name}</h1>
		{#if allStandards
			.byActivity(selected.activity)
			.getMetadata().generators.length}
			<p class="description">
				(Generated data: {allStandards
					.byActivity(selected.activity)
					.getMetadata()
					.generators.map((g) => g.metric)
					.join(", ")})
			</p>
		{:else}
			<p class="description">(Generated data: NONE)</p>
		{/if}

		<section class="gender-section">
			<h2>{selected.metrics.gender}</h2>
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
</div>

{#snippet standardsTable(activity: Activity, metrics: Metrics)}
	{#snippet standardsTableRow(standard: Standard)}
		<tr>
			<th scope="row"
				>{parseFloat(kgToLb(standard.metrics.weight).toFixed(2))}</th
			>
			{#each range(selected.cfg.maxLevel) as lvl}
				<td>{getLvlValue(activity, standard, lvl)}</td>
			{/each}
		</tr>
	{/snippet}
	<div class="age-section">
		<h3>{metrics.age}</h3>
		<div class="standards-table">
			<div class="scroll">
				<table>
					<thead>
						<tr>
							<th class="levels-th">Body weight</th>
							{#each range(selected.cfg.maxLevel) as lvl}
								<th class="levels-th">{lvl}</th>
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
	</div>
{/snippet}

<style>
	#activityTables {
		max-width: 1600px;
		margin: 24px auto;
		padding: 0 16px;
	}

	h1,
	h2,
	h3 {
		line-height: 1.2;
		margin: 0 0 8px;
		color: var(--accent);
	}

	h1 {
		font-size: 1.4rem;
		margin-top: 24px;
	}

	h2 {
		font-size: 1.1rem;
		margin-top: 16px;
	}

	h3 {
		font-size: 1rem;
		color: var(--muted);
		font-weight: 600;
	}

	p {
		font-size: 0.8rem;
		color: var(--muted);
	}

	/* Toolbar container */
	.toolbar {
		display: grid;
		grid-template-columns: 1fr auto; /* metrics | params */
		gap: 16px;
		align-items: start;
	}

	/* Stack groups on small screens */
	@media (max-width: 840px) {
		.toolbar {
			grid-template-columns: 1fr;
		}
	}

	/* Group card */
	.group {
		margin: 0;
		padding: 12px;
		border: 1px solid var(--border);
		background: var(--card);
		display: flex;
		flex-wrap: wrap;
		gap: 12px 16px;
	}

	/* Group title */
	.group > legend {
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
		padding: 0 6px;
	}

	/* Field (label+control) */
	.field {
		display: grid;
		grid-template-rows: auto auto;
		gap: 6px;
		min-width: 160px;
	}

	.parameter {
		min-width: 100px;
		max-width: 100px;
	}

	/* Label text */
	.field > span {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	/* Inputs/selects inherit your existing styles.
   If you used the "select-as-title" style, keep it;
   otherwise add a minimal baseline here: */
	.field input[type="number"],
	.field .select {
		font-size: 1rem;
		color: var(--fg);
		background: transparent;
		border: none;
		border-bottom: 2px solid var(--border);
		padding: 6px 0;
		outline: none;
	}

	/* Focus */
	.field input[type="number"]:focus,
	.field .select:focus {
		border-bottom-color: var(--accent);
	}

	/* Width helpers */
	.w-20 {
		width: 8rem;
	} /* ~128px */
	.w-24 {
		width: 10rem;
	} /* ~160px */

	.activity-section {
		padding: 16px;
		margin: 16px 0;
		background: var(--card);
		border: 1px solid var(--border);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
	}

	.gender-section {
		margin-top: 8px;
	}

	.age-section {
		margin: 12px 0 20px;
	}

	.standards-table {
		margin-top: 8px;
		border: 1px solid var(--border);
		overflow: hidden;
	}

	/* Horizontal scroll wrapper for very wide tables */
	.standards-table > .scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	/* Table */
	.standards-table table {
		width: max-content;
		/* prevents squish; enables horizontal scroll */
		min-width: 100%;
		/* fill container if not too wide */
		border-collapse: separate;
		border-spacing: 0;
		font-variant-numeric: tabular-nums;
	}

	.standards-table th,
	.standards-table td {
		padding: 6px 10px;
		border-bottom: 1px solid var(--border);
		border-right: 1px solid var(--border);
		text-align: center;
		white-space: nowrap;
	}

	.standards-table th:first-child,
	.standards-table td:first-child {
		border-left: 1px solid var(--border);
	}

	/* Header row */
	.standards-table thead th {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--bg);
		font-weight: 700;
	}

	.standards-table thead th:first-child {
		left: 0;
		z-index: 3;
	}

	/* Row header (first column) */
	.standards-table tbody th[scope="row"],
	.standards-table tbody td:first-child {
		position: sticky;
		left: 0;
		background: var(--card);
		text-align: left;
		font-weight: 600;
	}

	.standards-table tbody tr:nth-child(even) td {
		background: rgba(0, 0, 0, 0.02);
	}

	.standards-table tbody tr:hover td {
		background: rgba(0, 128, 255, 0.06);
	}

	/* Compact header for the “levels” row */
	.levels-th {
		font-size: 12px;
		color: var(--muted);
	}
</style>
