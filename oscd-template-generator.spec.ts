import { fixture, expect, html } from '@open-wc/testing';
import { restore, SinonSpy, spy } from 'sinon';

import TemplateGenerator from './oscd-template-generator.js';

customElements.define('template-generator', TemplateGenerator);

export const sclDocString = `<?xml version="1.0" encoding="UTF-8"?>
<SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL">
  <DataTypeTemplates></DataTypeTemplates>
</SCL>`;

describe('TemplateGenerator', () => {
  let element: TemplateGenerator;
  beforeEach(async () => {
    element = await fixture(html`<template-generator></template-generator>`);
  });

  it('displays no action button', () =>
    expect(element.shadowRoot?.querySelector('md-fab')).to.not.exist);

  it('starts with LPHD selected', () => {
    expect(element).to.have.property('lNodeType', 'LPHD');
    expect(element).shadowDom.to.equalSnapshot();
  });

  describe('given a loaded document', () => {
    let listener: SinonSpy;
    afterEach(restore);
    beforeEach(async () => {
      listener = spy();
      element.addEventListener('oscd-edit-v2', listener);
      element.doc = new DOMParser().parseFromString(
        sclDocString,
        'application/xml'
      );
      await element.updateComplete;
    });

    it('displays an action button', () =>
      expect(element.shadowRoot?.querySelector('md-fab')).to.exist);

    it('adds Templates on action button click', () => {
      (element.shadowRoot?.querySelector('md-fab') as HTMLElement).click();

      /* expect five calls for
         - LPHD and its mandatory DOTypes
           - PhyHealth and its mandatory EnumType
             - stVal
           - PhyNam
           - Proxy
       */
      expect(listener).property('args').to.have.lengthOf(5);
      listener.args.forEach(args => {
        const { edit } = args[0].detail;
        expect(edit).to.have.property(
          'parent',
          element.doc?.querySelector('DataTypeTemplates')
        );
        expect(edit).to.have.property('node');
      });
    });

    it('adds missing DataTypeTemplates section on action button click', () => {
      element.doc?.querySelector('DataTypeTemplates')?.remove();
      (element.shadowRoot?.querySelector('md-fab') as HTMLElement).click();

      // expect one more call for the DTT section
      expect(listener).property('args').to.have.lengthOf(6);
      expect(listener.args[0][0])
        .property('detail')
        .property('edit')
        .to.have.property('parent', element.doc?.documentElement);
      expect(listener.args[0][0])
        .property('detail')
        .property('edit')
        .property('node')
        .to.have.property('tagName', 'DataTypeTemplates');
    });

    it('adds LNodeTypes, DOTypes, DATypes, and EnumTypes as requested', async () => {
      element.lNodeType = 'LLN0';
      element.reset();
      await element.lNodeTypeUI?.updateComplete;
      await element.updateComplete;

      async function selectAll(column: number) {
        const item = element.treeUI.shadowRoot?.querySelector(
          `md-list:nth-of-type(${column + 1}) > md-list-item:first-of-type`
        ) as HTMLElement;
        item?.click();
        await element.treeUI.updateComplete;
        await element.updateComplete;
      }

      await selectAll(1);
      await selectAll(2);
      await selectAll(3);
      await selectAll(4);
      await selectAll(5);

      (element.shadowRoot?.querySelector('md-fab') as HTMLElement).click();

      /* expect 30 calls for
        LNodeType LLN0
        DOType    Beh
                  Diag
                  GrRef
                  Health
                  InRef
                  LEDRs
                  Loc
                  LocKey
                  LocSta
                  MltLev
                  Mod
                  NamPlt
                  SwModKey
        DAType    origin
                  pulseConfig
                  SBOw
                  Oper
                  Cancel
                  SBOw
                  Oper
                  Cancel
        EnumType  stVal
                  subVal
                  orCat
                  cmdQual
                  ctlModel
                  sboClass
                  stVal
                  subVal
       */
      expect(listener).property('args').to.have.lengthOf(30);
      const elms = listener.args.map(args => args[0].detail.edit.node);
      expect(elms.filter(e => e.tagName === 'LNodeType')).to.have.lengthOf(1);
      expect(elms.filter(e => e.tagName === 'DOType')).to.have.lengthOf(13);
      expect(elms.filter(e => e.tagName === 'DAType')).to.have.lengthOf(8);
      expect(elms.filter(e => e.tagName === 'EnumType')).to.have.lengthOf(8);
    }).timeout(10000); // selecting 550 paths for a full LLN0 is rather slow.
  });
});
