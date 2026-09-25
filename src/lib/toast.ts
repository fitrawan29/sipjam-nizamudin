import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

/**
 * Standardized non-intrusive Toast mixin using SweetAlert2.
 * Configured with toast: true, top-end position, auto-timer, and no blocking confirm button.
 */
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

/**
 * Displays a non-intrusive toast notification.
 */
export const showToast = (
  title: string,
  text?: string,
  icon: SweetAlertIcon = 'success',
  options?: SweetAlertOptions
) => {
  return Toast.fire({
    icon,
    title,
    ...(text ? { text } : {}),
    ...options,
  });
};

export default showToast;
