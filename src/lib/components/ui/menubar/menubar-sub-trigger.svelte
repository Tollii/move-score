<script lang="ts">
	import { Menubar as MenubarPrimitive } from 'bits-ui';
	import { cn, type WithoutChild } from '$lib/utils.js';
	import CaretRightIcon from 'phosphor-svelte/lib/CaretRight';

	let {
		ref = $bindable(null),
		class: className,
		inset = undefined,
		children,
		...restProps
	}: WithoutChild<MenubarPrimitive.SubTriggerProps> & {
		inset?: boolean;
	} = $props();
</script>

<MenubarPrimitive.SubTrigger
	bind:ref
	data-slot="menubar-sub-trigger"
	data-inset={inset}
	class={cn(
		"focus:bg-accent data-open:bg-accent flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none focus:text-accent-foreground data-inset:pl-7 data-open:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<CaretRightIcon class="cn-rtl-flip ml-auto size-4" />
</MenubarPrimitive.SubTrigger>
