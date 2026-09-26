import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX_DATA_URL_CHARS = 8 * 1024 * 1024;

export type PickedImage = { uri: string; dataUrl: string; width: number; height: number };

export type ImageSource = 'library' | 'camera';

export class ImagePickError extends Error {}

/**
 * Picks an image, scales it down to `maxWidth` and re-encodes it as PNG.
 * Returns null when the user cancels.
 */
export async function pickImage(
  source: ImageSource,
  { maxWidth, aspect }: { maxWidth: number; aspect?: [number, number] },
): Promise<PickedImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: !!aspect,
    aspect,
    exif: false,
  };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new ImagePickError('אין הרשאה למצלמה. אפשר לאשר אותה בהגדרות המכשיר.');
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new ImagePickError('אין הרשאה לגלריה. אפשר לאשר אותה בהגדרות המכשיר.');
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > maxWidth) context.resize({ width: maxWidth });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ base64: true, format: SaveFormat.PNG });
  if (!saved.base64) throw new ImagePickError('עיבוד התמונה נכשל.');
  const dataUrl = `data:image/png;base64,${saved.base64}`;
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new ImagePickError('התמונה גדולה מדי. נסו תמונה קטנה יותר.');
  }
  return { uri: saved.uri, dataUrl, width: saved.width, height: saved.height };
}
