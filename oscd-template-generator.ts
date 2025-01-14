/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable no-loop-func */
/* eslint-disable no-nested-ternary */
import { LitElement, html, css } from 'lit';
import { state, query } from 'lit/decorators.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { newEditEvent } from '@openenergytools/open-scd-core';

import { insertSelectedLNodeType, nsdToJson } from '@openenergytools/scl-lib';

import { TreeGrid, TreeSelection } from '@openenergytools/tree-grid';

import { MdFab } from '@scopedelement/material-web/fab/MdFab.js';
import { MdIcon } from '@scopedelement/material-web/icon/MdIcon.js';
import { MdFilledSelect } from '@scopedelement/material-web/select/MdFilledSelect.js';
import { MdSelectOption } from '@scopedelement/material-web/select/MdSelectOption.js';

let lastLNodeType = 'LPHD';
let lastSelection = {};
let lastFilter = '';

const lnClass74 = [
  'ANCR',
  'ARCO',
  'ARIS',
  'ATCC',
  'AVCO',
  'CALH',
  'CCGR',
  'CILO',
  'CPOW',
  'CSWI',
  'CSYN',
  'FCNT',
  'FCSD',
  'FFIL',
  'FLIM',
  'FPID',
  'FRMP',
  'FSCC',
  'FSCH',
  'FSPT',
  'FXOT',
  'FXUT',
  'GAPC',
  'GGIO',
  'GLOG',
  'GSAL',
  'IARC',
  'IHMI',
  'ISAF',
  'ITCI',
  'ITMI',
  'ITPC',
  'KFAN',
  'KFIL',
  'KPMP',
  'KTNK',
  'KVLV',
  'LLN0',
  'LPHD',
  'LCCH',
  'LGOS',
  'LSVS',
  'LTIM',
  'LTMS',
  'LTRK',
  'MENV',
  'MFLK',
  'MFLW',
  'MHAI',
  'MHAN',
  'MHET',
  'MHYD',
  'MMDC',
  'MMET',
  'MMTN',
  'MMTR',
  'MMXN',
  'MMXU',
  'MSQI',
  'PDIF',
  'PDIR',
  'PDIS',
  'PDOP',
  'PDUP',
  'PFRC',
  'PHAR',
  'PHIZ',
  'PIOC',
  'PMRI',
  'PMSS',
  'POPF',
  'PPAM',
  'PRTR',
  'PSCH',
  'PSDE',
  'PSOF',
  'PTDV',
  'PTEF',
  'PTHF',
  'PTOC',
  'PTOF',
  'PTOV',
  'PTRC',
  'PTTR',
  'PTUC',
  'PTUF',
  'PTUV',
  'PUPF',
  'PVOC',
  'PVPH',
  'PZSU',
  'QFVR',
  'QITR',
  'QIUB',
  'QVTR',
  'QVUB',
  'QVVR',
  'RADR',
  'RBDR',
  'RBRF',
  'RDIR',
  'RDRE',
  'RDRS',
  'RFLO',
  'RMXU',
  'RPSB',
  'RREC',
  'RSYN',
  'SARC',
  'SCBR',
  'SIMG',
  'SIML',
  'SLTC',
  'SOPM',
  'SPDC',
  'SPRS',
  'SPTR',
  'SSWI',
  'STMP',
  'SVBR',
  'TANG',
  'TAXD',
  'TCTR',
  'TDST',
  'TFLW',
  'TFRQ',
  'TGSN',
  'THUM',
  'TLVL',
  'TMGF',
  'TMVM',
  'TPOS',
  'TPRS',
  'TRTN',
  'TSND',
  'TTMP',
  'TTNS',
  'TVBR',
  'TVTR',
  'TWPH',
  'XCBR',
  'XFUS',
  'XSWI',
  'YEFN',
  'YLTC',
  'YPSH',
  'YPTR',
  'ZAXN',
  'ZBAT',
  'ZBSH',
  'ZCAB',
  'ZCAP',
  'ZCON',
  'ZGEN',
  'ZGIL',
  'ZLIN',
  'ZMOT',
  'ZREA',
  'ZRES',
  'ZRRC',
  'ZSAR',
  'ZSCR',
  'ZSMC',
  'ZTCF',
  'ZTCR',
] as const;

