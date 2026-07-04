/**
 * Getting the user's room photo from the camera into the workspace.
 *
 * The captured frame is downscaled in the browser (edit models don't need more
 * than ~1600px; smaller uploads are cheaper and faster), stored in
 * sessionStorage as a data URI, and read back on the workspace. When nothing is
 * stored — no camera, or a direct visit — the committed demo room is used.
 */

const STORAGE_KEY = 'dekea:room';

/** Longest edge of the photo we send to the edit models. */
const MAX_EDGE = 1600;

export function storeRoomPhoto(dataUri: string): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, dataUri);
	} catch {
		// Quota/private-mode failures just mean the demo room gets zapped instead.
	}
}

export function clearRoomPhoto(): void {
	sessionStorage.removeItem(STORAGE_KEY);
}

/** The stored capture, if any. */
export function loadRoomPhoto(): string | null {
	return sessionStorage.getItem(STORAGE_KEY);
}

/** Grab the current camera frame as a downscaled JPEG data URI. */
export function frameToDataUri(video: HTMLVideoElement): string | null {
	const w = video.videoWidth;
	const h = video.videoHeight;
	if (!w || !h) return null;

	const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(w * scale);
	canvas.height = Math.round(h * scale);
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL('image/jpeg', 0.85);
}

/** Fetch a same-origin asset (the demo room) as a data URI for the edit APIs. */
export async function fetchAsDataUri(src: string): Promise<string> {
	const res = await fetch(src);
	if (!res.ok) throw new Error(`Failed to fetch ${src} (${res.status})`);
	const blob = await res.blob();
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}
