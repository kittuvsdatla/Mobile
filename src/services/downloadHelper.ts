import { PermissionsAndroid, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { apiService } from './apiService';
import { apiConfig } from '@/config';
import Toast from 'react-native-toast-message';

// ── Storage Permission ─────────────────────────────────────────────────────────
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
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

// ── Shared PDF download core ───────────────────────────────────────────────────
async function executePdfDownload(url: string, filename: string): Promise<void> {
  const { dirs } = ReactNativeBlobUtil.fs;

  Toast.show({
    type: 'info',
    text1: 'Download Started',
    text2: `Preparing ${filename}…`,
  });

  try {
    if (Platform.OS === 'android') {
      ReactNativeBlobUtil.config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: filename,
          path: `${dirs.DownloadDir}/${filename}`,
          description: 'BusinessApp PDF download',
          mime: 'application/pdf',
          mediaScannable: true,
        },
      })
        .fetch('GET', url)
        .then(() => {
          Toast.show({
            type: 'success',
            text1: 'Download Complete',
            text2: `${filename} saved to Downloads.`,
          });
        })
        .catch((err) => {
          console.error('[Download Failed]', err);
          Toast.show({ type: 'error', text1: 'Download Failed', text2: 'An error occurred.' });
        });
    } else {
      // iOS — save to DocumentDir, then preview
      ReactNativeBlobUtil.config({
        fileCache: true,
        path: `${dirs.DocumentDir}/${filename}`,
      })
        .fetch('GET', url)
        .then((res) => {
          ReactNativeBlobUtil.ios.previewDocument(res.path());
          Toast.show({ type: 'success', text1: 'Downloaded', text2: filename });
        })
        .catch((err) => {
          console.error('[iOS Download Failed]', err);
          Toast.show({ type: 'error', text1: 'Download Failed', text2: 'Failed to download PDF.' });
        });
    }
  } catch (error) {
    console.error('[Download execution error]', error);
    Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to initialize download.' });
  }
}

// ── Safe filename helper ───────────────────────────────────────────────────────
function safe(s?: string | null): string {
  return (s ?? '').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ── Invoice PDF download (Sale / Purchase) ─────────────────────────────────────
/**
 * Download a single invoice PDF with proper filename:
 *   Sale_Invoice_INV001_CustomerName[_Duplicate][_WithNotes].pdf
 */
export const downloadInvoicePdf = async (
  type: 'SALE' | 'PURCHASE',
  idOrInvoiceNo: string,
  isByInvoiceNo: boolean,
  isDuplicate: boolean = false
): Promise<void> => {
  const token = apiService.getToken();
  if (!token) {
    Toast.show({ type: 'error', text1: 'Auth Error', text2: 'Please log in again.' });
    return;
  }

  const hasPermission = await requestStoragePermission();
  if (!hasPermission) {
    Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Cannot save PDF without storage permission.' });
    return;
  }

  // Build URL
  let path = type === 'SALE'
    ? (isByInvoiceNo ? `/api/sales/invoice/${idOrInvoiceNo}/pdf` : `/api/sales/${idOrInvoiceNo}/pdf`)
    : (isByInvoiceNo ? `/api/purchases/invoice/${idOrInvoiceNo}/pdf` : `/api/purchases/${idOrInvoiceNo}/pdf`);

  if (isDuplicate) {
    path += '?duplicate=true';
  }

  const sep = path.includes('?') ? '&' : '?';
  const url = `${apiConfig.baseUrl}${path}${sep}token=${token}`;

  // Build filename:  Sale_Invoice_INV001[_Duplicate].pdf
  const refPart   = safe(idOrInvoiceNo) || 'Invoice';
  const dupPart   = isDuplicate   ? '_Duplicate' : '';
  const prefix    = type === 'SALE' ? 'Sale_Invoice' : 'Purchase_Invoice';
  const filename  = `${prefix}_${refPart}${dupPart}.pdf`;

  await executePdfDownload(url, filename);
};

// ── Ledger PDF download ────────────────────────────────────────────────────────
/**
 * Download the unified/party ledger PDF with proper naming:
 *   Ledger_PartyName_DDMMYYYY_to_DDMMYYYY[_Sale][_Purchase][_WithNotes].pdf
 *   Ledger_AllParties_DDMMYYYY_to_DDMMYYYY.pdf
 */
export const downloadLedgerPdf = async (opts: {
  partyId?:   string | null;
  partyName?: string | null;
  transporterId?: string | null;
  transporterName?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  fromDate?:  string | null;
  toDate?:    string | null;
  types?:     string[];
  showNotes?: boolean;
}): Promise<void> => {
  const token = apiService.getToken();
  if (!token) {
    Toast.show({ type: 'error', text1: 'Auth Error', text2: 'Please log in again.' });
    return;
  }

  const hasPermission = await requestStoragePermission();
  if (!hasPermission) {
    Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Cannot save PDF without storage permission.' });
    return;
  }

  // Build query params
  const params: string[] = [];
  if (opts.fromDate)  params.push(`from=${opts.fromDate}`);
  if (opts.toDate)    params.push(`to=${opts.toDate}`);
  if (opts.partyId)   params.push(`partyId=${opts.partyId}`);
  if (opts.types && opts.types.length > 0) {
    opts.types.forEach(t => params.push(`types=${t}`));
  }
  if (opts.showNotes) params.push('showNotes=true');
  params.push(`token=${token}`);

  // Build URL and Filename based on type
  let url = '';
  let filenamePrefix = 'ledger';
  let entityPart = '';

  if (opts.transporterId) {
    url = `${apiConfig.baseUrl}/api/transporters/${opts.transporterId}/ledger/pdf?${params.join('&')}`;
    filenamePrefix = 'transporter_ledger';
    entityPart = safe(opts.transporterName).toLowerCase() || 'transporter';
  } else if (opts.employeeId) {
    url = `${apiConfig.baseUrl}/api/employees/${opts.employeeId}/ledger/pdf?${params.join('&')}`;
    filenamePrefix = 'employee_ledger';
    entityPart = safe(opts.employeeName).toLowerCase() || 'employee';
  } else {
    url = `${apiConfig.baseUrl}/api/reports/ledger/pdf?${params.join('&')}`;
    filenamePrefix = 'ledger';
    entityPart = safe(opts.partyName).toLowerCase() || 'all_parties';
  }

  function fmtFilenameDate(d?: string | null): string {
    if (!d) return '';
    const p = d.split('T')[0].split('-'); // YYYY-MM-DD
    return p.length === 3 ? `${p[2]}${p[1]}${p[0]}` : safe(d);
  }

  const fromPart  = fmtFilenameDate(opts.fromDate);
  const toPart    = fmtFilenameDate(opts.toDate);
  const datePart  = fromPart && toPart ? `_${fromPart}_to_${toPart}` : fromPart ? `_${fromPart}` : '';

  const typesPart = (opts.types && opts.types.length > 0 && opts.types.length < 3)
    ? '_' + opts.types.map(t => t.toLowerCase()).join('_')
    : '';

  const notesPart = opts.showNotes ? '_with_notes' : '';
  const filename  = `${filenamePrefix}_${entityPart}${datePart}${typesPart}${notesPart}.pdf`;

  await executePdfDownload(url, filename);
};
