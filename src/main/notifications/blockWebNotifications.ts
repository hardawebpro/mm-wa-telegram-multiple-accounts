/** Prevent WhatsApp/Telegram Web from showing native toasts; the app shell handles notifications. */
export const BLOCK_WEB_NOTIFICATIONS_SCRIPT = `
(function() {
  if (window.__mmwaNotificationsBlocked) {
    return;
  }
  window.__mmwaNotificationsBlocked = true;

  var Stub = function() {
    this.close = function() {};
    this.onclick = null;
  };
  Stub.permission = 'denied';
  Stub.requestPermission = function() {
    return Promise.resolve('denied');
  };

  try {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Stub
    });
  } catch (error) {
    window.Notification = Stub;
  }
})();
`
