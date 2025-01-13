/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable no-loop-func */
/* eslint-disable no-nested-ternary */
import { LitElement, html, css } from 'lit';
import { state, query } from 'lit/decorators.js';
import { until } from 'lit/directives/until.js';

import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

import { newEditEvent } from '@openenergytools/open-scd-core';

import { TreeGrid, TreeSelection } from '@openenergytools/tree-grid';

import { MdFab } from '@scopedelement/material-web/fab/MdFab.js';
import { MdIcon } from '@scopedelement/material-web/icon/MdIcon.js';
import { MdFilledSelect } from '@scopedelement/material-web/select/MdFilledSelect.js';
import { MdSelectOption } from '@scopedelement/material-web/select/MdSelectOption.js';

import { generateTemplates } from './generate-templates.js';

// open-scd editor action for backwards compatibility
function newCreateEvent(parent: Node, element: Node, reference?: Node | null) {
  return new CustomEvent('editor-action', {
    bubbles: true,
    composed: true,
    detail: { action: { new: { parent, element, reference } } },
  });
}

const tree = await fetch(new URL('./tree.json', import.meta.url)).then(res =>
  res.json()
);

let lastLNodeType = 'LPHD';
let lastSelection = {};
let lastFilter = '';

const dataTypeTemplates = new DOMParser()
  .parseFromString(
    `<SCL xmlns="http://www.iec.ch/61850/2003/SCL">
            <DataTypeTemplates></DataTypeTemplates>
          </SCL>`,
    'application/xml'
  )
  .querySelector('DataTypeTemplates')!;

const tags = ['LNodeType', 'DOType', 'DAType', 'EnumType'] as const;
type Tag = (typeof tags)[number];

function getDTTReference(parent: Element, tag: Tag) {
  const children = Array.from(parent.children);

  let index = tags.findIndex(element => element === tag);

  let nextSibling;
  while (index < tags.length && !nextSibling) {
    nextSibling = children.find(child => child.tagName === tags[index]);
    index++;
  }

  return nextSibling ?? null;
}

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
    this.treeUI.tree = tree[lastLNodeType].children;
    this.lNodeType = lastLNodeType;
    this.filter = lastFilter;
    await this.treeUI.updateComplete;
    this.selection = lastSelection;
  }

  saveTemplates() {
    if (!this.doc) return;

    const templates =
      this.doc.querySelector(':root > DataTypeTemplates') ||
      (dataTypeTemplates.cloneNode() as Element);

    if (templates.ownerDocument !== this.doc) {
      this.dispatchEvent(
        newEditEvent({
          parent: this.doc.documentElement,
          node: templates,
          reference: null,
        })
      );
      // this.dispatchEvent(newCreateEvent(this.doc.documentElement, templates));
    }

    // delete this.treeUI.selection['']; // workaround for UI bug
    const { EnumType, DAType, DOType, LNodeType } = generateTemplates(
      this.treeUI.selection,
      templates.ownerDocument!,
      this.treeUI.tree,
      this.lNodeType
    );

    [...LNodeType, ...DOType, ...DAType, ...EnumType].forEach(element => {
      if (!this.doc?.querySelector(`${element.tagName}[id="${element.id}"]`)) {
        const reference = getDTTReference(templates, element.tagName as Tag);
        this.dispatchEvent(
          newEditEvent({ parent: templates, node: element, reference })
        );
        // this.dispatchEvent(newCreateEvent(templates, element, reference));
      }
    });

    if (LNodeType.length) this.addedLNode = LNodeType[0].id ?? '';
  }

  reset() {
    this.addedLNode = '';
    this.treeUI.tree = tree[this.lNodeType].children;
    this.selection = {};
    this.filter = '';
    this.requestUpdate();
    this.treeUI.requestUpdate();
  }

  render() {
    return html`<div class="container">
        <md-filled-select @input=${() => this.reset()}>
          ${Object.keys(tree).map(
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
