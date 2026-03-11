export type LikedVideo = {
	videoId: string;
	title: string;
	url: string;
	channelName: string;
	thumbnailUrl: string;
};

export type SaveVideoMessage = {
	type: "SAVE_LIKED_VIDEO";
	video: LikedVideo;
};

export type DeleteVideoMessage = {
	type: "DELETE_VIDEO";
	videoId: string;
};

export type GetVideosMessage = {
	type: "GET_VIDEOS";
};

export type ExtensionMessage =
	| SaveVideoMessage
	| DeleteVideoMessage
	| GetVideosMessage;

export type MessageResponse =
	| { success: true; data?: LikedVideo[] }
	| { success: false; error: string };
