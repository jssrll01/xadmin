import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  };

  if (installed || !prompt) return null;

  return (
    <button
      className="neu-btn neu-btn-primary"
      onClick={install}
      style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: 12 }}
    >
      <Download size={14} /> Install app
    </button>
  );
}
