/* eslint-disable @typescript-eslint/no-unused-vars */
import { cyrb64 } from './cyrb64.js';
function describeEnumType(element) {
    var _a, _b;
    const vals = {};
    for (const val of Array.from(element.children)
        .filter(child => child.tagName === 'EnumVal')
        .sort((v1, v2) => {
        var _a, _b;
        return parseInt((_a = v1.getAttribute('ord')) !== null && _a !== void 0 ? _a : '', 10) -
            parseInt((_b = v2.getAttribute('ord')) !== null && _b !== void 0 ? _b : '', 10);
    }))
        vals[(_a = val.getAttribute('ord')) !== null && _a !== void 0 ? _a : ''] = (_b = val.textContent) !== null && _b !== void 0 ? _b : '';
    return { vals };
}
function describeDAType(element) {
    var _a;
    const bdas = {};
    for (const bda of Array.from(element.children)
        .filter(child => child.tagName === 'BDA')
        .sort((c1, c2) => c1.outerHTML.localeCompare(c2.outerHTML))) {
        const [bType, type, dchg, dupd, qchg] = [
            'bType',
            'type',
            'dchg',
            'dupd',
            'qchg',
        ].map(attr => bda.getAttribute(attr));
        bdas[(_a = bda.getAttribute('name')) !== null && _a !== void 0 ? _a : ''] = { bType, type, dchg, dupd, qchg };
    }
    return { bdas };
}
function describeDOType(element) {
    const sdos = {};
    for (const sdo of Array.from(element.children)
        .filter(child => child.tagName === 'SDO')
        .sort((c1, c2) => c1.outerHTML.localeCompare(c2.outerHTML))) {
        const [name, type, transient] = ['name', 'type', 'transient'].map(attr => sdo.getAttribute(attr));
        sdos[name !== null && name !== void 0 ? name : ''] = { type, transient };
    }
    const das = {};
    for (const da of Array.from(element.children)
        .filter(child => child.tagName === 'DA')
        .sort((c1, c2) => c1.outerHTML.localeCompare(c2.outerHTML))) {
        const [name, fc, bType, type, dchg, dupd, qchg] = [
            'name',
            'fc',
            'bType',
            'type',
            'dchg',
            'dupd',
            'qchg',
        ].map(attr => da.getAttribute(attr));
        das[name !== null && name !== void 0 ? name : ''] = {
            fc,
            bType,
            type,
            dchg,
            dupd,
            qchg,
        };
    }
    return {
        sdos,
        das,
        cdc: element.getAttribute('cdc'),
    };
}
function describeLNodeType(element) {
    const dos = {};
    for (const doElement of Array.from(element.children)
        .filter(child => child.tagName === 'DO')
        .sort((c1, c2) => c1.outerHTML.localeCompare(c2.outerHTML))) {
        const [name, type, transient] = ['name', 'type', 'transient'].map(attr => doElement.getAttribute(attr));
        dos[name !== null && name !== void 0 ? name : ''] = { type, transient };
    }
    return {
        dos,
        lnClass: element.getAttribute('lnClass'),
    };
}
const typeDescriptions = {
    EnumType: describeEnumType,
    DAType: describeDAType,
    DOType: describeDOType,
    LNodeType: describeLNodeType,
};
function describeElement(element) {
    var _a, _b;
    return ((_b = (_a = typeDescriptions[element.tagName]) === null || _a === void 0 ? void 0 : _a.call(typeDescriptions, element)) !== null && _b !== void 0 ? _b : { xml: element.outerHTML });
}
function hashElement(element) {
    return cyrb64(JSON.stringify(describeElement(element)));
}
export function generateTemplates(selection, doc, data) {
    const types = new Set();
    const enumTypes = new Set();
    const daTypes = new Set();
    const doTypes = new Set();
    const lnTypes = new Set();
    /** @returns a new [[`tag`]] element owned by [[`doc`]]. */
    function createElement(tag, attrs = {}) {
        const element = doc.createElementNS(doc.documentElement.namespaceURI, tag);
        Object.entries(attrs)
            .filter(([_, value]) => value !== null && value !== undefined)
            .forEach(([name, value]) => element.setAttribute(name, value));
        return element;
    }
    function addEnumType(path, sel) {
        let d = data;
        for (const slug of path)
            d = d[slug].children;
        const vals = [];
        for (const content of Object.keys(sel)) {
            const ord = d[content].literalVal;
            const val = createElement('EnumVal', { ord });
            val.textContent = content;
            vals.push(val);
        }
        vals.sort((v1, v2) => {
            var _a, _b;
            return parseInt((_a = v1.getAttribute('ord')) !== null && _a !== void 0 ? _a : '', 10) -
                parseInt((_b = v2.getAttribute('ord')) !== null && _b !== void 0 ? _b : '', 10);
        });
        const enumType = createElement('EnumType');
        vals.forEach(val => enumType.append(val));
        const hash = hashElement(enumType);
        const id = `${path[path.length - 1]}$${hash}`;
        enumType.setAttribute('id', id);
        if (!types.has(id)) {
            types.add(id);
            enumTypes.add(enumType);
        }
        return id;
    }
    function addDAType(path, sel, stValSel = {}) {
        var _a;
        let d = data;
        for (const slug of path.slice(0, -1))
            d = d[slug].children;
        const { children, tagName, underlyingTypeKind, underlyingType, typeKind, dchg, dupd, qchg, type: bType, fc, } = d[path[path.length - 1]];
        if (typeKind !== 'CONSTRUCTED')
            throw new Error(`DAType typeKind is not CONSTRUCTED, but ${typeKind}`);
        const daType = createElement('DAType');
        for (const [name, dep] of Object.entries(children)) {
            // eslint-disable-next-line no-continue
            if (!sel[name])
                continue;
            const bda = createElement('BDA', { name, dchg, dupd, qchg });
            if (dep.typeKind === 'BASIC' || !dep.typeKind) {
                bda.setAttribute('bType', (_a = dep.type) !== null && _a !== void 0 ? _a : '');
            }
            if (dep.typeKind === 'ENUMERATED') {
                const enumHash = addEnumType(path.concat([name]), sel[name]);
                bda.setAttribute('bType', 'Enum');
                bda.setAttribute('type', enumHash);
            }
            if (dep.typeKind === 'undefined') {
                if (underlyingTypeKind === 'BASIC')
                    bda.setAttribute('bType', underlyingType);
                else if (underlyingTypeKind === 'ENUMERATED') {
                    const { stVal } = d;
                    const enumHash = addEnumType(path.slice(0, -1).concat(['stVal']), stValSel);
                    bda.setAttribute('bType', 'Enum');
                    bda.setAttribute('type', enumHash);
                }
                else
                    throw new Error(`Unexpected underlyingTypeKind ${underlyingTypeKind}`);
            }
            if (dep.typeKind === 'CONSTRUCTED') {
                const daHash = addDAType(path.concat([name]), sel[name]);
                bda.setAttribute('bType', 'Struct');
                bda.setAttribute('type', daHash);
            }
            daType.append(bda);
        }
        const hash = hashElement(daType);
        const id = `${path[path.length - 1]}$${hash}`;
        daType.setAttribute('id', id);
        if (!types.has(id)) {
            types.add(id);
            daTypes.add(daType);
        }
        return id;
    }
    function addDOType(path, sel) {
        var _a;
        if (!sel)
            throw new Error(`adding DO type for empty selection at ${JSON.stringify(path, null, 2)}`);
        let d = data;
        for (const slug of path.slice(0, -1))
            d = d[slug].children;
        const dO = d[path[path.length - 1]];
        const doType = createElement('DOType', { cdc: dO.type });
        const deps = Object.entries(dO.children);
        for (const [name, dep] of deps) {
            // eslint-disable-next-line no-continue
            if (!sel[name])
                continue;
            if (dep.tagName === 'SubDataObject') {
                const { transient } = dep;
                const type = addDOType(path.concat([name]), sel[name]);
                const sdo = createElement('SDO', { name, transient, type });
                doType.prepend(sdo);
            }
            else {
                const { fc, dchg, dupd, qchg } = dep;
                const da = createElement('DA', { name, fc, dchg, dupd, qchg });
                if (dep.typeKind === 'BASIC' || !dep.typeKind) {
                    da.setAttribute('bType', (_a = dep.type) !== null && _a !== void 0 ? _a : '');
                }
                if (dep.typeKind === 'ENUMERATED') {
                    const enumHash = addEnumType(path.concat([name]), sel[name]);
                    da.setAttribute('bType', 'Enum');
                    da.setAttribute('type', enumHash);
                }
                if (dep.typeKind === 'CONSTRUCTED') {
                    const daHash = addDAType(path.concat([name]), sel[name], sel.stVal);
                    da.setAttribute('bType', 'Struct');
                    da.setAttribute('type', daHash);
                }
                doType.append(da);
            }
        }
        const hash = hashElement(doType);
        const id = `${path[path.length - 1]}$${hash}`;
        doType.setAttribute('id', id);
        if (!types.has(id)) {
            types.add(id);
            doTypes.add(doType);
        }
        return id;
    }
    function addLNodeType(path, sel) {
        const [lnClass] = path;
        const ln = data[lnClass];
        const lnType = createElement('LNodeType', { lnClass });
        Object.keys(sel).forEach(name => {
            const type = addDOType(path.concat([name]), sel[name]);
            const { transient } = ln.children[name];
            const doElement = createElement('DO', { name, type, transient });
            lnType.append(doElement);
        });
        const hash = hashElement(lnType);
        const id = `${lnClass}$${hash}`;
        lnType.setAttribute('id', id);
        if (!types.has(id)) {
            types.add(id);
            lnTypes.add(lnType);
        }
        return id;
    }
    Object.entries(selection).forEach(([name, sel]) => addLNodeType([name], sel));
    return { enumTypes, daTypes, doTypes, lnTypes };
}
//# sourceMappingURL=generate-templates.js.map