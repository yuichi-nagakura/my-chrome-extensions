import { describe, expect, mock, test } from "bun:test";

// Mock chrome before importing content module
globalThis.chrome = {
	runtime: {
		sendMessage: mock(() => {}),
	},
} as unknown as typeof chrome;

// Import after mock setup (module calls attachLikeListener and observePageChanges at top level)
const { getVideoIdFromUrl, getThumbnailUrl, isLiked } = await import(
	"../content"
);

describe("getVideoIdFromUrl", () => {
	test("extracts video ID from standard URL", () => {
		expect(getVideoIdFromUrl("https://www.youtube.com/watch?v=abc123")).toBe(
			"abc123",
		);
	});

	test("extracts video ID with extra params", () => {
		expect(
			getVideoIdFromUrl("https://www.youtube.com/watch?v=abc123&t=60"),
		).toBe("abc123");
	});

	test("returns null for non-watch URL", () => {
		expect(getVideoIdFromUrl("https://www.youtube.com/")).toBeNull();
	});

	test("returns null for URL without v param", () => {
		expect(getVideoIdFromUrl("https://www.youtube.com/watch")).toBeNull();
	});
});

describe("getThumbnailUrl", () => {
	test("returns mqdefault thumbnail URL", () => {
		expect(getThumbnailUrl("abc123")).toBe(
			"https://i.ytimg.com/vi/abc123/mqdefault.jpg",
		);
	});
});

describe("isLiked", () => {
	function makeButton(ariaPressed?: string): HTMLElement {
		const el = {
			getAttribute(name: string): string | null {
				if (name === "aria-pressed") return ariaPressed ?? null;
				return null;
			},
		} as unknown as HTMLElement;
		return el;
	}

	test("returns true when aria-pressed is true", () => {
		const el = makeButton("true");
		expect(isLiked(el)).toBe(true);
	});

	test("returns false when aria-pressed is false", () => {
		const el = makeButton("false");
		expect(isLiked(el)).toBe(false);
	});

	test("returns false when aria-pressed is absent", () => {
		const el = makeButton();
		expect(isLiked(el)).toBe(false);
	});
});
