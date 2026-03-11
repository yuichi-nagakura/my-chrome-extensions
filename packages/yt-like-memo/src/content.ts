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
	const btn = document.querySelector<HTMLElement>(
		'like-button-view-model button, segmented-like-dislike-button-view-model button[aria-label*="like" i]',
	);
	if (btn) return btn;

	const legacyBtn = document.querySelector<HTMLElement>(
		'ytd-toggle-button-renderer#button[aria-label*="like" i] button',
	);
	return legacyBtn;
}

let currentLikeButton: HTMLElement | null = null;

function attachLikeListener(): void {
	const btn = findLikeButton();
	if (!btn || btn === currentLikeButton) return;

	currentLikeButton = btn;

	btn.addEventListener("click", () => {
		requestAnimationFrame(() => {
			setTimeout(() => {
				if (currentLikeButton && isLiked(currentLikeButton)) {
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
