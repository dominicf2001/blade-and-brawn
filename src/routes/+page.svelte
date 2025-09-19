<script lang="ts">
	import {
		Standards,
		type ActivityStandards,
		type Standard,
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

	const selected = $state({
		activity: Activity.BenchPress,
		gender: Gender.Male,
		age: 18,
		weight: 0,
		maxLevel: 5,
	});

	const allStandards = $derived(
		new Standards(allStandardsRaw as ActivityStandards, {
			maxLevel: selected.maxLevel,
		}),
	);

	const getFormattedLevelValue = (
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
						bind:value={selected.activity}
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
						bind:value={selected.gender}
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
						bind:value={selected.age}
					/>
				</label>

				<label class="field w-24">
					<span>Weight (lb)</span>
					<input
						type="number"
						min="0"
						max="600"
						placeholder="170"
						bind:value={selected.weight}
					/>
				</label>
			</fieldset>

			<fieldset class="group">
				<legend>Parameters</legend>

				<label class="field w-24">
					<span>Max level</span>
					<input
						type="number"
						min="1"
						max="100"
						placeholder="5"
						bind:value={selected.maxLevel}
					/>
				</label>
			</fieldset>
		</div>

		{#if !selected.gender || !selected.age}
			<p>Not enough info entered</p>
		{:else}
			{@render standardsTable(
				selected.gender,
				selected.age,
				selected.weight,
			)}
		{/if}
	</div>
</div>

{#snippet standardsTable(gender: Gender, age: number, weight: number)}
	<section class="gender-section">
		<div class="age-section">
			<div class="standards-table">
				<div class="scroll">
					<table>
						<thead>
							<tr>
								<th class="levels-th">Body weight</th>
								{#each range(selected.maxLevel) as lvl}
									<th class="levels-th">{lvl}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#if weight}
								{@const standard = allStandards
									.byActivity(selected.activity)
									.byGender(gender)
									.byAge(age)
									.byWeight(lbToKg(weight))
									.getOneInterpolated()}

								<tr>
									<th scope="row"
										>{Math.round(
											kgToLb(standard.metrics.weight),
										)}</th
									>
									{#each range(selected.maxLevel) as lvl}
										<td
											>{getFormattedLevelValue(
												selected.activity,
												standard,
												lvl,
											)}</td
										>
									{/each}
								</tr>
							{:else}
								{@const standards = allStandards
									.byActivity(selected.activity)
									.byGender(gender)
									.byAge(age)
									.getAllInterpolated()}
								{#each standards as standard}
									<tr>
										<th scope="row"
											>{Math.round(
												kgToLb(standard.metrics.weight),
											)}</th
										>
										{#each range(allStandards.cfg.maxLevel) as lvl}
											<td
												>{getFormattedLevelValue(
													selected.activity,
													standard,
													lvl,
												)}</td
											>
										{/each}
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>
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
