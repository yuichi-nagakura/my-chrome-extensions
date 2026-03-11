import type { LikedVideo, SaveVideoMessage } from "./types";

export function getVideoIdFromUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		return parsed.searchParams.get("v");
	} catch {
		return null;
	}
}

export function getThumbnailUrl(videoId: string): string {
	return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function isLiked(button: HTMLElement): boolean {
	return button.getAttribute("aria-pressed") === "true";
}

function getVideoTitle(): string {
	const el = document.querySelector<HTMLElement>(
		"yt-formatted-string.ytd-watch-metadata",
	);
	return el?.textContent?.trim() ?? "Unknown Title";
}

function getChannelName(): string {
	const el = document.querySelector<HTMLElement>(
		"ytd-channel-name yt-formatted-string a",
	);
	return el?.textContent?.trim() ?? "Unknown Channel";
}

function collectVideoInfo(): LikedVideo | null {
	const videoId = getVideoIdFromUrl(window.location.href);
	if (!videoId) return null;

	return {
		videoId,
		title: getVideoTitle(),
		url: `https://www.youtube.com/watch?v=${videoId}`,
		channelName: getChannelName(),
		thumbnailUrl: getThumbnailUrl(videoId),
	};
}

function sendToBackground(video: LikedVideo): void {
	const message: SaveVideoMessage = { type: "SAVE_LIKED_VIDEO", video };
	chrome.runtime.sendMessage(message);
}

function findLikeButton(): HTMLElement | null {
	// YouTube uses different components: like-button-view-model (older) or
	// segmented-like-dislike-button-view-model (current watch page). Prefer visible one.
	const selector =
		"like-button-view-model button, segmented-like-dislike-button-view-model button[aria-label*='like' i]";
	const buttons = document.querySelectorAll<HTMLElement>(selector);
	for (const btn of buttons) {
		if (btn.offsetParent !== null) return btn;
	}
	// Legacy / alternate structure
	const legacy = document.querySelectorAll<HTMLElement>(
		"ytd-toggle-button-renderer button[aria-label*='like' i]",
	);
	for (const btn of legacy) {
		if (btn.offsetParent !== null) return btn;
	}
	return null;
}

let currentLikeButton: HTMLElement | null = null;

function attachLikeListener(): void {
	const btn = findLikeButton();
	if (!btn || btn === currentLikeButton) return;

	currentLikeButton = btn;

	btn.addEventListener("click", () => {
		requestAnimationFrame(() => {
			setTimeout(() => {
				// Re-query so we see updated aria-pressed (DOM may be replaced by YouTube)
				const likeBtn = findLikeButton();
				if (likeBtn && isLiked(likeBtn)) {
					const video = collectVideoInfo();
					if (video) {
						sendToBackground(video);
					}
				}
			}, 300);
		});
	});
}

function observePageChanges(): void {
	const observer = new MutationObserver(() => {
		attachLikeListener();
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

// Initial setup (only run in browser environment)
if (typeof document !== "undefined") {
	attachLikeListener();
	observePageChanges();
}
