/**
 * Smoke test to verify Jest + mocks are configured correctly.
 * This file can be removed once real tests exist.
 */

describe('jest setup smoke test', () => {
  it('loads expo-secure-store mock', () => {
    const SecureStore = require('expo-secure-store');
    expect(SecureStore.getItemAsync).toBeDefined();
    expect(SecureStore.setItemAsync).toBeDefined();
    expect(SecureStore.deleteItemAsync).toBeDefined();
  });

  it('loads expo-document-picker mock', () => {
    const DocumentPicker = require('expo-document-picker');
    expect(DocumentPicker.getDocumentAsync).toBeDefined();
  });

  it('loads expo-font mock', () => {
    const Font = require('expo-font');
    expect(Font.useFonts).toBeDefined();
    expect(Font.useFonts()).toEqual([true, null]);
    expect(Font.isLoaded()).toBe(true);
  });

  it('loads react-native-toast-message mock', () => {
    const Toast = require('react-native-toast-message');
    expect(Toast.show).toBeDefined();
    expect(Toast.hide).toBeDefined();
  });

  it('loads nativewind mock', () => {
    const { styled } = require('nativewind');
    const identity = {};
    expect(styled(identity)).toBe(identity);
  });
});
