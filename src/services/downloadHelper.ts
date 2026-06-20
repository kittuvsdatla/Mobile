import { PermissionsAndroid, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { apiService } from './apiService';
import { apiConfig } from '@/config';
import Toast from 'react-native-toast-message';

// Request Storage Permission (only required on older Android APIs)
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  // Scoped storage does not require WRITE permission on Android 10+ (API 29+)
  if (Platform.Version >= 29) return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'This app needs access to your storage to save PDFs.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[Download Permission Error]', err);
    return false;
  }
};

/**
 * Downloads a PDF invoice in the background and saves it to the Downloads directory.
 */
export const downloadInvoicePdf = async (
  type: 'SALE' | 'PURCHASE',
  idOrInvoiceNo: string,
  isByInvoiceNo: boolean
): Promise<void> => {
  const token = apiService.getToken();
  if (!token) {
    Toast.show({
      type: 'error',
      text1: 'Authentication Error',
      text2: 'Please log in again.',
    });
    return;
  }

  const hasPermission = await requestStoragePermission();
  if (!hasPermission) {
    Toast.show({
      type: 'error',
      text1: 'Permission Denied',
      text2: 'Cannot save PDF without storage permission.',
    });
    return;
  }

  // Construct PDF URL
  const path = type === 'SALE'
    ? (isByInvoiceNo ? `/api/sales/invoice/${idOrInvoiceNo}/pdf` : `/api/sales/${idOrInvoiceNo}/pdf`)
    : (isByInvoiceNo ? `/api/purchases/invoice/${idOrInvoiceNo}/pdf` : `/api/purchases/${idOrInvoiceNo}/pdf`);
  
  const separator = path.includes('?') ? '&' : '?';
  const url = `${apiConfig.baseUrl}${path}${separator}token=${token}`;

  const cleanFilename = `${type === 'SALE' ? 'Sale' : 'Purchase'}_Invoice_${idOrInvoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const { dirs } = ReactNativeBlobUtil.fs;

  Toast.show({
    type: 'info',
    text1: 'Download Started',
    text2: `Downloading ${cleanFilename} in background...`,
  });

  try {
    if (Platform.OS === 'android') {
      ReactNativeBlobUtil.config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: cleanFilename,
          path: `${dirs.DownloadDir}/${cleanFilename}`,
          description: `Downloading invoice PDF from BusinessApp`,
          mime: 'application/pdf',
          mediaScannable: true,
        },
      })
      .fetch('GET', url)
      .then((res) => {
        console.log('[Download Success] Saved to:', res.path());
        Toast.show({
          type: 'success',
          text1: 'Download Complete',
          text2: `${cleanFilename} saved to Downloads folder.`,
        });
      })
      .catch((err) => {
        console.error('[Download Failed]', err);
        Toast.show({
          type: 'error',
          text1: 'Download Failed',
          text2: 'An error occurred during file download.',
        });
      });
    } else {
      // iOS / fallback using file cache and share/preview sheet
      ReactNativeBlobUtil.config({
        fileCache: true,
        path: `${dirs.DocumentDir}/${cleanFilename}`,
      })
      .fetch('GET', url)
      .then((res) => {
        ReactNativeBlobUtil.ios.previewDocument(res.path());
        Toast.show({
          type: 'success',
          text1: 'Download Complete',
          text2: `${cleanFilename} downloaded successfully.`,
        });
      })
      .catch((err) => {
        console.error('[iOS Download Failed]', err);
        Toast.show({
          type: 'error',
          text1: 'Download Failed',
          text2: 'Failed to download PDF.',
        });
      });
    }
  } catch (error) {
    console.error('[Download execution error]', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to initialize download.',
    });
  }
};
