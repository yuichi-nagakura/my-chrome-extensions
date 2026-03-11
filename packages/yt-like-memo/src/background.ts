import type { ExtensionMessage, LikedVideo, MessageResponse } from "./types";

const STORAGE_KEY = "likedVideos";

export async function getVideos(): Promise<LikedVideo[]> {
	const data = await chrome.storage.local.get([STORAGE_KEY]);
	return (data[STORAGE_KEY] as LikedVideo[] | undefined) ?? [];
}

export async function saveVideo(video: LikedVideo): Promise<void> {
	const videos = await getVideos();
	const exists = videos.some((v) => v.videoId === video.videoId);
	if (exists) return;
	await chrome.storage.local.set({ [STORAGE_KEY]: [video, ...videos] });
}

export async function deleteVideo(videoId: string): Promise<void> {
	const videos = await getVideos();
	const filtered = videos.filter((v) => v.videoId !== videoId);
	await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

chrome.runtime.onMessage.addListener(
	(
		message: ExtensionMessage,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response: MessageResponse) => void,
	) => {
		if (message.type === "SAVE_LIKED_VIDEO") {
			saveVideo(message.video)
				.then(() => sendResponse({ success: true }))
				.catch((error: unknown) =>
					sendResponse({
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					}),
				);
			return true;
		}

		if (message.type === "GET_VIDEOS") {
			getVideos()
				.then((data) => sendResponse({ success: true, data }))
				.catch((error: unknown) =>
					sendResponse({
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					}),
				);
			return true;
		}

		if (message.type === "DELETE_VIDEO") {
			deleteVideo(message.videoId)
				.then(() => sendResponse({ success: true }))
				.catch((error: unknown) =>
					sendResponse({
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					}),
				);
			return true;
		}
	},
);