export default class TemplateGenerator extends ScopedElementsMixin(LitElement) {
  static scopedElements = {
    'tree-grid': TreeGrid,
    'md-filled-select': MdFilledSelect,
    'md-select-option': MdSelectOption,
    'md-fab': MdFab,
    'md-icon': MdIcon,
  };

  @state()
  doc?: XMLDocument;

  @query('tree-grid')
  treeUI!: TreeGrid;

  @state()
  get selection(): TreeSelection {
    if (!this.treeUI) return {};
    return this.treeUI.selection;
  }

  set selection(selection: TreeSelection) {
    this.treeUI.selection = selection;
  }

  @state()
  get filter(): string {
    if (!this.treeUI) return '';
    return this.treeUI.filter ?? '';
  }

  set filter(filter: string) {
    this.treeUI.filter = filter;
  }

  @query('md-filled-select')
  lNodeTypeUI?: MdFilledSelect;

  @state()
  get lNodeType(): string {
    return this.lNodeTypeUI?.value || lastLNodeType;
  }

  set lNodeType(lNodeType: string) {
    if (!this.lNodeTypeUI) return;
    this.lNodeTypeUI.value = lNodeType;
    if (!this.lNodeTypeUI.value) this.lNodeTypeUI.value = lastLNodeType;
  }

  @state()
  addedLNode = '';

  disconnectedCallback() {
    super.disconnectedCallback();
    lastSelection = this.selection;
    lastFilter = this.filter;
    lastLNodeType = this.lNodeType;
  }

  async firstUpdated() {
    await this.treeUI.updateComplete;
    await this.lNodeTypeUI!.updateComplete;
    this.treeUI.tree = nsdToJson(lastLNodeType) as any;
    this.lNodeType = lastLNodeType;
    this.filter = lastFilter;
    await this.treeUI.updateComplete;
    this.selection = lastSelection;
  }

  saveTemplates() {
    if (!this.doc) return;

    const inserts = insertSelectedLNodeType(
      this.doc,
      this.treeUI.selection,
      this.lNodeType
    );

    this.dispatchEvent(newEditEvent(inserts));

    const newLNodeType = inserts.find(
      insert => (insert.node as Element).tagName === 'LNodeType'
    )?.node as Element;

    if (newLNodeType) this.addedLNode = newLNodeType.getAttribute('id') ?? '';
  }

  reset() {
    this.addedLNode = '';
    this.treeUI.tree = nsdToJson(this.lNodeType) as any;
    this.selection = {};
    this.filter = '';
    this.requestUpdate();
    this.treeUI.requestUpdate();
  }

  render() {
    return html`<div class="container">
        <md-filled-select @input=${() => this.reset()}>
          ${Array.from(lnClass74).map(
            lNodeType =>
              html`<md-select-option value=${lNodeType}
                >${lNodeType}</md-select-option
              >`
          )}
        </md-filled-select>
        <tree-grid></tree-grid>
      </div>
      ${this.doc
        ? html`<md-fab
            label="${this.addedLNode || 'Add Type'}"
            @click=${() => this.saveTemplates()}
          >
            <md-icon slot="icon">${this.addedLNode ? 'done' : 'add'}</md-icon>
          </md-fab>`
        : html``}`;
  }

  static styles = css`
    * {
      --md-sys-color-primary: var(--oscd-primary);
      --md-sys-color-secondary: var(--oscd-secondary);
      --md-sys-typescale-body-large-font: var(--oscd-theme-text-font);
      --md-outlined-text-field-input-text-color: var(--oscd-base01);

      --md-sys-color-surface: var(--oscd-base3);
      --md-sys-color-on-surface: var(--oscd-base00);
      --md-sys-color-on-primary: var(--oscd-base2);
      --md-sys-color-on-surface-variant: var(--oscd-base00);
      --md-menu-container-color: var(--oscd-base3);
      font-family: var(--oscd-theme-text-font);
      --md-sys-color-surface-container-highest: var(--oscd-base2);
      --md-list-item-activated-background: rgb(
        from var(--oscd-primary) r g b / 0.38
      );
      --md-menu-item-selected-container-color: rgb(
        from var(--oscd-primary) r g b / 0.38
      );
      --md-list-container-color: var(--oscd-base2);
      --md-fab-container-color: var(--oscd-secondary);
    }

    .container {
      margin: 12px;
    }

    md-fab {
      position: fixed;
      bottom: 32px;
      right: 32px;
    }

    md-filled-select {
      position: absolute;
      left: 300px;
    }
  `;
}
