import BaseSwal from 'sweetalert2';

// SweetAlert2 can cause scroll jumps depending on CSS/layout.
// These defaults mitigate that and keep UX stable across the app.
const Swal = BaseSwal.mixin({
  heightAuto: false,
  scrollbarPadding: false,
  returnFocus: false,
});

export const fireModalPreserveScroll = async (options) => {
  const x = window.scrollX || 0;
  const y = window.scrollY || 0;
  try {
    return await Swal.fire(options);
  } finally {
    // Restore scroll after SweetAlert2 locks/unlocks body.
    requestAnimationFrame(() => {
      try { window.scrollTo(x, y); } catch (e) { /* ignore */ }
    });
  }
};

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
