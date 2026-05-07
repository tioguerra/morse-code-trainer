<script lang="ts">
	import {
		TREE_NODES,
		TREE_EDGES,
		NODE_BY_PATH,
		ancestorPaths
	} from '$lib/morse/tree';
	import { isValidPrefix } from '$lib/morse/code';
	import { cw } from '$lib/audio/cw';

	type Props = {
		currentPath?: string;
		masteredPaths?: Set<string>;
		onNodeTap?: (path: string, letter: string) => void;
		playOnTap?: boolean;
		compact?: boolean;
	};
	let {
		currentPath = '',
		masteredPaths = new Set<string>(),
		onNodeTap,
		playOnTap = true,
		compact = false
	}: Props = $props();

	const litSet = $derived(new Set(currentPath ? ancestorPaths(currentPath) : []));
	const isError = $derived(currentPath !== '' && !isValidPrefix(currentPath));

	function handleTap(path: string) {
		const node = NODE_BY_PATH[path];
		if (!node?.letter) return;
		onNodeTap?.(path, node.letter);
		if (playOnTap) cw.play(path, 18);
	}

	const VB_W = 120;
	const VB_H = 80;

	type Led = {
		from: string;
		to: string;
		type: '.' | '-';
		mx: number;
		my: number;
		px: number;
		py: number;
		cx: number;
		cy: number;
		angleDeg: number;
	};

	const leds = $derived<Led[]>(
		TREE_EDGES.map((e) => {
			const a = NODE_BY_PATH[e.from];
			const b = NODE_BY_PATH[e.to];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
			return {
				from: e.from,
				to: e.to,
				type: e.type,
				px: a.x,
				py: a.y,
				cx: b.x,
				cy: b.y,
				mx: (a.x + b.x) / 2,
				my: (a.y + b.y) / 2,
				angleDeg
			};
		})
	);

	const root = $derived(NODE_BY_PATH['']);

	const DOT_R = 1.6;
	const DASH_LEN = 6.5;
	const DASH_THICK = 2.2;
	const NODE_R = 3.4;
</script>

<svg
	viewBox={`0 0 ${VB_W} ${VB_H}`}
	preserveAspectRatio="xMidYMid meet"
	class="tree"
	class:compact
	class:errored={isError}
	role="img"
	aria-label="Morse decoding tree"
>
	<g class="rails">
		{#each leds as led (led.from + '>' + led.to)}
			<line x1={led.px} y1={led.py} x2={led.cx} y2={led.cy} class="rail" />
		{/each}
	</g>

	<g class="leds">
		{#each leds as led (led.from + '>' + led.to)}
			{@const lit = litSet.has(led.to)}
			{#if led.type === '.'}
				<circle cx={led.mx} cy={led.my} r={DOT_R} class="led" class:lit />
			{:else}
				<rect
					x={led.mx - DASH_LEN / 2}
					y={led.my - DASH_THICK / 2}
					width={DASH_LEN}
					height={DASH_THICK}
					rx={DASH_THICK / 2}
					transform={`rotate(${led.angleDeg} ${led.mx} ${led.my})`}
					class="led"
					class:lit
				/>
			{/if}
		{/each}
	</g>

	<g class="nodes">
		{#each TREE_NODES as node (node.path)}
			{@const lit = node.path !== '' && litSet.has(node.path)}
			{@const isCurrent = currentPath !== '' && node.path === currentPath}
			{@const isRoot = node.path === ''}
			{@const mastered = node.letter ? masteredPaths.has(node.path) : false}
			{#if isRoot}
				<g class="antenna" transform={`translate(${node.x}, ${node.y})`}>
					<line x1="0" y1="-2.4" x2="0" y2="-0.4" class="mast" />
					<line x1="-2.6" y1="-3.6" x2="2.6" y2="-3.6" class="rays" />
					<line x1="-1.8" y1="-2.4" x2="1.8" y2="-2.4" class="rays" />
					<polygon points="-2.6,0 2.6,0 0,3.4" class="antenna-body" />
				</g>
			{:else}
				<g
					class="node"
					class:lit
					class:current={isCurrent}
					class:mastered
					class:tappable={!!node.letter}
					role="button"
					tabindex={node.letter ? 0 : -1}
					onclick={() => handleTap(node.path)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleTap(node.path)}
				>
					<circle cx={node.x} cy={node.y} r={NODE_R} class="node-bg" />
					{#if node.letter}
						<text
							x={node.x}
							y={node.y + 1.3}
							text-anchor="middle"
							font-size="3.4"
							class="node-letter"
						>{node.letter}</text>
					{/if}
				</g>
			{/if}
		{/each}
	</g>
</svg>

<style>
	.tree {
		width: 100%;
		height: 100%;
		display: block;
	}
	.tree.compact {
		max-height: 200px;
	}

	.rail {
		stroke: var(--color-border);
		stroke-width: 0.4;
		fill: none;
	}

	.led {
		fill: var(--color-text-disabled);
		transition: fill 140ms;
	}
	.led.lit {
		fill: var(--color-success);
	}
	.tree.errored .led.lit {
		fill: var(--color-danger);
	}

	.antenna .antenna-body {
		fill: var(--color-text);
	}
	.antenna .mast,
	.antenna .rays {
		stroke: var(--color-text);
		stroke-width: 0.5;
		stroke-linecap: round;
	}

	.node-bg {
		fill: var(--color-bg);
		stroke: var(--color-border-strong);
		stroke-width: 0.5;
		transition:
			fill 140ms,
			stroke 140ms,
			stroke-width 140ms;
	}
	.node-letter {
		fill: var(--color-text);
		font-family: var(--font-display);
		font-weight: 600;
		pointer-events: none;
		transition: fill 140ms;
	}
	.node.tappable {
		cursor: pointer;
	}
	/* Suppress browser focus halo on SVG nodes — it boxes them in and occludes neighbors. */
	.node,
	.node:focus,
	.node:focus-visible {
		outline: none;
	}
	.node:focus-visible .node-bg {
		stroke: var(--color-primary);
		stroke-width: 0.9;
	}

	/* In-path (lit) — slim green outline, letter stays readable. */
	.node.lit .node-bg {
		stroke: var(--color-success);
		stroke-width: 0.7;
	}
	.node.lit .node-letter {
		fill: var(--color-success);
	}

	/* Current (terminal of current keying) — same color, slightly thicker. */
	.node.current .node-bg {
		stroke: var(--color-success);
		stroke-width: 0.9;
		fill: var(--color-bg);
	}
	.node.current .node-letter {
		fill: var(--color-success);
		font-weight: 700;
	}

	.tree.errored .node.lit .node-bg,
	.tree.errored .node.current .node-bg {
		stroke: var(--color-danger);
	}
	.tree.errored .node.lit .node-letter,
	.tree.errored .node.current .node-letter {
		fill: var(--color-danger);
	}

	/* Mastered — solid fill as a permanent achievement badge. */
	.node.mastered .node-bg {
		fill: var(--color-success);
		stroke: var(--color-success);
	}
	.node.mastered .node-letter {
		fill: white;
	}
</style>
