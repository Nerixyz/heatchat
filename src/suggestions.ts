import { getAvailableChannels, getJustlogUrl } from './justlog';
import { clearChildren, createElement } from './dom';
import throttle from 'lodash.throttle';

export function initSuggestions(datalist: HTMLDataListElement, urlEl: HTMLInputElement) {
  const throttledUpdate = throttle(() => updateChannels(datalist, urlEl), 1000);
  urlEl.addEventListener('change', throttledUpdate);
  // urlEl.addEventListener('keyup', throttledUpdate);
  throttledUpdate();
}

async function updateChannels(datalist: HTMLDataListElement, justlogInput: HTMLInputElement) {
  const channels = await getAvailableChannels(getJustlogUrl(justlogInput.value));
  clearChildren(datalist);
  for(const channel of channels) {
    const option = createElement('option');
    option.value = channel.name;
    datalist.append(option);
  }
}
