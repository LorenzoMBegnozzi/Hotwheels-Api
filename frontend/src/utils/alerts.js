import Swal from 'sweetalert2';

const defaultToast = (icon, title, text, opts = {}) => {
  return Swal.fire({
    toast: true,
    position: opts.position || 'bottom-start',
    icon: icon || undefined,
    title: title || '',
    text: text || undefined,
    showConfirmButton: false,
    timer: opts.timer || 2000,
    timerProgressBar: true,
    background: opts.background || undefined,
  });
};

export const toastSuccess = (title, text, opts = {}) => defaultToast('success', title, text, opts);
export const toastError = (title, text, opts = {}) => defaultToast('error', title, text, opts);
export const toastInfo = (title, text, opts = {}) => defaultToast('info', title, text, opts);
export const toastWarning = (title, text, opts = {}) => defaultToast('warning', title, text, opts);

// Keep export of raw Swal for confirm dialogs and more complex modals
export { Swal };
