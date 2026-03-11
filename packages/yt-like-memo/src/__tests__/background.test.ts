import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { LikedVideo } from "../types";

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

globalThis.chrome = {
	storage: {
		local: {
			get: mock((keys: string[]) =>
				Promise.resolve(
					Object.fromEntries(keys.map((k) => [k, mockStorage[k]])),
				),
			),
			set: mock((items: Record<string, unknown>) => {
				Object.assign(mockStorage, items);
				return Promise.resolve();
			}),
		},
	},
	runtime: {
		onMessage: {
			addListener: mock(() => {}),
		},
	},
} as unknown as typeof chrome;

// Import after mock setup
const { saveVideo, getVideos, deleteVideo } = await import("../background");

const sampleVideo: LikedVideo = {
	videoId: "abc123",
	title: "Test Video",
	url: "https://www.youtube.com/watch?v=abc123",
	channelName: "Test Channel",
	thumbnailUrl: "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
};

describe("saveVideo", () => {
	beforeEach(() => {
		for (const key of Object.keys(mockStorage)) {
			delete mockStorage[key];
		}
	});

	test("saves a new video", async () => {
		await saveVideo(sampleVideo);
		expect(mockStorage.likedVideos).toEqual([sampleVideo]);
	});

	test("does not duplicate by videoId", async () => {
		mockStorage.likedVideos = [sampleVideo];
		await saveVideo(sampleVideo);
		expect(mockStorage.likedVideos).toEqual([sampleVideo]);
	});

	test("prepends new video to existing list", async () => {
		const existing: LikedVideo = {
			...sampleVideo,
			videoId: "xyz789",
			title: "Other",
		};
		mockStorage.likedVideos = [existing];
		await saveVideo(sampleVideo);
		expect(mockStorage.likedVideos).toEqual([sampleVideo, existing]);
	});
});

describe("getVideos", () => {
	beforeEach(() => {
		for (const key of Object.keys(mockStorage)) {
			delete mockStorage[key];
		}
	});

	test("returns empty array when no data", async () => {
		const result = await getVideos();
		expect(result).toEqual([]);
	});

	test("returns saved videos", async () => {
		mockStorage.likedVideos = [sampleVideo];
		const result = await getVideos();
		expect(result).toEqual([sampleVideo]);
	});
});

describe("deleteVideo", () => {
	beforeEach(() => {
		for (const key of Object.keys(mockStorage)) {
			delete mockStorage[key];
		}
	});

	test("removes video by videoId", async () => {
		mockStorage.likedVideos = [sampleVideo];
		await deleteVideo("abc123");
		expect(mockStorage.likedVideos).toEqual([]);
	});

	test("no-op if videoId not found", async () => {
		mockStorage.likedVideos = [sampleVideo];
		await deleteVideo("nonexistent");
		expect(mockStorage.likedVideos).toEqual([sampleVideo]);
	});
});
