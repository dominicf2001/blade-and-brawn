<script lang="ts">
	import { page } from "$app/state";
	import favicon from "$lib/assets/favicon.svg";
	import "../app.css";

	const links = [
		{ name: "Standards", path: "/standards" },
		{ name: "Commerce", path: "/commerce" },
	];

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="drawer lg:drawer-open">
	<input id="sidebar" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content p-10 flex flex-col items-center">
		{@render children?.()}
		<label for="sidebar" class="btn btn-primary drawer-button lg:hidden">
			Open drawer
		</label>
	</div>
	<div class="drawer-side">
		<label for="sidebar" aria-label="close sidebar" class="drawer-overlay"
		></label>
		<ul
			class="menu menu-lg bg-base-200 text-base-content min-h-full w-72 p-4"
		>
			{#each links as link}
				<li>
					<a
						class={{
							"menu-active": page.url.pathname === link.path,
						}}
						href={link.path}>{link.name}</a
					>
				</li>
			{/each}
		</ul>
	</div>
</div>
