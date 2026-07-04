/**
 * Getting the user's room photo from the homepage into the workspace.
 *
 * The photo is downscaled in the browser (edit models don't need more than
 * ~1600px, and smaller uploads are cheaper and faster), stored in
 * sessionStorage as a data URI, and read back on the workspace. No photo, no
 * workspace: a direct visit bounces back to the homepage.
 */
const STORAGE_KEY = 'dekea:room';

/** Longest edge of the photo we send to the edit models. */
const MAX_EDGE = 1600;

export function storeRoomPhoto(dataUri: string): void {
	sessionStorage.setItem(STORAGE_KEY, dataUri);
}

/** The photo to zap, or null if the user hasn't taken one yet. */
export function loadRoomPhoto(): string | null {
	return sessionStorage.getItem(STORAGE_KEY);
}

/** Read a captured/selected photo, downscaled to MAX_EDGE and re-encoded as JPEG. */
export async function fileToRoomPhoto(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file);
	try {
		const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		if (scale === 1 && file.type === 'image/jpeg') return blobToDataUri(file);

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL('image/jpeg', 0.85);
	} finally {
		bitmap.close();
	}
}

function blobToDataUri(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}
