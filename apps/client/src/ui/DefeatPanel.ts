export interface DefeatPanelCallbacks {
  readonly onTryAgain: () => void;
  readonly onReturn: () => void;
}

function styleButton(button: HTMLButtonElement): void {
  button.style.minWidth = '180px';
  button.style.padding = '12px 18px';
  button.style.border = '1px solid rgba(255,255,255,0.28)';
  button.style.borderRadius = '10px';
  button.style.background = '#1f2937';
  button.style.color = '#f9fafb';
  button.style.font = '600 16px system-ui, sans-serif';
  button.style.cursor = 'pointer';
}

export class DefeatPanel {
  private readonly root: HTMLDivElement;
  private readonly tryAgainButton: HTMLButtonElement;
  private readonly returnButton: HTMLButtonElement;
  private readonly onTryAgain: () => void;
  private readonly onReturn: () => void;
  private destroyed = false;

  public constructor(
    parent: HTMLElement,
    callbacks: DefeatPanelCallbacks
  ) {
    const root = document.createElement('div');
    root.dataset.testid = 'defeat-panel';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Derrota');
    root.setAttribute('aria-hidden', 'true');

    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10000',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(3, 7, 18, 0.78)',
      fontFamily: 'system-ui, sans-serif'
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      width: 'min(420px, calc(100vw - 40px))',
      padding: '28px',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: '16px',
      background: '#111827',
      color: '#f9fafb',
      boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
      textAlign: 'center'
    });

    const title = document.createElement('h2');
    title.textContent = 'Derrota';
    Object.assign(title.style, {
      margin: '0 0 8px',
      fontSize: '30px'
    });

    const copy = document.createElement('p');
    copy.textContent = 'A sala será reconstruída a partir do último checkpoint.';
    Object.assign(copy.style, {
      margin: '0 0 22px',
      color: '#cbd5e1',
      lineHeight: '1.45'
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      gap: '10px',
      justifyContent: 'center',
      flexWrap: 'wrap'
    });

    const tryAgainButton = document.createElement('button');
    tryAgainButton.type = 'button';
    tryAgainButton.dataset.testid = 'defeat-try-again';
    tryAgainButton.textContent = 'Tentar novamente';
    styleButton(tryAgainButton);

    const returnButton = document.createElement('button');
    returnButton.type = 'button';
    returnButton.dataset.testid = 'defeat-return';
    returnButton.textContent = 'Retornar';
    styleButton(returnButton);

    tryAgainButton.addEventListener('click', callbacks.onTryAgain);
    returnButton.addEventListener('click', callbacks.onReturn);

    actions.append(tryAgainButton, returnButton);
    card.append(title, copy, actions);
    root.append(card);
    parent.append(root);

    this.root = root;
    this.tryAgainButton = tryAgainButton;
    this.returnButton = returnButton;
    this.onTryAgain = callbacks.onTryAgain;
    this.onReturn = callbacks.onReturn;
  }

  public show(): void {
    if (this.destroyed) {
      return;
    }

    this.root.style.display = 'flex';
    this.root.setAttribute('aria-hidden', 'false');
    this.tryAgainButton.focus();
  }

  public hide(): void {
    if (this.destroyed) {
      return;
    }

    this.root.style.display = 'none';
    this.root.setAttribute('aria-hidden', 'true');
  }

  public isVisible(): boolean {
    return !this.destroyed && this.root.style.display !== 'none';
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.tryAgainButton.removeEventListener('click', this.onTryAgain);
    this.returnButton.removeEventListener('click', this.onReturn);
    this.root.remove();
  }
}
