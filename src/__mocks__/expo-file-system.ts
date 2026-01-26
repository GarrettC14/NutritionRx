// Mock for expo-file-system
export const documentDirectory: string | null = 'file:///data/user/0/com.nutritionrx/files/';
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const readAsStringAsync = jest.fn().mockResolvedValue('');
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const getInfoAsync = jest.fn().mockResolvedValue({ exists: true, isDirectory: false });
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);

export enum EncodingType {
  UTF8 = 'utf8',
  Base64 = 'base64',
}

// Default export for compatibility
export default {
  documentDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  EncodingType,
};
