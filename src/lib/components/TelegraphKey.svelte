<script lang="ts">
	import type { KeyState } from '$lib/morse/key.svelte';

	type Props = { state: KeyState; label?: string };
	let { state, label }: Props = $props();

	function down(e: PointerEvent) {
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		state.press();
	}
	function up(e: PointerEvent) {
		e.preventDefault();
		state.release();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.repeat) return;
		if (e.code === 'Space') {
			e.preventDefault();
			state.press();
		}
	}
	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			state.release();
		}
	}
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />

<button
	type="button"
	class="key"
	class:is-active={state.isDown}
	onpointerdown={down}
	onpointerup={up}
	onpointercancel={up}
	onpointerleave={up}
	aria-label={label ?? 'telegraph key'}
>
	<span class="pointer-events-none">{label ?? 'TAP'}</span>
</button>
