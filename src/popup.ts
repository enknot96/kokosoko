import { isRestrictedUrl } from './shared/restricted-url';

type Mode = 'select' | 'fullpage';

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function activate(tabId: number, mode: Mode): void {
  chrome.runtime.sendMessage({ type: 'ACTIVATE', tabId, mode });
  window.close();
}

async function init(): Promise<void> {
  const fullPageBtn = document.getElementById('full-page') as HTMLButtonElement;
  const selectAreaBtn = document.getElementById('select-area') as HTMLButtonElement;
  const message = document.getElementById('message') as HTMLParagraphElement;

  const tab = await getActiveTab();

  if (!tab || tab.id === undefined || isRestrictedUrl(tab.url)) {
    fullPageBtn.disabled = true;
    selectAreaBtn.disabled = true;
    message.textContent = 'Not available on this page';
    message.hidden = false;
    return;
  }

  const tabId = tab.id;
  fullPageBtn.addEventListener('click', () => activate(tabId, 'fullpage'));
  selectAreaBtn.addEventListener('click', () => activate(tabId, 'select'));
}

void init();
