/**
 * Morse decoding tree — laid out by hand to mimic the physical card.
 *
 *   - Antenna (root) at the top center.
 *   - A horizontal "spine" runs through it. To the LEFT, the all-dash chain
 *     T → M → O. To the RIGHT, the all-dot chain E → I → S → H.
 *   - Each spine letter (except the all-out leaves) drops a small sub-tree
 *     downward. Within those sub-trees the convention is the same as the
 *     card: dot child to the right, dash child to the left.
 *
 * This is much more space-efficient than a balanced binary tree because
 * the spine occupies a single row and the dense regions of the alphabet
 * (mid-depth letters) get plenty of room below.
 */
import { FROM_MORSE } from './code';

export type TreeNode = {
	path: string;
	letter?: string;
	depth: number;
	x: number;
	y: number;
	/** Whether this node sits on the horizontal spine. */
	spine: boolean;
};

export type TreeEdge = {
	from: string;
	to: string;
	type: '.' | '-';
};

const ANTENNA_Y = 6;
const SPINE_Y = 18;
const ROW_STEP = 17;

type RawNode = { path: string; x: number; y: number; spine?: boolean };

// Layout uses a 120-wide viewport. Beyond row-spacing on the leaves, each
// pair of spine-row letters is far enough apart that the connecting LED
// (a long rectangle for dashes, a small disc for dots) sits clearly
// between them without overlapping either circle.
const RAW: RawNode[] = [
	// Root antenna
	{ path: '', x: 59, y: ANTENNA_Y, spine: true },

	// Left spine (dashes): T, M, O
	{ path: '-', x: 43, y: SPINE_Y, spine: true },
	{ path: '--', x: 23, y: SPINE_Y, spine: true },
	{ path: '---', x: 4, y: SPINE_Y, spine: true },

	// Right spine (dots): E, I, S, H
	{ path: '.', x: 75, y: SPINE_Y, spine: true },
	{ path: '..', x: 91, y: SPINE_Y, spine: true },
	{ path: '...', x: 103, y: SPINE_Y, spine: true },
	{ path: '....', x: 115, y: SPINE_Y, spine: true },

	// T's drop-down: N → (K, D) → (Y, C, X, B)
	{ path: '-.', x: 43, y: SPINE_Y + ROW_STEP },          // N
	{ path: '-.-', x: 35, y: SPINE_Y + 2 * ROW_STEP },     // K (N+dash, left)
	{ path: '-..', x: 51, y: SPINE_Y + 2 * ROW_STEP },     // D (N+dot, right)
	{ path: '-.--', x: 31, y: SPINE_Y + 3 * ROW_STEP },    // Y (K+dash, left)
	{ path: '-.-.', x: 39, y: SPINE_Y + 3 * ROW_STEP },    // C (K+dot, right)
	{ path: '-..-', x: 47, y: SPINE_Y + 3 * ROW_STEP },    // X (D+dash, left)
	{ path: '-...', x: 55, y: SPINE_Y + 3 * ROW_STEP },    // B (D+dot, right)

	// M's drop-down: G → (Q, Z)
	{ path: '--.', x: 23, y: SPINE_Y + ROW_STEP },         // G
	{ path: '--.-', x: 19, y: SPINE_Y + 2 * ROW_STEP },    // Q (G+dash, left)
	{ path: '--..', x: 27, y: SPINE_Y + 2 * ROW_STEP },    // Z (G+dot, right)

	// E's drop-down: A → (W, R) → (J, P, L)
	{ path: '.-', x: 75, y: SPINE_Y + ROW_STEP },          // A
	{ path: '.--', x: 67, y: SPINE_Y + 2 * ROW_STEP },     // W (A+dash, left)
	{ path: '.-.', x: 83, y: SPINE_Y + 2 * ROW_STEP },     // R (A+dot, right)
	{ path: '.---', x: 63, y: SPINE_Y + 3 * ROW_STEP },    // J (W+dash, left)
	{ path: '.--.', x: 71, y: SPINE_Y + 3 * ROW_STEP },    // P (W+dot, right)
	{ path: '.-..', x: 87, y: SPINE_Y + 3 * ROW_STEP },    // L (R+dot, right)

	// I's drop-down: U → F
	{ path: '..-', x: 91, y: SPINE_Y + ROW_STEP },         // U
	{ path: '..-.', x: 95, y: SPINE_Y + 2 * ROW_STEP },    // F (U+dot, right)

	// S's drop-down: V (depth 4 leaf, just one node)
	{ path: '...-', x: 99, y: SPINE_Y + ROW_STEP }         // V (S+dash, left of S)
];

export const TREE_NODES: TreeNode[] = RAW.map((r) => ({
	path: r.path,
	letter: FROM_MORSE[r.path],
	depth: r.path.length,
	x: r.x,
	y: r.y,
	spine: !!r.spine
}));

export const NODE_BY_PATH: Record<string, TreeNode> = Object.fromEntries(
	TREE_NODES.map((n) => [n.path, n])
);

/**
 * Edges are derived: every non-root node has an edge from its parent
 * (its path with the last symbol removed). Symbol of the last char
 * tells us whether it's a dot or dash edge.
 */
export const TREE_EDGES: TreeEdge[] = TREE_NODES.filter((n) => n.path !== '').map((n) => {
	const last = n.path[n.path.length - 1] as '.' | '-';
	const parent = n.path.slice(0, -1);
	return { from: parent, to: n.path, type: last };
});

/** All ancestor paths for a given path, including itself but excluding root. */
export function ancestorPaths(path: string): string[] {
	const out: string[] = [];
	for (let i = 1; i <= path.length; i++) out.push(path.slice(0, i));
	return out;
}
