import {
  add,
  set
} from 'date-fns';
import {ipcRenderer} from 'electron';
import elementReady = require('element-ready');
import selectors from './selectors';

ipcRenderer.on('log-out', async () => {
  document.querySelector<HTMLElement>(selectors.accountDropdown)!.click();

  const logOut: HTMLElement = await elementReady<HTMLElement>(
    selectors.logOutMenuItem, {
      stopOnDomReady: false
    }
  );
  logOut.click();

  await ipcRenderer.invoke('config-reset', 'mailboxFolderURL');
});

async function createTicket(entry: any): Promise<Ticket> {
  const ticket: Partial<Ticket> = {};

  ticket.id = entry.id;
  ticket.customer = entry.customer.fullName;
  ticket.subject = entry.subject;
  ticket.number = entry.number;
  ticket.status = entry.status;

  if (typeof entry.waitingSince === 'string') {
    if (entry.waitingSince === '') {
      ticket.waitingSince = new Date(entry.modifiedAt);
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      ticket.waitingSince = new Date(Date.parse(`${entry.waitingSince} UTC`));
    }
  } else {
    ticket.waitingSince = new Date(entry.waitingSince);
  }

  ticket.sla = add(ticket.waitingSince, {
    hours: await ipcRenderer.invoke('config-get', 'sla')
  });

  return ticket as Ticket;
}

async function createTicketList(data: any): Promise<Ticket[]> {
  const tickets: Ticket[] = await Promise.all(data.map(
    async entry => createTicket(entry)
  ));

  return tickets;
}

async function createHuzzahMessage(): Promise<Huzzah> {
  const content = await elementReady<HTMLElement>(
    selectors.emptyFolderContent, {
      stopOnDomReady: false
    }
  );

  const huzzah: Partial<Huzzah> = {};

  if (!content) {
    console.error(
      'Could not find empty folder content',
      selectors.emptyFolderContent
    );

    return huzzah as Huzzah;
  }

  huzzah.title = content.querySelector<HTMLElement>('h2, h4')!.textContent;
  huzzah.body = content.querySelector<HTMLElement>('p')!.textContent;

  const link = content.querySelector<HTMLLinkElement>('p > a');

  if (link) {
    huzzah.url = link.href;
  }

  return huzzah as Huzzah;
}

function sendTicketList(): void {
  window.postMessage({type: 'send-tickets'}, '*');
}

ipcRenderer.on('send-ticket-list', sendTicketList);

window.addEventListener('load', async () => {
  const mailbox = document.querySelector<HTMLElement>('#mainCol');
  const offlineUI = document.querySelector<HTMLElement>('.offline-ui');

  if (mailbox) {
    const ticketListObserver = new MutationObserver(sendTicketList);

    ticketListObserver.observe(mailbox, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  if (offlineUI) {
    const offlineObserver = new MutationObserver(() => {
      if (offlineUI.classList.contains('offline-ui-down')) {
        ipcRenderer.send('is-offline');
      }
    });

    offlineObserver.observe(offlineUI, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
});

window.addEventListener('message', async ({data: {type, data}}) => {
  if (type === 'tickets') {
    ipcRenderer.send('tickets', await createTicketList(data));
  }

  if (type === 'huzzah') {
    ipcRenderer.send('huzzah', await createHuzzahMessage());
  }
});
