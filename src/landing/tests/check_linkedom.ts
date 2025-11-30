import { parseHTML } from 'npm:linkedom';

const { window } = parseHTML('<!DOCTYPE html><html><body></body></html>');

console.log('HTMLTableSectionElement in window:', 'HTMLTableSectionElement' in window);
console.log('HTMLTableSectionElement value:', (window as any).HTMLTableSectionElement);
