import type {
	DeleteVideoMessage,
	GetVideosMessage,
	LikedVideo,
	MessageResponse,
} from "./types";

function sendMessage(
	message: GetVideosMessage | DeleteVideoMessage,
): Promise<MessageResponse> {
	return chrome.runtime.sendMessage(message);
}

async function fetchVideos(): Promise<LikedVideo[]> {
	const response = await sendMessage({ type: "GET_VIDEOS" });
	if (response.success && response.data) {
		return response.data;
	}
	return [];
}

async function requestDelete(videoId: string): Promise<void> {
	await sendMessage({ type: "DELETE_VIDEO", videoId });
}

function createVideoElement(video: LikedVideo): HTMLElement {
	const item = document.createElement("div");
	item.className = "video-item";

	const img = document.createElement("img");
	img.src = video.thumbnailUrl;
	img.alt = video.title;

	const info = document.createElement("div");
	info.className = "video-info";

	const title = document.createElement("div");
	title.className = "video-title";
	title.textContent = video.title;

	const channel = document.createElement("div");
	channel.className = "video-channel";
	channel.textContent = video.channelName;

	info.appendChild(title);
	info.appendChild(channel);

	const deleteBtn = document.createElement("button");
	deleteBtn.className = "delete-btn";
	deleteBtn.textContent = "\u00d7";
	deleteBtn.title = "Delete";
	deleteBtn.addEventListener("click", async (e) => {
		e.stopPropagation();
		await requestDelete(video.videoId);
		item.remove();
		updateEmptyState();
	});

	item.addEventListener("click", () => {
		chrome.tabs.create({ url: video.url });
	});

	item.appendChild(img);
	item.appendChild(info);
	item.appendChild(deleteBtn);

	return item;
}

function updateEmptyState(): void {
	const list = document.getElementById("video-list");
	const emptyState = document.getElementById("empty-state");
	if (!list || !emptyState) return;

	const hasChildren = list.children.length > 0;
	emptyState.hidden = hasChildren;
}

async function render(): Promise<void> {
	const list = document.getElementById("video-list");
	if (!list) return;

	const videos = await fetchVideos();
	for (const video of videos) {
		list.appendChild(createVideoElement(video));
	}

	updateEmptyState();
}

render();
