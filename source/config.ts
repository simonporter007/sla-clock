import Store = require('electron-store');

type StoreType = {
  mailboxFolderURL: string;
  timerView: boolean;
  hideClock: boolean;
  sla: number;
  filterPending: boolean;
};

const schema: {[Key in keyof StoreType]} = {
  mailboxFolderURL: {
    type: 'string',
    default: 'https://secure.helpscout.net/'
  },
  timerView: {
    type: 'boolean',
    default: true
  },
  hideClock: {
    type: 'boolean',
    default: false
  },
  sla: {
    type: 'number',
    default: 24
  },
  filterPending: {
    type: 'boolean',
    default: true
  }
};

export default new Store<StoreType>({schema});
