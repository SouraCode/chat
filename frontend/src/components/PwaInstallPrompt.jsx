import { useEffect, useState } from 'react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const PwaInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState(null);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const onAppInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (!installEvent) return null;

  return (
    <button
      type="button"
      onClick={installApp}
      className="fixed right-4 bottom-4 z-[60] rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95"
      aria-label="Install Chat Space app"
    >
      Install app
    </button>
  );
};

export default PwaInstallPrompt;
